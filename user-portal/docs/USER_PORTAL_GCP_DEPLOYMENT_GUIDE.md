# GCP Production Deployment Guide: Gemini AI Hub — User Portal

This deployment guide walks through deploying the standalone **Gemini AI Hub — User Portal** (`user-portal/frontend/` + `user-portal/backend/` + `geapphub_user` PostgreSQL database) to Google Cloud Platform.

> **Automated via Terraform + Manual SSL & DNS**: All GCP APIs, VPC networking, Direct VPC Egress & Proxy-Only subnets, Private Services Access (PSA), Cloud SQL HA (`REGIONAL`), GCP Secret Manager secrets & versions, Cloud Run v2 Service & 15-minute Sync Job, and the Regional Internal Application Load Balancer are provisioned **automatically by Terraform**. **SSL Certificate and Private DNS configuration are performed manually** (see Section 5).

---

## 1. Directory Structure (`user-portal/`)

```text
user-portal/
├── Dockerfile                              # Multi-stage container build (frontend/ + backend/)
├── cloudbuild.yaml                         # Cloud Build pipeline for Artifact Registry
├── frontend/                               # React 18 + TypeScript + Vite User Portal SPA
├── backend/                                # FastAPI User Portal Backend (Port 8080, geapphub_user DB)
├── deploy/
│   ├── config.env.example                  # User-supplied GCP & OAuth configuration template
│   ├── deploy_user_portal_gcp.sh           # 1-command automated build + Terraform apply script
│   └── terraform/                          # Terraform stack (VPC, PSA, Cloud SQL HA, Secrets, Run, ILB)
│       ├── versions.tf                     # google and google-beta providers
│       ├── variables.tf                    # Parameterized inputs (no hardcoded project IDs)
│       ├── main.tf                         # APIs, VPC, PSA, Cloud SQL HA, Secrets, Run, ILB
│       └── outputs.tf                      # Exported VIP, Cloud Run URL, Cloud SQL IP
└── docs/
    ├── USER_PORTAL_GCP_DEPLOYMENT_GUIDE.md # This deployment guide
    └── user-portal-gcp-deployment-design.md # Architecture & security specification
```

---

## 2. Manual Prerequisites (Clone Repository, OAuth Client & `config.env`)

### Step 1: Clone the GitHub Repository Manually
Clone the repository to your workstation or Cloud Shell before running the deployment automation:

```bash
git clone https://github.com/<YOUR_GITHUB_ORG_OR_USER>/<YOUR_GITHUB_REPO>.git
cd <YOUR_GITHUB_REPO>
```

### Step 2: Create Google OAuth 2.0 Web Client Credentials
1. Open **Google Cloud Console -> APIs & Services -> Credentials** (`https://console.cloud.google.com/apis/credentials?project=<YOUR_GCP_PROJECT_ID>`).
2. Click **+ Create Credentials -> OAuth client ID** (`Web application`):
   - **Authorized JavaScript origins**: `https://<YOUR_INTERNAL_DOMAIN_OR_CLOUD_RUN_URL>`
   - **Authorized redirect URIs**: `https://<YOUR_INTERNAL_DOMAIN_OR_CLOUD_RUN_URL>/api/v1/auth/google/callback`
3. Copy the generated **Client ID** (`*.apps.googleusercontent.com`) and **Client Secret** (`GOCSPX-*`). *(Terraform automatically creates the Secret Manager secrets, stores their versions, and mounts them into Cloud Run.)*

### Step 3: Configure `user-portal/deploy/config.env`
Copy [`user-portal/deploy/config.env.example`](../deploy/config.env.example) to `user-portal/deploy/config.env` and set your project and OAuth credentials:

```bash
cp user-portal/deploy/config.env.example user-portal/deploy/config.env
```

Edit `user-portal/deploy/config.env`:
```bash
# 1. Target Google Cloud Project & Region (Required)
export GCP_PROJECT_ID="<YOUR_GCP_PROJECT_ID>"
export GCP_REGION="us-central1"

# 2. Google OAuth 2.0 Web Client Credentials (automatically stored in GCP Secret Manager by Terraform)
export GOOGLE_CLIENT_ID="<YOUR_OAUTH_CLIENT_ID>.apps.googleusercontent.com"
export GOOGLE_CLIENT_SECRET="<YOUR_OAUTH_CLIENT_SECRET>"

# 3. Internal Domain Name (SSL Certificate & Cloud DNS are configured manually in Section 5)
export INTERNAL_DOMAIN_NAME="aihub.internal.corp"

# 4. Artifact Registry & Cloud Build Image Settings
export GCS_SOURCE_BUCKET="${GCP_PROJECT_ID}-user-portal-source"
export AR_REPO="ge-user-portal-repo"
export IMAGE_NAME="ge-user-portal"
export IMAGE_TAG="latest"
```

