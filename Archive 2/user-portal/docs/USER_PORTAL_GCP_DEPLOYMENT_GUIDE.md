# GCP Production Deployment Guide: Gemini AI Hub — User Portal

This deployment guide walks through deploying the standalone **Gemini AI Hub — User Portal** (`user-portal/frontend/` + `user-portal/backend/` + `geapphub_user` PostgreSQL database) to Google Cloud Platform using **Google Artifact Registry**, **Cloud Build**, **Google Cloud Secret Manager**, and **Terraform**.

> **End-to-End Pipeline with Google Artifact Registry, OAuth Secret & SSL Certificate ID**: Container images are built and pushed directly to **Google Artifact Registry** (`${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/${AR_REPO}`). OAuth credentials (`client_id` + `client_secret`) are stored in **Google Cloud Secret Manager** (`ge-oauth-credentials`), and the Regional Internal HTTPS Application Load Balancer attaches your pre-created **Compute SSL Certificate ID** (`SSL_CERTIFICATE_ID`).

---

## 1. Directory Structure (`user-portal/`)

```text
user-portal/
├── Dockerfile                              # Multi-stage container build (frontend/ + backend/)
├── cloudbuild.yaml                         # 4-stage Cloud Build CI/CD pipeline for Artifact Registry
├── frontend/                               # React 18 + TypeScript + Vite User Portal SPA
├── backend/                                # FastAPI User Portal Backend (Port 8080, geapphub_user DB)
├── deploy/
│   ├── config.env.example                  # GCP, Artifact Registry, OAuth Secret & SSL Cert ID template
│   ├── deploy_user_portal_gcp.sh           # 4-stage automated pipeline orchestrator script
│   └── terraform/                          # Terraform stack (VPC, PSA, Cloud SQL HA, Secrets, Run, HTTPS ILB)
│       ├── versions.tf                     # google and google-beta providers
│       ├── variables.tf                    # Parameterized inputs (oauth_secret_name, ssl_certificate_id)
│       ├── main.tf                         # APIs, VPC, AR, Cloud SQL HA, Secret Manager, Run, HTTPS ILB
│       └── outputs.tf                      # Artifact Registry URI, ILB VIP, SSL Cert ID, Cloud Run URL
└── docs/
    ├── USER_PORTAL_GCP_DEPLOYMENT_GUIDE.md # This deployment guide
    └── user-portal-gcp-deployment-design.md # Architecture & security specification
```

---

## 2. Manual Prerequisites (Clone Repository, Create OAuth Secret & Create SSL Certificate)

### Step 1: Clone the GitHub Repository
Clone the repository to your workstation or Cloud Shell:

```bash
git clone https://github.com/<YOUR_GITHUB_ORG_OR_USER>/<YOUR_GITHUB_REPO>.git
cd <YOUR_GITHUB_REPO>
```

### Step 2: Manually Create Google OAuth 2.0 Web Client Credentials
1. Open **Google Cloud Console -> APIs & Services -> OAuth consent screen** (`https://console.cloud.google.com/apis/credentials/consent?project=<YOUR_GCP_PROJECT_ID>`):
   - Select **Internal** user type (for Google Workspace / Cloud Identity enterprise users) and click **Create**.
   - Enter the **App name** (e.g., `Gemini AI Hub — User Portal`), **User support email**, and **Developer contact information**, then click **Save and Continue**.
2. Open **Google Cloud Console -> APIs & Services -> Credentials** (`https://console.cloud.google.com/apis/credentials?project=<YOUR_GCP_PROJECT_ID>`).
3. Click **+ Create Credentials -> OAuth client ID**:
   - **Application type**: `Web application`
   - **Name**: `ge-user-portal-web-client`
   - **Authorized JavaScript origins**:
     - `https://<YOUR_INTERNAL_DOMAIN_NAME>` (e.g., `https://aihub.internal.corp`)
   - **Authorized redirect URIs**:
     - `https://<YOUR_INTERNAL_DOMAIN_NAME>/api/v1/auth/google/callback` (e.g., `https://aihub.internal.corp/api/v1/auth/google/callback`)
