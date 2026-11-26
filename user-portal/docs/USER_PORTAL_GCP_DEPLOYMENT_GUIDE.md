# GCP Production Deployment Guide: Gemini AI Hub — User Portal

This deployment guide walks through deploying the standalone **Gemini AI Hub — User Portal** (`user-portal/frontend/` + `user-portal/backend/` + `geapphub_user` PostgreSQL database) to Google Cloud Platform using **Google Artifact Registry**, **Cloud Build**, **Google Cloud Secret Manager**, and **Terraform**.

> **End-to-End Pipeline with Google Artifact Registry & 2 Cloud Secrets**: Container images are built and pushed directly to **Google Artifact Registry** (`${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/${AR_REPO}`). All user-supplied credentials are consolidated into just **2 secrets** in **Google Cloud Secret Manager**:
> 1. **`ge-oauth-credentials`**: Stores both the Google OAuth 2.0 **Client ID** and **Client Secret** in a single JSON secret (supports either the downloaded Google Cloud Console OAuth JSON file or `{"client_id":"...","client_secret":"..."}`).
> 2. **`ge-ssl-certificate`**: Stores both the **SSL Certificate** (`portal.crt`) and **Private Key** (`portal.key`) in a single combined PEM bundle secret.

---

## 1. Directory Structure (`user-portal/`)

```text
user-portal/
├── Dockerfile                              # Multi-stage container build (frontend/ + backend/)
├── cloudbuild.yaml                         # 4-stage Cloud Build CI/CD pipeline for Artifact Registry
├── frontend/                               # React 18 + TypeScript + Vite User Portal SPA
├── backend/                                # FastAPI User Portal Backend (Port 8080, geapphub_user DB)
├── deploy/
│   ├── config.env.example                  # GCP, Artifact Registry & 2 Secret Manager IDs template
│   ├── deploy_user_portal_gcp.sh           # 4-stage automated pipeline orchestrator script
│   └── terraform/                          # Terraform stack (VPC, PSA, Cloud SQL HA, Secrets, Run, HTTPS ILB)
│       ├── versions.tf                     # google and google-beta providers
│       ├── variables.tf                    # Parameterized inputs & Secret Manager secret names
│       ├── main.tf                         # APIs, VPC, AR, Cloud SQL HA, Secret Manager, Run, HTTPS ILB
│       └── outputs.tf                      # Artifact Registry URI, ILB VIP, SSL Cert, Cloud Run URL
└── docs/
    ├── USER_PORTAL_GCP_DEPLOYMENT_GUIDE.md # This deployment guide
    └── user-portal-gcp-deployment-design.md # Architecture & security specification
```

---

## 2. Manual Prerequisites (Clone Repository, Create OAuth Credentials & Store the 2 Secrets in Cloud Secret Manager)

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

### Step 3: Store the 2 Secrets (`ge-oauth-credentials` & `ge-ssl-certificate`) in Google Cloud Secret Manager
All sensitive credentials are stored in **2 secrets** in **Google Cloud Secret Manager**:
1. **`ge-oauth-credentials`**: Contains both the OAuth 2.0 Client ID and Client Secret (either the downloaded `client_secret.json` from Step 2 or `{"client_id": "...", "client_secret": "..."}`).
2. **`ge-ssl-certificate`**: Contains both the PEM-encoded TLS certificate (`portal.crt`) and private key (`portal.key`) combined in a single secret.

#### Option 3A: Store the 2 Secrets via `gcloud` CLI
```bash
export GCP_PROJECT_ID="<YOUR_GCP_PROJECT_ID>"
gcloud services enable secretmanager.googleapis.com --project="${GCP_PROJECT_ID}"

# 1. Secret #1: Store OAuth 2.0 Client ID + Client Secret in 'ge-oauth-credentials'
gcloud secrets describe ge-oauth-credentials --project="${GCP_PROJECT_ID}" >/dev/null 2>&1 || \
  gcloud secrets create ge-oauth-credentials --replication-policy="automatic" --project="${GCP_PROJECT_ID}"

# Either upload your downloaded client_secret.json file or pass client_id + client_secret as JSON:
printf '{"client_id":"%s","client_secret":"%s"}' \
  "<YOUR_OAUTH_CLIENT_ID>.apps.googleusercontent.com" \
  "<YOUR_OAUTH_CLIENT_SECRET>" | \
  gcloud secrets versions add ge-oauth-credentials --data-file=- --project="${GCP_PROJECT_ID}"

# 2. Secret #2: Store SSL Certificate + Private Key together in 'ge-ssl-certificate'
gcloud secrets describe ge-ssl-certificate --project="${GCP_PROJECT_ID}" >/dev/null 2>&1 || \
  gcloud secrets create ge-ssl-certificate --replication-policy="automatic" --project="${GCP_PROJECT_ID}"

cat /path/to/portal.crt <(echo) /path/to/portal.key | \
  gcloud secrets versions add ge-ssl-certificate --data-file=- --project="${GCP_PROJECT_ID}"
```

