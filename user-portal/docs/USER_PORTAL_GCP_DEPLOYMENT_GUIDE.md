# GCP Production Deployment Guide: Gemini AI Hub — User Portal

This step-by-step deployment guide walks through deploying the standalone **Gemini AI Hub — User Portal** (`user-portal/frontend/` + `user-portal/backend/` + `geapphub_user` PostgreSQL database) to Google Cloud Platform.

> **Important**: No project IDs, domains, or OAuth credentials are hardcoded in the codebase or deployment manifests. You must set your target `GCP_PROJECT_ID` and environment variables before running any deployment commands.

---

## 1. Directory Structure (`user-portal/`)

```text
user-portal/
├── Dockerfile                              # Multi-stage container build (frontend/ + backend/)
├── cloudbuild.yaml                         # Cloud Build pipeline for Artifact Registry
├── frontend/                               # React 18 + TypeScript + Vite User Portal SPA
├── backend/                                # FastAPI User Portal Backend (Port 8080, geapphub_user DB)
├── deploy/
│   ├── deploy_user_portal_gcp.sh           # Automated GCP deployment script
│   └── terraform/                          # Terraform IaC (Cloud Run, Cloud SQL HA, Internal ALB, Secret Manager)
└── docs/
    ├── USER_PORTAL_GCP_DEPLOYMENT_GUIDE.md # This deployment guide
    └── user-portal-gcp-deployment-design.md # Architecture & security specification
```

---

## 2. Prerequisites & Environment Variables

1. **Set Your Required Environment Variables**:
   ```bash
   export GCP_PROJECT_ID="<YOUR_GCP_PROJECT_ID>"
   export GCP_REGION="<YOUR_GCP_REGION>"             # e.g., us-central1
   export AR_REPO="ge-user-portal-repo"
   export IMAGE_NAME="ge-user-portal"
   export IMAGE_TAG="latest"
   ```

2. **Authenticate `gcloud` and Application Default Credentials (ADC)**:
   ```bash
   gcloud auth login
   gcloud auth application-default login
   gcloud config set project "${GCP_PROJECT_ID}"
   ```

---

## 3. Option A: Automated Deployment (`deploy_user_portal_gcp.sh`)

Run [`user-portal/deploy/deploy_user_portal_gcp.sh`](../deploy/deploy_user_portal_gcp.sh). The script validates that `GCP_PROJECT_ID` is set (exiting immediately if unset), enables required APIs, builds the image via Cloud Build, stores OAuth credentials in **GCP Secret Manager**, and deploys the Cloud Run service and 15-minute sync job:

```bash
chmod +x user-portal/deploy/deploy_user_portal_gcp.sh

export GCP_PROJECT_ID="<YOUR_GCP_PROJECT_ID>"
export GCP_REGION="us-central1"
export GOOGLE_CLIENT_ID="<YOUR_OAUTH_CLIENT_ID>.apps.googleusercontent.com"
export GOOGLE_CLIENT_SECRET="<YOUR_OAUTH_CLIENT_SECRET>"

./user-portal/deploy/deploy_user_portal_gcp.sh
```

To also provision **Cloud SQL HA (`REGIONAL`), the Regional Internal Application Load Balancer (`INTERNAL_MANAGED`), and Cloud DNS Private Zone** via Terraform in the same run, export your networking and certificate variables:

```bash
export GCP_PROJECT_ID="<YOUR_GCP_PROJECT_ID>"
export GCP_REGION="us-central1"
export VPC_NETWORK_ID="projects/${GCP_PROJECT_ID}/global/networks/<YOUR_VPC_NAME>"
export VPC_EGRESS_SUBNET_ID="projects/${GCP_PROJECT_ID}/regions/${GCP_REGION}/subnetworks/<YOUR_EGRESS_SUBNET>"
export ILB_SUBNET_ID="projects/${GCP_PROJECT_ID}/regions/${GCP_REGION}/subnetworks/<YOUR_ILB_SUBNET>"
export INTERNAL_DOMAIN_NAME="<YOUR_INTERNAL_FQDN>"
export PRIVATE_DNS_ZONE_NAME="<YOUR_PRIVATE_DNS_ZONE_NAME>"
export SSL_CERTIFICATE_ID="projects/${GCP_PROJECT_ID}/regions/${GCP_REGION}/sslCertificates/<YOUR_SSL_CERT_NAME>"

./user-portal/deploy/deploy_user_portal_gcp.sh
```

---

## 4. Option B: Step-by-Step Manual Deployment

### Step 1: Enable Required GCP APIs
```bash
export GCP_PROJECT_ID="<YOUR_GCP_PROJECT_ID>"
export GCP_REGION="us-central1"

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
  --project="${GCP_PROJECT_ID}"
```