4. Click **Create** and either click **Download JSON** (`client_secret_*.json`) or copy the **Client ID** (`*.apps.googleusercontent.com`) and **Client Secret** (`GOCSPX-*`).

### Step 3: Store OAuth Credentials (`ge-oauth-credentials`) in Google Cloud Secret Manager
Store both the OAuth 2.0 Client ID and Client Secret in a single JSON secret (`ge-oauth-credentials`) in **Google Cloud Secret Manager**:

#### Option 3A: Store `ge-oauth-credentials` via `gcloud` CLI
```bash
export GCP_PROJECT_ID="<YOUR_GCP_PROJECT_ID>"
gcloud services enable secretmanager.googleapis.com --project="${GCP_PROJECT_ID}"

gcloud secrets describe ge-oauth-credentials --project="${GCP_PROJECT_ID}" >/dev/null 2>&1 || \
  gcloud secrets create ge-oauth-credentials --replication-policy="automatic" --project="${GCP_PROJECT_ID}"

printf '{"client_id":"%s","client_secret":"%s"}' \
  "<YOUR_OAUTH_CLIENT_ID>.apps.googleusercontent.com" \
  "<YOUR_OAUTH_CLIENT_SECRET>" | \
  gcloud secrets versions add ge-oauth-credentials --data-file=- --project="${GCP_PROJECT_ID}"
```

#### Option 3B: Store `ge-oauth-credentials` via Google Cloud Console UI
1. Open **Google Cloud Console -> Security -> Secret Manager** (`https://console.cloud.google.com/security/secret-manager?project=<YOUR_GCP_PROJECT_ID>`).
2. Click **+ Create Secret**:
   - **Name**: `ge-oauth-credentials`
   - **Secret value**: Upload the downloaded OAuth `client_secret_*.json` file (or paste `{"client_id":"<CLIENT_ID>","client_secret":"<CLIENT_SECRET>"}`) -> Click **Create Secret**.

### Step 4: Create the Regional Compute SSL Certificate (`SSL_CERTIFICATE_ID`)
Create a regional SSL certificate in `${GCP_REGION}` for your internal DNS name and note its `SSL_CERTIFICATE_ID`:

```bash
export GCP_PROJECT_ID="<YOUR_GCP_PROJECT_ID>"
export GCP_REGION="us-central1"
export INTERNAL_DOMAIN_NAME="aihub.internal.corp"

# (Optional) Generate certificate & private key if you do not already have portal.crt and portal.key
openssl req -x509 -nodes -newkey rsa:2048 -days 365 \
  -keyout portal.key \
  -out portal.crt \
  -subj "/CN=${INTERNAL_DOMAIN_NAME}" \
  -addext "subjectAltName=DNS:${INTERNAL_DOMAIN_NAME}"

# Create the regional SSL certificate in Google Cloud
gcloud compute ssl-certificates create cert-ge-user-portal-internal \
  --certificate=portal.crt \
  --private-key=portal.key \
  --region="${GCP_REGION}" \
  --project="${GCP_PROJECT_ID}"

export SSL_CERTIFICATE_ID="projects/${GCP_PROJECT_ID}/regions/${GCP_REGION}/sslCertificates/cert-ge-user-portal-internal"
```

### Step 5: Configure `user-portal/deploy/config.env`
Copy [`user-portal/deploy/config.env.example`](../deploy/config.env.example) to `user-portal/deploy/config.env`:

```bash
cp user-portal/deploy/config.env.example user-portal/deploy/config.env
```