#### Option 3B: Store the 2 Secrets via Google Cloud Console UI
1. Open **Google Cloud Console -> Security -> Secret Manager** (`https://console.cloud.google.com/security/secret-manager?project=<YOUR_GCP_PROJECT_ID>`).
2. Click **+ Create Secret** for each of the two secrets:
   - **Secret 1 (`ge-oauth-credentials`)**:
     - **Name**: `ge-oauth-credentials`
     - **Secret value**: Upload the downloaded OAuth `client_secret_*.json` file (or paste `{"client_id":"<CLIENT_ID>","client_secret":"<CLIENT_SECRET>"}`) -> Click **Create Secret**.
   - **Secret 2 (`ge-ssl-certificate`)**:
     - **Name**: `ge-ssl-certificate`
     - **Secret value**: Paste both your PEM certificate (`-----BEGIN CERTIFICATE-----...-----END CERTIFICATE-----`) and PEM private key (`-----BEGIN PRIVATE KEY-----...-----END PRIVATE KEY-----`) -> Click **Create Secret**.

### Step 4: Configure `user-portal/deploy/config.env`
Copy [`user-portal/deploy/config.env.example`](../deploy/config.env.example) to `user-portal/deploy/config.env`:

```bash
cp user-portal/deploy/config.env.example user-portal/deploy/config.env
```

Edit `user-portal/deploy/config.env`:
```bash
# 1. Target Google Cloud Project & Region (Required)
export GCP_PROJECT_ID="<YOUR_GCP_PROJECT_ID>"
export GCP_REGION="us-central1"

# 2. Google Artifact Registry Image Settings
export AR_REPO="ge-user-portal-repo"
export IMAGE_NAME="ge-user-portal"
export IMAGE_TAG="latest"

# 3. Cloud Secret Manager Secret IDs (2 Secrets: OAuth Credentials + SSL Certificate Bundle)
export OAUTH_SECRET="ge-oauth-credentials"
export SSL_SECRET="ge-ssl-certificate"

# 4. Internal Domain Name
export INTERNAL_DOMAIN_NAME="aihub.internal.corp"
```

### Step 5: Authenticate `gcloud` and Application Default Credentials (ADC)
```bash
source user-portal/deploy/config.env
gcloud auth login
gcloud auth application-default login
gcloud config set project "${GCP_PROJECT_ID}"
```

---

## 3. Option A: 1-Command End-to-End Pipeline (`deploy_user_portal_gcp.sh`)

Run [`user-portal/deploy/deploy_user_portal_gcp.sh`](../deploy/deploy_user_portal_gcp.sh) from the repository root. It executes the 4-stage deployment pipeline:
1. **Stage 1**: Enables APIs, creates the **Google Artifact Registry** repository (`ge-user-portal-repo`), and grants Cloud Build IAM permissions.
2. **Stage 2**: Ensures `ge-oauth-credentials` and `ge-ssl-certificate` exist and have active versions in **Cloud Secret Manager**.
3. **Stage 3**: Runs the **Cloud Build** pipeline ([`user-portal/cloudbuild.yaml`](../cloudbuild.yaml)), which verifies both secrets from Cloud Secret Manager (`availableSecrets`), builds `user-portal/Dockerfile`, and pushes the image directly to **Google Artifact Registry**.
4. **Stage 4**: Runs **Terraform** (`user-portal/deploy/terraform/`), parsing the certificate and private key from `ge-ssl-certificate` to provision the Regional SSL Certificate (`google_compute_region_ssl_certificate`) on the Internal HTTPS Load Balancer and mounting `ge-oauth-credentials` (`GOOGLE_OAUTH_CREDENTIALS`) from Cloud Secret Manager into Cloud Run (`ge-user-portal-web`).

```bash
chmod +x user-portal/deploy/deploy_user_portal_gcp.sh
./user-portal/deploy/deploy_user_portal_gcp.sh
```

---

## 4. Option B: Step-by-Step Artifact Registry Build & Terraform Apply

