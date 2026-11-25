# GCP Production Deployment Guide: Gemini AI Hub — User Portal

This deployment guide walks through deploying the standalone **Gemini AI Hub — User Portal** (`user-portal/frontend/` + `user-portal/backend/` + `geapphub_user` PostgreSQL database) to Google Cloud Platform.

> **100% Automated via Terraform**: All GCP APIs, VPC networking, Direct VPC Egress & Proxy-Only subnets, Private Services Access (PSA), Google Certificate Authority Service (CAS) Private CA + Regional Certificate Manager TLS certificates (`google_privateca_ca_pool` + `google_certificate_manager_certificate`), Private Cloud DNS Managed Zone & `A` records (`google_dns_managed_zone` + `google_dns_record_set`), Cloud SQL HA (`REGIONAL`), GCP Secret Manager secrets & versions, Cloud Run v2 Service & 15-minute Sync Job, and the Internal HTTPS Load Balancer are provisioned **automatically by Terraform** with zero manual networking, SSL, or DNS steps.

---

## 1. Directory Structure (`user-portal/`)

```text
user-portal/
├── Dockerfile                              # Multi-stage container build (frontend/ + backend/)
├── cloudbuild.yaml                         # Cloud Build pipeline for Artifact Registry
├── frontend/                               # React 18 + TypeScript + Vite User Portal SPA
├── backend/                                # FastAPI User Portal Backend (Port 8080, geapphub_user DB)
├── deploy/
│   ├── config.env.example                  # User-supplied GCP, GitHub & OAuth configuration template
│   ├── deploy_user_portal_gcp.sh           # 1-command automated build + Terraform apply script
│   └── terraform/                          # Complete 100% automated Terraform stack
│       ├── versions.tf                     # google, google-beta, tls, and random providers
│       ├── variables.tf                    # Parameterized inputs (no hardcoded project IDs)
│       ├── main.tf                         # APIs, VPC, PSA, Cloud SQL HA, Secrets, Run, SSL, DNS, ILB, GitHub CI
│       └── outputs.tf                      # Exported VIP, HTTPS URL, SSL Cert ID, DNS Zone, Cloud SQL IP
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
Copy [`user-portal/deploy/config.env.example`](../deploy/config.env.example) to `user-portal/deploy/config.env` and set your project, GitHub repository, OAuth credentials, and desired internal domain name:

```bash
cp user-portal/deploy/config.env.example user-portal/deploy/config.env
```

Edit `user-portal/deploy/config.env`:
```bash
# 1. Target Google Cloud Project & Region (Required)
export GCP_PROJECT_ID="<YOUR_GCP_PROJECT_ID>"
export GCP_REGION="us-central1"

# 2. GitHub Repository Configuration (Used for Cloud Build CI/CD trigger)
export GITHUB_REPO_URL="https://github.com/<YOUR_GITHUB_ORG_OR_USER>/<YOUR_GITHUB_REPO>.git"
export GITHUB_REPO_OWNER="<YOUR_GITHUB_ORG_OR_USER>"
export GITHUB_REPO_NAME="<YOUR_GITHUB_REPO>"
export GITHUB_BRANCH="main"

# 3. Artifact Registry Configuration
export AR_REPO="ge-user-portal-repo"
export IMAGE_NAME="ge-user-portal"
export IMAGE_TAG="latest"

# 4. Google OAuth 2.0 Web Client Credentials (automatically stored in GCP Secret Manager by Terraform)
export GOOGLE_CLIENT_ID="<YOUR_OAUTH_CLIENT_ID>.apps.googleusercontent.com"
export GOOGLE_CLIENT_SECRET="<YOUR_OAUTH_CLIENT_SECRET>"

# 5. Internal Domain Name (SSL Certificate & Cloud DNS Private Zone are created automatically by Terraform)
export INTERNAL_DOMAIN_NAME="aihub.internal.corp"
```

### Step 4: Authenticate `gcloud` and Application Default Credentials (ADC)
```bash
source user-portal/deploy/config.env
gcloud auth login
gcloud auth application-default login
gcloud config set project "${GCP_PROJECT_ID}"
```

---

## 3. Option A: 1-Command End-to-End Automated Deployment (`deploy_user_portal_gcp.sh`)

From your cloned repository root, run [`user-portal/deploy/deploy_user_portal_gcp.sh`](../deploy/deploy_user_portal_gcp.sh). It loads `user-portal/deploy/config.env`, builds the container image from your local `user-portal/` directory via Cloud Build, and runs `terraform apply` to provision 100% of the infrastructure automatically:

```bash
chmod +x user-portal/deploy/deploy_user_portal_gcp.sh
./user-portal/deploy/deploy_user_portal_gcp.sh
```

---

## 4. Option B: Direct Terraform Execution (`user-portal/deploy/terraform/`)

If you have already built and pushed the container image via [`user-portal/cloudbuild.yaml`](../cloudbuild.yaml), you can run Terraform directly with no manual networking, SSL, DNS, or Secret Manager steps:

```bash
source user-portal/deploy/config.env