### Step 2: Create Artifact Registry & Build `user-portal/Dockerfile` via Cloud Build
From inside the `user-portal/` directory, run Cloud Build using [`user-portal/cloudbuild.yaml`](../cloudbuild.yaml):

```bash
cd user-portal

gcloud artifacts repositories create ge-user-portal-repo \
  --repository-format=docker \
  --location="${GCP_REGION}" \
  --project="${GCP_PROJECT_ID}"

gcloud builds submit \
  --config=cloudbuild.yaml \
  --substitutions="_REGION=${GCP_REGION},_AR_REPO=ge-user-portal-repo,_IMAGE_NAME=ge-user-portal,_TAG=latest" \
  --project="${GCP_PROJECT_ID}"
```

### Step 3: Create Google OAuth 2.0 Web Client & Move Credentials to GCP Secret Manager

#### 3.1 Create the OAuth 2.0 Client ID in Google Cloud Console
1. Open **Google Cloud Console -> APIs & Services -> Credentials** (`https://console.cloud.google.com/apis/credentials?project=${GCP_PROJECT_ID}`).
2. Click **+ Create Credentials -> OAuth client ID**:
   - **Application type**: `Web application`
   - **Name**: `Gemini AI Hub User Portal`
   - **Authorized JavaScript origins**:
     - `https://<YOUR_CLOUD_RUN_OR_INTERNAL_LB_DOMAIN>`
     - `http://localhost:5173`
     - `http://localhost:8080`
   - **Authorized redirect URIs**:
     - `https://<YOUR_CLOUD_RUN_OR_INTERNAL_LB_DOMAIN>/api/v1/auth/google/callback`
     - `http://localhost:5173/api/v1/auth/google/callback`
     - `http://localhost:8080/api/v1/auth/google/callback`
3. Copy the generated **Client ID** (`*.apps.googleusercontent.com`) and **Client Secret** (`GOCSPX-*`).

#### 3.2 Store OAuth Client ID, Client Secret & Session Secret in GCP Secret Manager
Store all credentials in **GCP Secret Manager** using `printf '%s'` (so no trailing newlines or smart quotes are included):

```bash
# 1. Create the Secret Manager containers
for SECRET_NAME in ge-oauth-client-id ge-oauth-client-secret ge-user-session-secret ge-user-db-url; do
  gcloud secrets describe "${SECRET_NAME}" --project="${GCP_PROJECT_ID}" >/dev/null 2>&1 || \
    gcloud secrets create "${SECRET_NAME}" --replication-policy="automatic" --project="${GCP_PROJECT_ID}"
done

# 2. Populate secret versions
printf '%s' "<YOUR_GOOGLE_OAUTH_CLIENT_ID>.apps.googleusercontent.com" | \
  gcloud secrets versions add ge-oauth-client-id --data-file=- --project="${GCP_PROJECT_ID}"

printf '%s' "<YOUR_GOOGLE_OAUTH_CLIENT_SECRET>" | \
  gcloud secrets versions add ge-oauth-client-secret --data-file=- --project="${GCP_PROJECT_ID}"

openssl rand -hex 32 | tr -d '\n' | \
  gcloud secrets versions add ge-user-session-secret --data-file=- --project="${GCP_PROJECT_ID}"

printf '%s' "postgresql+psycopg://<DB_USER>:<DB_PASSWORD>@<CLOUD_SQL_PRIVATE_IP>:5432/geapphub_user" | \
  gcloud secrets versions add ge-user-db-url --data-file=- --project="${GCP_PROJECT_ID}"

# 3. Grant the Cloud Run Web Service Account access to read the secrets
gcloud projects add-iam-policy-binding "${GCP_PROJECT_ID}" \
  --member="serviceAccount:sa-user-portal-web@${GCP_PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --condition=None
```

#### 3.3 Configure the Cloud Run Service (`ge-user-portal-web`) with Secret Manager
Deploy or update `ge-user-portal-web` so `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `SESSION_SECRET` are mounted directly from **GCP Secret Manager** via `--set-secrets`:

```bash
gcloud run deploy ge-user-portal-web \
  --image="${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/ge-user-portal-repo/ge-user-portal:latest" \
  --region="${GCP_REGION}" \
  --project="${GCP_PROJECT_ID}" \
  --service-account="sa-user-portal-web@${GCP_PROJECT_ID}.iam.gserviceaccount.com" \
  --port=8080 \
  --min-instances=1 \
  --max-instances=10 \
  --cpu=2 \
  --memory=1Gi \
  --concurrency=80 \
  --no-invoker-iam-check \
  --set-env-vars="GCP_PROJECT_ID=${GCP_PROJECT_ID},GCP_LOCATION=global,SYNC_ENABLED=false,SYNC_ON_STARTUP=false" \
  --set-secrets="GOOGLE_CLIENT_ID=ge-oauth-client-id:latest,GOOGLE_CLIENT_SECRET=ge-oauth-client-secret:latest,SESSION_SECRET=ge-user-session-secret:latest"