```bash
source user-portal/deploy/config.env
export GCP_REGION="${GCP_REGION:-us-central1}"
export AR_REPO="${AR_REPO:-ge-user-portal-repo}"
export IMAGE_NAME="${IMAGE_NAME:-ge-user-portal}"
export IMAGE_TAG="${IMAGE_TAG:-latest}"
export IMAGE_URI="${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/${AR_REPO}/${IMAGE_NAME}:${IMAGE_TAG}"

# 1. Enable APIs & create the Google Artifact Registry Docker repository
gcloud services enable cloudbuild.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com \
  --project="${GCP_PROJECT_ID}"

gcloud artifacts repositories describe "${AR_REPO}" --location="${GCP_REGION}" --project="${GCP_PROJECT_ID}" >/dev/null 2>&1 || \
  gcloud artifacts repositories create "${AR_REPO}" \
    --repository-format=docker \
    --location="${GCP_REGION}" \
    --description="Google Artifact Registry Docker repository for Gemini AI Hub User Portal" \
    --project="${GCP_PROJECT_ID}"

# 2. Submit Cloud Build pipeline (validates Secret Manager secrets & pushes image to Artifact Registry)
gcloud builds submit user-portal/ \
  --config=user-portal/cloudbuild.yaml \
  --substitutions="_REGION=${GCP_REGION},_AR_REPO=${AR_REPO},_IMAGE_NAME=${IMAGE_NAME},_TAG=${IMAGE_TAG},_OAUTH_SECRET=${OAUTH_SECRET:-ge-oauth-credentials},_SSL_SECRET=${SSL_SECRET:-ge-ssl-certificate}" \
  --project="${GCP_PROJECT_ID}"

# 3. Apply the Terraform stack (reads SSL cert & OAuth secrets from Cloud Secret Manager)
cd user-portal/deploy/terraform
terraform init

terraform apply \
  -var="project_id=${GCP_PROJECT_ID}" \
  -var="region=${GCP_REGION}" \
  -var="ar_repo_id=${AR_REPO}" \
  -var="container_image=${IMAGE_URI}"
```

### What Terraform Provisions Automatically (`main.tf`)
| Layer | Terraform Resources Created Automatically |
| :--- | :--- |
| **GCP APIs** | `google_project_service.enabled_apis` (Run, Build, Artifact Registry, SQL Admin, Compute, Service Networking, Secret Manager, Scheduler, Discovery Engine, Cloud Identity) |
| **Google Artifact Registry** | `google_artifact_registry_repository.user_portal_repo` (`DOCKER` repository in `${GCP_REGION}`) |
| **VPC, Subnets & PSA** | `google_compute_network.user_portal_vpc`, `google_compute_subnetwork.user_portal_subnet` (Direct VPC Egress + ILB), `google_compute_subnetwork.regional_proxy_subnet` (`REGIONAL_MANAGED_PROXY`), `google_service_networking_connection.private_vpc_connection` |
| **IAM & Service Accounts** | `google_service_account.web_sa` (`sa-user-portal-web`), `google_service_account.sync_sa` (`sa-user-portal-sync`), and least-privilege `google_project_iam_member` bindings |
| **Cloud SQL HA (`geapphub_user`)** | `google_sql_database_instance.user_pg` (PostgreSQL 16, `REGIONAL` 2-zone HA, Private IP only, PITR), `google_sql_database.geapphub_user_db`, `google_sql_user.appuser` |
| **GCP Secret Manager** | `google_secret_manager_secret.secrets` for the 2 user secrets (`ge-oauth-credentials`, `ge-ssl-certificate`) and 2 system secrets (`ge-user-db-url`, `ge-user-session-secret`) |
| **Cloud Run Web & Sync Job** | `google_cloud_run_v2_service.user_portal_web` (`min=1`, `max=10`, `2 vCPU`, `1 GiB`, Secret Manager `secret_key_ref` mounts for `GOOGLE_OAUTH_CREDENTIALS`, `DATABASE_URL`, `SESSION_SECRET`), `google_cloud_run_v2_job.user_portal_sync_job`, `google_cloud_scheduler_job.user_portal_sync_schedule` (`*/15 * * * *`) |
| **Regional Internal HTTPS ALB** | `google_compute_region_ssl_certificate.user_portal_ssl_cert` (extracted from Secret Manager `ge-ssl-certificate`) + `google_compute_region_network_endpoint_group.user_portal_neg` + `google_compute_region_backend_service.user_portal_backend` (`INTERNAL_MANAGED`) + `google_compute_region_target_https_proxy.user_portal_https_proxy` + `google_compute_forwarding_rule.user_portal_https_fw_rule` (Port 443) |

---

## 5. Private DNS Record Configuration

Retrieve the Internal HTTPS Load Balancer VIP from Terraform outputs and map your internal domain (`${INTERNAL_DOMAIN_NAME}`) to the VIP in Cloud DNS or your corporate DNS server:

```bash
ILB_VIP="$(terraform -chdir=user-portal/deploy/terraform output -raw internal_load_balancer_vip)"
echo "Internal HTTPS Load Balancer VIP: ${ILB_VIP}"
```

---

## 6. Post-Deployment Verification

```bash
terraform -chdir=user-portal/deploy/terraform output
```
1. **Verify Health & Active Project Configuration**:
   ```bash
   SERVICE_URL="$(terraform -chdir=user-portal/deploy/terraform output -raw cloud_run_service_uri)"
   curl -sS "${SERVICE_URL}/api/v1/health"
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
2. **Verify Portal Features**:
   - **GE App Hub**: Displays `APP ID`, `APP Name`, `Group`, `Location`, and `URL` for authorized apps.
   - **AGY Hub**: Visible for `Standard` and `Plus` licensed users with **Antigravity on VS Code**, **Antigravity CLI**, and **Antigravity App** quick-start guides.
   - **Request Access**: Displays ungranted applications and AGY license tiers, persisting requests into the `access_requests` table in `geapphub_user`.