### Step 4: Authenticate `gcloud` and Application Default Credentials (ADC)
```bash
source user-portal/deploy/config.env
gcloud auth login
gcloud auth application-default login
gcloud config set project "${GCP_PROJECT_ID}"
```

---

## 3. Option A: 1-Command Automated Deployment (`deploy_user_portal_gcp.sh`)

From your cloned repository root, run [`user-portal/deploy/deploy_user_portal_gcp.sh`](../deploy/deploy_user_portal_gcp.sh). It loads `user-portal/deploy/config.env`, builds the container image via Cloud Build, imports any pre-existing resources into Terraform state, and runs `terraform apply`:

```bash
chmod +x user-portal/deploy/deploy_user_portal_gcp.sh
./user-portal/deploy/deploy_user_portal_gcp.sh
```

---

## 4. Option B: Step-by-Step GCS Sync, Cloud Build & Terraform Apply

```bash
source user-portal/deploy/config.env
export GCP_REGION="${GCP_REGION:-us-central1}"
export GCS_SOURCE_BUCKET="${GCS_SOURCE_BUCKET:-${GCP_PROJECT_ID}-user-portal-source}"
export AR_REPO="${AR_REPO:-ge-user-portal-repo}"
export IMAGE_NAME="${IMAGE_NAME:-ge-user-portal}"
export IMAGE_TAG="${IMAGE_TAG:-latest}"

# 1. Create the GCS Source Bucket & Artifact Registry Repository (if not yet created)
gcloud services enable storage.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com \
  --project="${GCP_PROJECT_ID}"

gcloud storage buckets describe "gs://${GCS_SOURCE_BUCKET}" --project="${GCP_PROJECT_ID}" >/dev/null 2>&1 || \
  gcloud storage buckets create "gs://${GCS_SOURCE_BUCKET}" \
    --location="${GCP_REGION}" \
    --uniform-bucket-level-access \
    --project="${GCP_PROJECT_ID}"

gcloud artifacts repositories describe "${AR_REPO}" --location="${GCP_REGION}" --project="${GCP_PROJECT_ID}" >/dev/null 2>&1 || \
  gcloud artifacts repositories create "${AR_REPO}" \
    --repository-format=docker \
    --location="${GCP_REGION}" \
    --description="Container repository for Gemini AI Hub User Portal" \
    --project="${GCP_PROJECT_ID}"

# 2. Sync the User Portal source code to GCS (gs://<BUCKET>/src/)
gcloud storage rsync -r --delete-unmatched-destination-objects \
  --exclude='(\.git|node_modules|__pycache__|\.pytest_cache|dist|\.terraform).*' \
  user-portal/ "gs://${GCS_SOURCE_BUCKET}/src" \
  --project="${GCP_PROJECT_ID}"

# 3. Package the source archive & upload to GCS (gs://<BUCKET>/archives/)
tar -czf /tmp/user-portal-source.tgz \
  --exclude="node_modules" \
  --exclude="__pycache__" \
  --exclude=".pytest_cache" \
  --exclude=".terraform" \
  -C user-portal .

gcloud storage cp /tmp/user-portal-source.tgz \
  "gs://${GCS_SOURCE_BUCKET:-${GCP_PROJECT_ID}-user-portal-source}/archives/user-portal-${IMAGE_TAG:-latest}.tgz" \
  --project="${GCP_PROJECT_ID}"

# 4. Trigger Cloud Build directly from the GCS archive
gcloud builds submit "gs://${GCS_SOURCE_BUCKET:-${GCP_PROJECT_ID}-user-portal-source}/archives/user-portal-${IMAGE_TAG:-latest}.tgz" \
  --config=user-portal/cloudbuild.yaml \
  --gcs-source-staging-dir="gs://${GCS_SOURCE_BUCKET:-${GCP_PROJECT_ID}-user-portal-source}/staging" \
  --substitutions="_REGION=${GCP_REGION:-us-central1},_AR_REPO=${AR_REPO:-ge-user-portal-repo},_IMAGE_NAME=${IMAGE_NAME:-ge-user-portal},_TAG=${IMAGE_TAG:-latest}" \
  --project="${GCP_PROJECT_ID}"

# 5. Apply the Terraform stack (VPC, Cloud SQL HA, Secret Manager, Cloud Run & Internal ALB)
cd user-portal/deploy/terraform
terraform init

terraform apply \
  -var="project_id=${GCP_PROJECT_ID}" \
  -var="region=${GCP_REGION:-us-central1}" \
  -var="container_image=${GCP_REGION:-us-central1}-docker.pkg.dev/${GCP_PROJECT_ID}/${AR_REPO:-ge-user-portal-repo}/${IMAGE_NAME:-ge-user-portal}:${IMAGE_TAG:-latest}" \
  -var="google_client_id=${GOOGLE_CLIENT_ID}" \
  -var="google_client_secret=${GOOGLE_CLIENT_SECRET}"
```