Edit `user-portal/deploy/config.env`:
```bash
# 1. Target Google Cloud Project, Organization ID, Region, Existing VPC & Subnet (Required)
export GCP_PROJECT_ID="<YOUR_GCP_PROJECT_ID>"
export GCP_ORG_ID="<YOUR_GCP_ORGANIZATION_ID>"
export GCP_REGION="us-central1"
export VPC_NAME="<YOUR_EXISTING_VPC_NAME>"
export SUBNET_NAME="<YOUR_EXISTING_SUBNET_NAME>"

# 2. Google Artifact Registry Source (GENERIC) & Image (DOCKER) Settings
export AR_SOURCE_REPO="ge-user-portal-source"
export SOURCE_PACKAGE="user-portal-source"
export SOURCE_VERSION="v1"
export AR_REPO="ge-user-portal-repo"
export IMAGE_NAME="ge-user-portal"
export IMAGE_TAG="latest"

# 3. Cloud Secret Manager Secret ID (OAuth JSON) & Regional SSL Certificate ID
export OAUTH_SECRET="ge-oauth-credentials"
export SSL_CERTIFICATE_ID="projects/${GCP_PROJECT_ID}/regions/${GCP_REGION}/sslCertificates/cert-ge-user-portal-internal"

# 4. Internal Domain Name
export INTERNAL_DOMAIN_NAME="aihub.internal.corp"
```

### Step 6: Authenticate `gcloud` and Application Default Credentials (ADC)
```bash
source user-portal/deploy/config.env
gcloud auth login
gcloud auth application-default login
gcloud config set project "${GCP_PROJECT_ID}"
```

---

## 3. Option A: 1-Command End-to-End Pipeline (`deploy_user_portal_gcp.sh`)

Run [`user-portal/deploy/deploy_user_portal_gcp.sh`](../deploy/deploy_user_portal_gcp.sh) from the repository root. It executes the 4-stage deployment pipeline:
1. **Stage 1**: Enables APIs, creates the **Google Artifact Registry** `GENERIC` source repository (`ge-user-portal-source`) and `DOCKER` image repository (`ge-user-portal-repo`), and grants Cloud Build IAM permissions.
2. **Stage 2**: Ensures `ge-oauth-credentials` exists and has an active version in **Cloud Secret Manager**.
3. **Stage 3**: Packages `user-portal/` and uploads it to the **Google Artifact Registry** `GENERIC` repository (`gcloud artifacts generic upload`), then runs the **Cloud Build** pipeline ([`user-portal/cloudbuild.yaml`](../cloudbuild.yaml)) with `--no-source` (which downloads the source from Artifact Registry, verifies `ge-oauth-credentials` from Cloud Secret Manager, builds `user-portal/Dockerfile`, and pushes the image to the Artifact Registry `DOCKER` repository).
4. **Stage 4**: Runs **Terraform** (`user-portal/deploy/terraform/`), attaching `${SSL_CERTIFICATE_ID}` to the Regional Internal HTTPS Load Balancer (`proxy-ge-user-portal-internal-https`) and mounting `ge-oauth-credentials` (`GOOGLE_OAUTH_CREDENTIALS`) from Cloud Secret Manager into Cloud Run (`ge-user-portal-web`).

```bash
chmod +x user-portal/deploy/deploy_user_portal_gcp.sh
./user-portal/deploy/deploy_user_portal_gcp.sh
```

---

## 4. Option B: Step-by-Step Artifact Registry Source Upload, Cloud Build (`--no-source`) & Terraform Apply