```

#### 3.4 Microsoft Entra ID SAML SSO Configuration (for Federated Users)
When a federated user enters their corporate email on the User Portal, Google Cloud Identity uses `login_hint` to redirect them to **Microsoft Entra ID** via Inbound SAML SSO. Verify in **Microsoft Entra Admin Center (`entra.microsoft.com`) -> Enterprise applications -> Google Cloud / G Suite Connector**:
- **Identifier (Entity ID)**: `google.com/a/<YOUR_FEDERATED_DOMAIN>`
- **Reply URL (ACS URL)**: `https://www.google.com/a/<YOUR_FEDERATED_DOMAIN>/acs`
- **Sign on URL**: `https://www.google.com/a/<YOUR_FEDERATED_DOMAIN>/ServiceLogin`
- **Unique User Identifier (Name ID)**: `user.userprincipalname` (`Email address`)
- **Users and groups**: Ensure your users or security groups are assigned to the Enterprise Application in Entra ID.

### Step 4: Provision Cloud SQL HA, Cloud Run, Sync Job & Internal ALB via Terraform
Alternatively, provision the entire infrastructure stack via [`user-portal/deploy/terraform/`](../deploy/terraform/main.tf):

```bash
cd user-portal/deploy/terraform

terraform init

terraform plan \
  -var="project_id=${GCP_PROJECT_ID}" \
  -var="region=${GCP_REGION}" \
  -var="container_image=${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/ge-user-portal-repo/ge-user-portal:latest" \
  -var="vpc_network_id=projects/${GCP_PROJECT_ID}/global/networks/<YOUR_VPC_NAME>" \
  -var="vpc_egress_subnet_id=projects/${GCP_PROJECT_ID}/regions/${GCP_REGION}/subnetworks/<YOUR_EGRESS_SUBNET>" \
  -var="ilb_subnet_id=projects/${GCP_PROJECT_ID}/regions/${GCP_REGION}/subnetworks/<YOUR_ILB_SUBNET>" \
  -var="internal_domain_name=<YOUR_INTERNAL_FQDN>" \
  -var="private_dns_zone_name=<YOUR_PRIVATE_DNS_ZONE_NAME>" \
  -var="ssl_certificate_id=projects/${GCP_PROJECT_ID}/regions/${GCP_REGION}/sslCertificates/<YOUR_SSL_CERT_NAME>"

terraform apply
```

### Step 5: Deploy & Trigger the 15-Minute Catalog & Group Sync Job
```bash
gcloud run jobs deploy ge-user-portal-sync-job \
  --image="${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/ge-user-portal-repo/ge-user-portal:latest" \
  --region="${GCP_REGION}" \
  --project="${GCP_PROJECT_ID}" \
  --service-account="sa-user-portal-sync@${GCP_PROJECT_ID}.iam.gserviceaccount.com" \
  --command="python" \
  --args="-m,app.sync_job" \
  --set-env-vars="GCP_PROJECT_ID=${GCP_PROJECT_ID},GCP_LOCATION=global"

gcloud run jobs execute ge-user-portal-sync-job \
  --region="${GCP_REGION}" \
  --project="${GCP_PROJECT_ID}" \
  --wait
```

---

## 5. Post-Deployment Verification

1. **Verify Health & Active Project Configuration**:
   ```bash
   SERVICE_URL="$(gcloud run services describe ge-user-portal-web --region="${GCP_REGION}" --project="${GCP_PROJECT_ID}" --format='value(status.url)')"
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
2. **Verify Secret Manager Binding on Cloud Run**:
   ```bash
   gcloud run services describe ge-user-portal-web \
     --region="${GCP_REGION}" \
     --project="${GCP_PROJECT_ID}" \
     --format="yaml(spec.template.spec.containers[0].env)"
   ```
   Confirm `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `SESSION_SECRET` reference `secretKeyRef`.
3. **Verify Portal Features**:
   - **GE App Hub**: Displays `APP ID`, `APP Name`, `Group`, `Location`, and `URL` for authorized apps.
   - **AGY Hub**: Visible for `Standard` and `Plus` licensed users with **Antigravity on VS Code**, **Antigravity CLI**, and **Antigravity App** quick-start guides.
   - **Request Access**: Displays ungranted applications and AGY license tiers, persisting requests into the `access_requests` table in `geapphub_user`.