### What Terraform Provisions Automatically (`main.tf`)
| Layer | Terraform Resources Created Automatically |
| :--- | :--- |
| **GCP APIs** | `google_project_service.enabled_apis` (Run, Build, Artifact Registry, SQL Admin, Compute, Service Networking, Secret Manager, Scheduler, Discovery Engine, Cloud Identity) |
| **VPC, Subnets & PSA** | `google_compute_network.user_portal_vpc`, `google_compute_subnetwork.user_portal_subnet` (Direct VPC Egress + ILB), `google_compute_subnetwork.regional_proxy_subnet` (`REGIONAL_MANAGED_PROXY`), `google_service_networking_connection.private_vpc_connection` |
| **IAM & Service Accounts** | `google_service_account.web_sa` (`sa-user-portal-web`), `google_service_account.sync_sa` (`sa-user-portal-sync`), and least-privilege `google_project_iam_member` bindings |
| **Cloud SQL HA (`geapphub_user`)** | `google_sql_database_instance.user_pg` (PostgreSQL 16, `REGIONAL` 2-zone HA, Private IP only, PITR), `google_sql_database.geapphub_user_db`, `google_sql_user.appuser` |
| **GCP Secret Manager** | `google_secret_manager_secret.secrets` + `google_secret_manager_secret_version` for `ge-user-db-url`, `ge-oauth-client-id`, `ge-oauth-client-secret`, and `ge-user-session-secret` |
| **Cloud Run Web & Sync Job** | `google_cloud_run_v2_service.user_portal_web` (`min=1`, `max=10`, `2 vCPU`, `1 GiB`, Secret Manager `secret_key_ref` mounts), `google_cloud_run_v2_job.user_portal_sync_job`, `google_cloud_scheduler_job.user_portal_sync_schedule` (`*/15 * * * *`) |
| **Regional Internal ALB** | `google_compute_region_network_endpoint_group.user_portal_neg` + `google_compute_region_backend_service.user_portal_backend` (`INTERNAL_MANAGED`) + `google_compute_region_url_map.user_portal_url_map` + `google_compute_address.user_portal_internal_vip` |

---

## 5. Manual SSL Certificate & DNS Configuration

SSL certificate provisioning and DNS record creation are intentionally excluded from the Terraform automation so you can use your organization's Enterprise CA certificate and corporate DNS zone manually:

### Step 1: Create & Upload Your Regional SSL Certificate Manually
Upload your certificate (`portal.crt`) and private key (`portal.key`) to Google Cloud Compute Engine as a regional SSL certificate in `${GCP_REGION}`, then pass its resource ID to Terraform (or attach it to the Internal HTTPS Target Proxy in Cloud Console):

```bash
gcloud compute ssl-certificates create cert-ge-user-portal-internal \
  --certificate=/path/to/portal.crt \
  --private-key=/path/to/portal.key \
  --region="${GCP_REGION:-us-central1}" \
  --project="${GCP_PROJECT_ID}"

SSL_CERT_ID="projects/${GCP_PROJECT_ID}/regions/${GCP_REGION:-us-central1}/sslCertificates/cert-ge-user-portal-internal"

terraform -chdir=user-portal/deploy/terraform apply \
  -var="project_id=${GCP_PROJECT_ID}" \
  -var="region=${GCP_REGION:-us-central1}" \
  -var="container_image=${GCP_REGION:-us-central1}-docker.pkg.dev/${GCP_PROJECT_ID}/${AR_REPO:-ge-user-portal-repo}/${IMAGE_NAME:-ge-user-portal}:${IMAGE_TAG:-latest}" \
  -var="google_client_id=${GOOGLE_CLIENT_ID}" \
  -var="google_client_secret=${GOOGLE_CLIENT_SECRET}" \
  -var="ssl_certificate_id=${SSL_CERT_ID}"
```

### Step 2: Create the Private DNS Zone / `A` Record Manually
Retrieve the Internal Load Balancer VIP from Terraform outputs and map your internal domain (`${INTERNAL_DOMAIN_NAME}`) to the VIP in Cloud DNS or your corporate DNS server:

```bash
ILB_VIP="$(terraform -chdir=user-portal/deploy/terraform output -raw internal_load_balancer_vip)"
echo "Internal Load Balancer VIP: ${ILB_VIP}"

# Optional: Create a Private Cloud DNS Zone and A record manually
gcloud dns managed-zones create zone-ge-user-portal-private \
  --dns-name="internal.corp." \
  --description="Private DNS Zone for Gemini AI Hub User Portal" \
  --visibility="private" \
  --networks="vpc-ge-user-portal" \
  --project="${GCP_PROJECT_ID}"

gcloud dns record-sets create "${INTERNAL_DOMAIN_NAME:-aihub.internal.corp}." \
  --zone="zone-ge-user-portal-private" \
  --type="A" \
  --ttl="300" \
  --rrdatas="${ILB_VIP}" \
  --project="${GCP_PROJECT_ID}"
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