```bash
source user-portal/deploy/config.env
export GCP_REGION="${GCP_REGION:-us-central1}"
export AR_SOURCE_REPO="${AR_SOURCE_REPO:-ge-user-portal-source}"
export SOURCE_PACKAGE="${SOURCE_PACKAGE:-user-portal-source}"
export SOURCE_VERSION="${SOURCE_VERSION:-v1}"
export AR_REPO="${AR_REPO:-ge-user-portal-repo}"
export IMAGE_NAME="${IMAGE_NAME:-ge-user-portal}"
export IMAGE_TAG="${IMAGE_TAG:-latest}"
export IMAGE_URI="${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/${AR_REPO}/${IMAGE_NAME}:${IMAGE_TAG}"

# 1. Enable APIs & create the Google Artifact Registry repositories (GENERIC for source + DOCKER for images)
gcloud services enable cloudbuild.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com \
  --project="${GCP_PROJECT_ID}"

gcloud artifacts repositories describe "${AR_SOURCE_REPO}" --location="${GCP_REGION}" --project="${GCP_PROJECT_ID}" >/dev/null 2>&1 || \
  gcloud artifacts repositories create "${AR_SOURCE_REPO}" \
    --repository-format=generic \
    --location="${GCP_REGION}" \
    --description="Google Artifact Registry Generic repository for Gemini AI Hub User Portal source code" \
    --project="${GCP_PROJECT_ID}"

gcloud artifacts repositories describe "${AR_REPO}" --location="${GCP_REGION}" --project="${GCP_PROJECT_ID}" >/dev/null 2>&1 || \
  gcloud artifacts repositories create "${AR_REPO}" \
    --repository-format=docker \
    --location="${GCP_REGION}" \
    --description="Google Artifact Registry Docker repository for Gemini AI Hub User Portal" \
    --project="${GCP_PROJECT_ID}"

# Grant Cloud Build Service Account permission to read source from Artifact Registry and push Docker images
PROJECT_NUMBER="$(gcloud projects describe "${GCP_PROJECT_ID}" --format="value(projectNumber)")"
for ROLE in roles/artifactregistry.reader roles/artifactregistry.writer roles/secretmanager.secretAccessor roles/logging.logWriter; do
  gcloud projects add-iam-policy-binding "${GCP_PROJECT_ID}" \
    --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
    --role="${ROLE}" --condition=None --quiet >/dev/null
done

# 2. Package User Portal source code & upload directly to Google Artifact Registry (GENERIC repository)
tar -czf /tmp/user-portal-source.tgz \
  --exclude="node_modules" \
  --exclude="__pycache__" \
  --exclude=".pytest_cache" \
  --exclude=".terraform" \
  -C user-portal .

gcloud artifacts versions delete "${SOURCE_VERSION}" \
  --package="${SOURCE_PACKAGE}" \
  --repository="${AR_SOURCE_REPO}" \
  --location="${GCP_REGION}" \
  --project="${GCP_PROJECT_ID}" --quiet >/dev/null 2>&1 || true

gcloud artifacts generic upload \
  --location="${GCP_REGION}" \
  --project="${GCP_PROJECT_ID}" \
  --repository="${AR_SOURCE_REPO}" \
  --package="${SOURCE_PACKAGE}" \
  --version="${SOURCE_VERSION}" \
  --source=/tmp/user-portal-source.tgz

# 3. Submit Cloud Build pipeline with --no-source (fetches source from Artifact Registry instead of GCS)
gcloud builds submit --no-source \
  --config=user-portal/cloudbuild.yaml \
  --substitutions="_REGION=${GCP_REGION},_AR_SOURCE_REPO=${AR_SOURCE_REPO},_SOURCE_PACKAGE=${SOURCE_PACKAGE},_SOURCE_VERSION=${SOURCE_VERSION},_AR_REPO=${AR_REPO},_IMAGE_NAME=${IMAGE_NAME},_TAG=${IMAGE_TAG},_OAUTH_SECRET=${OAUTH_SECRET:-ge-oauth-credentials},_SSL_CERTIFICATE_ID=${SSL_CERTIFICATE_ID}" \
  --project="${GCP_PROJECT_ID}"

# 4. Apply the Terraform stack (uses existing VPC_NAME & SUBNET_NAME, attaches SSL_CERTIFICATE_ID, mounts OAuth secret & grants org-level Cloud Identity group viewer role)
export GCP_ORG_ID="${GCP_ORG_ID:-$(gcloud organizations list --format='value(ID)' --limit=1)}"
cd user-portal/deploy/terraform
terraform init

terraform apply \
  -var="project_id=${GCP_PROJECT_ID}" \
  -var="org_id=${GCP_ORG_ID}" \
  -var="region=${GCP_REGION}" \
  -var="vpc_name=${VPC_NAME}" \
  -var="subnet_name=${SUBNET_NAME}" \
  -var="ar_source_repo_id=${AR_SOURCE_REPO}" \
  -var="ar_repo_id=${AR_REPO}" \
  -var="container_image=${IMAGE_URI}" \
  -var="oauth_secret_name=${OAUTH_SECRET:-ge-oauth-credentials}" \
  -var="ssl_certificate_id=${SSL_CERTIFICATE_ID}"
```

