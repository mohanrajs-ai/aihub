# GCP Production Deployment Guide: Gemini AI Hub — User Portal

This step-by-step deployment guide walks through deploying the standalone **Gemini AI Hub — User Portal** (`frontend-user/` + `backend-user/` + `geapphub_user` PostgreSQL database) to Google Cloud Platform.

---

## 1. Prerequisites & Authentication

1. **Authenticate `gcloud` and Application Default Credentials (ADC)**:
   ```bash
   gcloud auth login
   gcloud auth application-default login
   gcloud config set project techm-514903   # or cymbal-app-514110
   ```
2. **Verify Required Tools**:
   - `gcloud` CLI (`>= 450.0.0`)
   - `terraform` (`>= 1.5.0`)

---

## 2. Option A: 1-Command Automated Deployment (`deploy_user_portal_gcp.sh`)

Run the bundled deployment script [`deploy/deploy_user_portal_gcp.sh`](../deploy/deploy_user_portal_gcp.sh) from the repository root:

```bash
chmod +x deploy/deploy_user_portal_gcp.sh
GCP_PROJECT_ID="techm-514903" \
GCP_REGION="us-central1" \
./deploy/deploy_user_portal_gcp.sh
```

To also provision the full **Internal Application Load Balancer + Cloud SQL HA + Cloud DNS Private Zone** via Terraform in the same run, pass your VPC and certificate IDs:

```bash
GCP_PROJECT_ID="techm-514903" \
GCP_REGION="us-central1" \
VPC_NETWORK_ID="projects/techm-514903/global/networks/default" \
VPC_EGRESS_SUBNET_ID="projects/techm-514903/regions/us-central1/subnetworks/default" \
ILB_SUBNET_ID="projects/techm-514903/regions/us-central1/subnetworks/default" \
SSL_CERTIFICATE_ID="projects/techm-514903/regions/us-central1/sslCertificates/aihub-internal-cert" \
./deploy/deploy_user_portal_gcp.sh
```

---

## 3. Option B: Step-by-Step Manual Deployment

### Step 1: Enable Required GCP APIs
```bash
export PROJECT_ID="techm-514903"
export REGION="us-central1"

gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  sqladmin.googleapis.com \
  compute.googleapis.com \
  servicenetworking.googleapis.com \
  secretmanager.googleapis.com \
  cloudscheduler.googleapis.com \
  dns.googleapis.com \
  discoveryengine.googleapis.com \
  cloudidentity.googleapis.com \
  --project="${PROJECT_ID}"
```

### Step 2: Create Artifact Registry & Build `Dockerfile.user` via Cloud Build
Uses [`cloudbuild.user.yaml`](../cloudbuild.user.yaml) to compile `frontend-user/` and package `backend-user/` into a single production image (zero admin code included):

```bash
gcloud artifacts repositories create ge-user-portal-repo \
  --repository-format=docker \
  --location="${REGION}" \
  --project="${PROJECT_ID}"

gcloud builds submit \
  --config=cloudbuild.user.yaml \
  --substitutions="_REGION=${REGION},_AR_REPO=ge-user-portal-repo,_IMAGE_NAME=ge-user-portal,_TAG=latest" \
  --project="${PROJECT_ID}"
```

### Step 3: Populate Secret Manager Values
After initializing the secrets (or via Terraform), populate the secret versions for OAuth 2.0, session signing, and the `geapphub_user` Cloud SQL Private IP connection string:

```bash
echo -n "postgresql+psycopg://appuser:STRONG_PASS@<CLOUD_SQL_PRIVATE_IP>:5432/geapphub_user" | \
  gcloud secrets versions add ge-user-db-url --data-file=- --project="${PROJECT_ID}"

echo -n "<YOUR_GOOGLE_OAUTH_CLIENT_ID>" | \
  gcloud secrets versions add ge-oauth-client-id --data-file=- --project="${PROJECT_ID}"

echo -n "<YOUR_GOOGLE_OAUTH_CLIENT_SECRET>" | \
  gcloud secrets versions add ge-oauth-client-secret --data-file=- --project="${PROJECT_ID}"

openssl rand -hex 32 | tr -d '\n' | \
  gcloud secrets versions add ge-user-session-secret --data-file=- --project="${PROJECT_ID}"
```

### Step 4: Provision Cloud SQL HA, Cloud Run, Sync Job & Internal ALB via Terraform
Execute the Terraform stack in [`deploy/terraform/user-portal/`](../deploy/terraform/user-portal/main.tf):

```bash
cd deploy/terraform/user-portal

terraform init

terraform plan \
  -var="project_id=${PROJECT_ID}" \
  -var="region=${REGION}" \
  -var="container_image=${REGION}-docker.pkg.dev/${PROJECT_ID}/ge-user-portal-repo/ge-user-portal:latest" \
  -var="vpc_network_id=projects/${PROJECT_ID}/global/networks/default" \
  -var="vpc_egress_subnet_id=projects/${PROJECT_ID}/regions/${REGION}/subnetworks/default" \
  -var="ilb_subnet_id=projects/${PROJECT_ID}/regions/${REGION}/subnetworks/default" \
  -var="ssl_certificate_id=projects/${PROJECT_ID}/regions/${REGION}/sslCertificates/aihub-internal-cert"

terraform apply
```

### Step 5: Trigger Initial Catalog & Cloud Identity Group Sync Job
Run the Cloud Run Sync Job (`ge-user-portal-sync-job`) once immediately to seed `geapphub_user` before the 15-minute Cloud Scheduler cron takes over:

```bash
gcloud run jobs execute ge-user-portal-sync-job \
  --region="${REGION}" \
  --project="${PROJECT_ID}" \
  --wait
```

---

## 4. Post-Deployment Verification

1. **Verify Internal ALB VIP & DNS Resolution (from corporate VPN)**:
   ```bash
   terraform -chdir=deploy/terraform/user-portal output internal_load_balancer_vip
   curl -vk https://aihub.internal.techmahindra.com/api/v1/health
   ```
   Expected response:
   ```json
   {
     "status": "ok",
     "service": "ge-apphub-backend",
     "portal_mode": "user",
     "mode": "live",
     "gcp_project_id": "techm-514903"
   }
   ```
2. **Verify Google Cloud Identity OAuth Redirect**:
   Open `https://aihub.internal.techmahindra.com` in your browser, enter your Tech-M email address, and click **Continue to Google Sign-In**.
3. **Verify Tabs**:
   - **GE App Hub**: Displays `APP ID`, `APP Name`, `Group`, `Location`, and `URL` for authorized apps.
   - **AGY Hub**: Visible for `Standard` and `Plus` licensed users with **Antigravity on VS Code**, **Antigravity CLI**, and **Antigravity App** quick-start guides.
   - **Request Access**: Displays ungranted applications and AGY license tiers, persisting requests into the `access_requests` table in `geapphub_user`.