# 1. Build & push container image via Cloud Build
cd user-portal
gcloud builds submit \
  --config=cloudbuild.yaml \
  --substitutions="_REGION=${GCP_REGION},_AR_REPO=${AR_REPO},_IMAGE_NAME=${IMAGE_NAME},_TAG=${IMAGE_TAG}" \
  --project="${GCP_PROJECT_ID}"

# 2. Initialize & apply the complete Terraform stack
cd deploy/terraform
terraform init

terraform apply \
  -var="project_id=${GCP_PROJECT_ID}" \
  -var="region=${GCP_REGION}" \
  -var="container_image=${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/${AR_REPO}/${IMAGE_NAME}:${IMAGE_TAG}" \
  -var="google_client_id=${GOOGLE_CLIENT_ID}" \
  -var="google_client_secret=${GOOGLE_CLIENT_SECRET}" \
  -var="internal_domain_name=${INTERNAL_DOMAIN_NAME}" \
  -var="github_repo_url=${GITHUB_REPO_URL}" \
  -var="github_repo_owner=${GITHUB_REPO_OWNER}" \
  -var="github_repo_name=${GITHUB_REPO_NAME}" \
  -var="github_branch=${GITHUB_BRANCH}"
```

### What Terraform Provisions Automatically (`main.tf`)
| Layer | Terraform Resources Created Automatically |
| :--- | :--- |
| **GCP APIs** | `google_project_service.enabled_apis` (Run, Build, Artifact Registry, SQL Admin, Compute, Service Networking, Secret Manager, Scheduler, DNS, Discovery Engine, Cloud Identity) |
| **VPC, Subnets & PSA** | `google_compute_network.user_portal_vpc`, `google_compute_subnetwork.user_portal_subnet` (Direct VPC Egress + ILB), `google_compute_subnetwork.regional_proxy_subnet` (`REGIONAL_MANAGED_PROXY`), `google_service_networking_connection.private_vpc_connection` |
| **IAM & Service Accounts** | `google_service_account.web_sa` (`sa-user-portal-web`), `google_service_account.sync_sa` (`sa-user-portal-sync`), and least-privilege `google_project_iam_member` bindings |
| **Cloud SQL HA (`geapphub_user`)** | `google_sql_database_instance.user_pg` (PostgreSQL 16, `REGIONAL` 2-zone HA, Private IP only, PITR), `google_sql_database.geapphub_user_db`, `google_sql_user.appuser`, `random_password.db_password` |
| **GCP Secret Manager** | `google_secret_manager_secret.secrets` + `google_secret_manager_secret_version` for `ge-user-db-url`, `ge-oauth-client-id`, `ge-oauth-client-secret`, and `ge-user-session-secret` (`random_password.session_secret`) |
| **Cloud Run Web & Sync Job** | `google_cloud_run_v2_service.user_portal_web` (`min=1`, `max=10`, `2 vCPU`, `1 GiB`, Secret Manager `secret_key_ref` mounts), `google_cloud_run_v2_job.user_portal_sync_job`, `google_cloud_scheduler_job.user_portal_sync_schedule` (`*/15 * * * *`) |
| **Automated SSL & Internal ALB** | `google_privateca_ca_pool.user_portal_ca_pool` + `google_privateca_certificate_authority.user_portal_root_ca` + `google_certificate_manager_certificate.user_portal_ssl_cert` bound to `google_compute_region_target_https_proxy.user_portal_https_proxy` & `google_compute_forwarding_rule.user_portal_https_fw_rule` (`INTERNAL_MANAGED`) |
| **Automated Private Cloud DNS** | `google_dns_managed_zone.private_zone` (Private DNS Zone bound to `vpc-ge-user-portal`) + `google_dns_record_set.user_portal_dns_a` (`A` record pointing `${INTERNAL_DOMAIN_NAME}` to the Internal ALB VIP) |
| **GitHub CI/CD Trigger** | `google_cloudbuild_trigger.user_portal_github_ci` (Builds `user-portal/cloudbuild.yaml` on pushes to `GITHUB_BRANCH`) |

---

## 5. Post-Deployment Verification

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