### What Terraform Provisions Automatically (`main.tf`)
| Layer | Terraform Resources Created Automatically |
| :--- | :--- |
| **GCP APIs** | `google_project_service.enabled_apis` (Run, Build, Artifact Registry, SQL Admin, Compute, Service Networking, Secret Manager, Scheduler, Discovery Engine, Cloud Identity) |
| **Google Artifact Registry** | `data.google_artifact_registry_repository.user_portal_source_repo` (`GENERIC` source repository) + `data.google_artifact_registry_repository.user_portal_repo` (`DOCKER` image repository in `${GCP_REGION}`) |
| **VPC, Subnets & PSA** | References existing `data.google_compute_network.user_portal_vpc` (`var.vpc_name`) and `data.google_compute_subnetwork.user_portal_subnet` (`var.subnet_name`), and provisions `google_compute_subnetwork.regional_proxy_subnet` (`REGIONAL_MANAGED_PROXY`) and `google_service_networking_connection.private_vpc_connection` |
| **IAM & Service Accounts** | `google_service_account.web_sa` (`sa-user-portal-web`), `google_service_account.sync_sa` (`sa-user-portal-sync`), and project-level `google_project_iam_member` bindings |
| **Cloud SQL HA (`geapphub_user`)** | `google_sql_database_instance.user_pg` (PostgreSQL 16, `REGIONAL` 2-zone HA, Private IP only, PITR), `google_sql_database.geapphub_user_db`, `google_sql_user.appuser` |
| **GCP Secret Manager** | `google_secret_manager_secret.secrets` for `ge-oauth-credentials` (OAuth Client ID + Secret JSON), `ge-user-db-url`, and `ge-user-session-secret` |
| **Cloud Run Web & Sync Job** | `google_cloud_run_v2_service.user_portal_web` (`min=1`, `max=10`, `2 vCPU`, `1 GiB`, Secret Manager `secret_key_ref` mounts for `GOOGLE_OAUTH_CREDENTIALS`, `DATABASE_URL`, `SESSION_SECRET`), `google_cloud_run_v2_job.user_portal_sync_job`, `google_cloud_scheduler_job.user_portal_sync_schedule` (`*/15 * * * *`) |
| **Regional Internal HTTPS ALB** | `google_compute_region_network_endpoint_group.user_portal_neg` + `google_compute_region_backend_service.user_portal_backend` (`INTERNAL_MANAGED`) + `google_compute_region_target_https_proxy.user_portal_https_proxy` (with `ssl_certificates = [var.ssl_certificate_id]`) + `google_compute_forwarding_rule.user_portal_https_fw_rule` (Port 443) |

---

## 5. Private DNS Record Configuration

Retrieve the Internal HTTPS Load Balancer VIP from Terraform outputs and map your internal domain (`${INTERNAL_DOMAIN_NAME}`) to the VIP in Cloud DNS or your corporate DNS server:

```bash
ILB_VIP="$(terraform -chdir=user-portal/deploy/terraform output -raw internal_load_balancer_vip)"
echo "Internal HTTPS Load Balancer VIP: ${ILB_VIP}"
```

---

## 6. Post-Deployment Execution & Validation (`gcloud` CLI, Sync Job & GCP Console)

### 6.1 Run & Validate the Cloud Run Sync Job (`ge-user-portal-sync-job`)

1. **Execute the Sync Job Immediately on Demand**:
   ```bash
   gcloud run jobs execute ge-user-portal-sync-job \
     --region="${GCP_REGION:-us-central1}" \
     --project="${GCP_PROJECT_ID}" \
     --wait
   ```

2. **Trigger via the 15-Minute Cloud Scheduler Job**:
   ```bash
   gcloud scheduler jobs run ge-user-portal-sync-every-15m \
     --location="${GCP_REGION:-us-central1}" \
     --project="${GCP_PROJECT_ID}"
   ```

3. **Verify Sync Execution Status & Synced Entity Counts (`apps_synced`, `groups_synced`, `memberships_synced`)**:
   ```bash
   # List recent sync job executions
   gcloud run jobs executions list \
     --job="ge-user-portal-sync-job" \
     --region="${GCP_REGION:-us-central1}" \
     --project="${GCP_PROJECT_ID}"

   # Inspect the JSON sync summary logged by the job
   gcloud logging read \
     'resource.type="cloud_run_job" AND resource.labels.job_name="ge-user-portal-sync-job" AND jsonPayload.trigger_source="cloud_run_job"' \
     --project="${GCP_PROJECT_ID}" \
     --limit=1 \
     --format="json(jsonPayload)"
   ```
   Expected JSON payload:
   ```json
   [
     {
       "jsonPayload": {
         "apps_synced": 7,
         "groups_synced": 7,
         "memberships_synced": 23,
         "status": "completed",
         "trigger_source": "cloud_run_job"
       }
     }
   ]
   ```

---

### 6.2 `gcloud` CLI Validation (Cloud Run Proxy & IAP Tunneling to the Internal Load Balancer)

```bash
terraform -chdir=user-portal/deploy/terraform output
```

#### Option A: Direct Local Port Forwarding to Cloud Run (`gcloud run services proxy`)
*(Bypasses the Internal Load Balancer and forwards `localhost:8080` directly to `ge-user-portal-web` using your `gcloud` credentials)*
```bash
gcloud run services proxy ge-user-portal-web \
  --region="${GCP_REGION:-us-central1}" \
  --project="${GCP_PROJECT_ID}" \
  --port=8080
```
In another terminal, verify the `/api/v1/health` response:
```bash
curl -sS http://localhost:8080/api/v1/health
```
Expected response:
```json
{
  "status": "ok",
  "service": "ge-apphub-backend",
  "portal_mode": "user",
  "mode": "live",
  "gcp_project_id": "<YOUR_GCP_PROJECT_ID>"
}
```

#### Option B: End-to-End Validation Through the Internal HTTPS Load Balancer via IAP SSH Tunnel
*(Tests the full production path: **Laptop Browser -> IAP SSH Tunnel -> Internal HTTPS Load Balancer (`VIP:443` + `SSL_CERTIFICATE_ID`) -> Serverless NEG -> Cloud Run**)*

1. **Create the IAP SSH Firewall Rule & Lightweight Private Jump Host (`vm-ilb-bastion`)**:
   ```bash
   gcloud services enable iap.googleapis.com --project="${GCP_PROJECT_ID}"

   gcloud compute firewall-rules describe fw-allow-iap-rdp-ssh --project="${GCP_PROJECT_ID}" >/dev/null 2>&1 || \
     gcloud compute firewall-rules create fw-allow-iap-rdp-ssh \
       --network="${VPC_NAME}" \
       --direction="INGRESS" \
       --action="ALLOW" \
       --rules="tcp:22,tcp:3389" \
       --source-ranges="35.235.240.0/20" \
       --project="${GCP_PROJECT_ID}"

   gcloud compute instances describe vm-ilb-bastion --zone="${GCP_REGION:-us-central1}-a" --project="${GCP_PROJECT_ID}" >/dev/null 2>&1 || \
     gcloud compute instances create vm-ilb-bastion \
       --zone="${GCP_REGION:-us-central1}-a" \
       --machine-type="e2-micro" \
       --network="${VPC_NAME}" \
       --subnet="${SUBNET_NAME}" \
       --no-address \
       --shielded-secure-boot \
       --shielded-vtpm \
       --shielded-integrity-monitoring \
       --image-family="debian-12" \
       --image-project="debian-cloud" \
       --project="${GCP_PROJECT_ID}"
   ```

2. **Map Your Domain Name in `/etc/hosts` & Start the Local Port-Forwarding Tunnel**:
   ```bash
   ILB_VIP="$(terraform -chdir=user-portal/deploy/terraform output -raw internal_load_balancer_vip)"

   grep -q "${INTERNAL_DOMAIN_NAME}" /etc/hosts || \
     echo "127.0.0.1 ${INTERNAL_DOMAIN_NAME}" | sudo tee -a /etc/hosts

   # Forward local port 8443 -> Internal Load Balancer VIP:443
   gcloud compute ssh vm-ilb-bastion \
     --zone="${GCP_REGION:-us-central1}-a" \
     --project="${GCP_PROJECT_ID}" \
     --tunnel-through-iap \
     -- -N -L "8443:${ILB_VIP}:443"
   ```

3. **Verify via `curl` & Browser**:
   ```bash
   curl -vk "https://${INTERNAL_DOMAIN_NAME}:8443/api/v1/health"
   ```
   Open **`https://<INTERNAL_DOMAIN_NAME>:8443`** in your browser.

---

### 6.3 Google Cloud Console UI Validation Checklist

1. **Preview the User Portal Directly in GCP Console (Cloud Shell Web Preview)**:
   - Open the GCP Console and click **Activate Cloud Shell** (`>_`) in the top bar.
   - Run:
     ```bash
     gcloud run services proxy ge-user-portal-web --region="${GCP_REGION:-us-central1}" --project="${GCP_PROJECT_ID}" --port=8080
     ```
   - Click the **Web Preview** icon in Cloud Shell -> **Preview on port 8080**.

2. **Validate the Internal HTTPS Load Balancer (`urlmap-ge-user-portal-internal`)**:
   - Open **Network Services -> Load balancing** (`https://console.cloud.google.com/net-services/loadbalancing/list/loadBalancers?project=<YOUR_GCP_PROJECT_ID>`).
   - Click **`urlmap-ge-user-portal-internal`**:
     - **Frontend**: Confirm protocol `HTTPS`, Internal VIP (`:443`) on `vpc-ge-user-portal`, and your attached SSL certificate.
     - **Backend**: Confirm `bs-ge-user-portal-internal` routes to Serverless NEG `neg-ge-user-portal-web` (`ge-user-portal-web`).

3. **Validate the Cloud Run Service (`ge-user-portal-web`) & Mounted Secrets**:
   - Open **Cloud Run -> Services -> `ge-user-portal-web`** (`https://console.cloud.google.com/run/detail/us-central1/ge-user-portal-web/revisions?project=<YOUR_GCP_PROJECT_ID>`).
   - Under **Revisions -> Variables & Secrets**, verify `DATABASE_URL` (`ge-user-db-url`), `GOOGLE_OAUTH_CREDENTIALS` (`ge-oauth-credentials`), and `SESSION_SECRET` (`ge-user-session-secret`) are mounted.
   - Under **Logs**, verify HTTP `200 OK` responses on `/api/v1/health` and `/api/v1/apps`.

4. **Validate the Cloud Run Sync Job (`ge-user-portal-sync-job`)**:
   - Open **Cloud Run -> Jobs -> `ge-user-portal-sync-job`** (`https://console.cloud.google.com/run/jobs/details/us-central1/ge-user-portal-sync-job/executions?project=<YOUR_GCP_PROJECT_ID>`).
   - Click **Execute** at the top of the page and verify the execution status turns green (`Succeeded`).

5. **Validate PostgreSQL Tables in Cloud SQL Studio (`geapphub-user-pg`)**:
   - Open **SQL -> `geapphub-user-pg` -> Cloud SQL Studio** (`https://console.cloud.google.com/sql/instances/geapphub-user-pg/studio?project=<YOUR_GCP_PROJECT_ID>`).
   - Connect to database **`geapphub_user`** and verify synced records across `ge_applications`, `app_group_bindings`, `cloud_identity_groups`, `user_group_memberships`, `access_requests`, and `sync_runs`:
     ```sql
     SELECT id, status, apps_synced, groups_synced, memberships_synced, completed_at
     FROM sync_runs
     ORDER BY id DESC
     LIMIT 5;

     SELECT user_email, group_email, synced_at
     FROM user_group_memberships
     ORDER BY group_email, user_email;
     ```

6. **Verify Portal Functional Features**:
   - **GE App Hub**: Displays `APP ID`, `APP Name`, `Group`, `Location`, and `URL` filtered by the logged-in user's Cloud Identity group memberships.
   - **AGY Hub**: Visible for `Standard` and `Plus` licensed users with **Antigravity on VS Code**, **Antigravity CLI**, and **Antigravity App** quick-start guides.
   - **Request Access**: Displays ungranted applications and AGY license tiers, persisting submitted requests into `access_requests` in `geapphub_user`.
