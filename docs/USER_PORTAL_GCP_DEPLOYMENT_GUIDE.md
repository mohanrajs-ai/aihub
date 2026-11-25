# GCP Production Deployment Guide: Gemini AI Hub — User Portal

This step-by-step deployment guide walks through deploying the standalone **Gemini AI Hub — User Portal** (`frontend-user/` + `backend-user/` + `geapphub_user` PostgreSQL database) to Google Cloud Platform.

---

## Live Deployment Summary (`cymbal-app-514110`)

| Resource | Deployed Identifier / Endpoint |
| :--- | :--- |
| **GCP Project** | `cymbal-app-514110` (`457338748091`) |
| **Region** | `us-central1` |
| **Artifact Registry Repo** | `us-central1-docker.pkg.dev/cymbal-app-514110/ge-user-portal-repo` |
| **Container Image** | `us-central1-docker.pkg.dev/cymbal-app-514110/ge-user-portal-repo/ge-user-portal:latest` |
| **Cloud Run Service** | `ge-user-portal-web` (`ge-user-portal-web-00004`) |
| **Live Service URL** | `https://ge-user-portal-web-457338748091.us-central1.run.app` |
| **Cloud Run Sync Job** | `ge-user-portal-sync-job` (`python -m app.sync_job`) |
| **Cloud Scheduler Cron** | `ge-user-portal-sync-every-15m` (`*/15 * * * *`) |
| **Web Runtime SA** | `sa-user-portal-web@cymbal-app-514110.iam.gserviceaccount.com` |
| **Catalog Sync SA** | `sa-user-portal-sync@cymbal-app-514110.iam.gserviceaccount.com` |
| **Secret Manager Secrets** | `ge-oauth-client-id`, `ge-oauth-client-secret`, `ge-user-session-secret`, `ge-user-db-url` |

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

### Step 3: Create Google OAuth 2.0 Web Client & Store Credentials in GCP Secret Manager

#### 3.1 Create the OAuth 2.0 Client ID in Google Cloud Console
1. Open **Google Cloud Console -> APIs & Services -> Credentials** (`https://console.cloud.google.com/apis/credentials?project=${PROJECT_ID}`).
2. Click **+ Create Credentials -> OAuth client ID**:
   - **Application type**: `Web application`
   - **Name**: `Gemini AI Hub User Portal`
   - **Authorized JavaScript origins**:
     - `https://ge-user-portal-web-457338748091.us-central1.run.app`
     - `https://aihub.internal.techmahindra.com`
     - `http://localhost:5173`
     - `http://localhost:8080`
   - **Authorized redirect URIs**:
     - `https://ge-user-portal-web-457338748091.us-central1.run.app/api/v1/auth/google/callback`
     - `https://aihub.internal.techmahindra.com/api/v1/auth/google/callback`
     - `http://localhost:5173/api/v1/auth/google/callback`
     - `http://localhost:8080/api/v1/auth/google/callback`
3. Copy the generated **Client ID** (`*.apps.googleusercontent.com`) and **Client Secret** (`GOCSPX-*`).

#### 3.2 Store OAuth Client ID, Client Secret & Session Secret in GCP Secret Manager
Never pass `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET` as plain-text Cloud Run environment variables. Store them in **GCP Secret Manager** using `printf '%s'` (to avoid trailing newlines or smart quotes):

```bash
export PROJECT_ID="cymbal-app-514110"
export REGION="us-central1"

# 1. Create the Secret Manager containers (if not already created by Terraform)
for SECRET_NAME in ge-oauth-client-id ge-oauth-client-secret ge-user-session-secret ge-user-db-url; do
  gcloud secrets describe "${SECRET_NAME}" --project="${PROJECT_ID}" >/dev/null 2>&1 || \
    gcloud secrets create "${SECRET_NAME}" --replication-policy="automatic" --project="${PROJECT_ID}"
done

# 2. Add secret versions (use printf '%s' so no trailing newline or curly quote is stored)
printf '%s' "<YOUR_GOOGLE_OAUTH_CLIENT_ID>.apps.googleusercontent.com" | \
  gcloud secrets versions add ge-oauth-client-id --data-file=- --project="${PROJECT_ID}"

printf '%s' "<YOUR_GOOGLE_OAUTH_CLIENT_SECRET>" | \
  gcloud secrets versions add ge-oauth-client-secret --data-file=- --project="${PROJECT_ID}"

openssl rand -hex 32 | tr -d '\n' | \
  gcloud secrets versions add ge-user-session-secret --data-file=- --project="${PROJECT_ID}"

printf '%s' "postgresql+psycopg://appuser:STRONG_PASS@<CLOUD_SQL_PRIVATE_IP>:5432/geapphub_user" | \
  gcloud secrets versions add ge-user-db-url --data-file=- --project="${PROJECT_ID}"

# 3. Grant the Cloud Run Web Service Account access to read the secrets
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:sa-user-portal-web@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --condition=None
```

#### 3.3 Configure Cloud Run Service (`ge-user-portal-web`) to Mount Secrets from Secret Manager
Bind the secrets directly into the Cloud Run service using `--set-secrets` (removing any legacy plain-text env vars if present):

```bash
gcloud run services update ge-user-portal-web \
  --region="${REGION}" \
  --project="${PROJECT_ID}" \
  --remove-env-vars="GOOGLE_CLIENT_ID,GOOGLE_CLIENT_SECRET,SESSION_SECRET" \
  --set-secrets="GOOGLE_CLIENT_ID=ge-oauth-client-id:latest,GOOGLE_CLIENT_SECRET=ge-oauth-client-secret:latest,SESSION_SECRET=ge-user-session-secret:latest"
```

#### 3.4 Microsoft Entra ID SAML SSO Configuration (for Federated Users)
When a federated user (e.g., `pradeepg@mohanrajs.demo.altostrat.com`) enters their email on the User Portal, Google Cloud Identity uses `login_hint` to redirect them to **Microsoft Entra ID** via Inbound SAML SSO. Verify in **Microsoft Entra Admin Center (`entra.microsoft.com`) -> Enterprise applications -> Google Cloud / G Suite Connector**:
- **Identifier (Entity ID)**: `google.com/a/mohanrajs.demo.altostrat.com`
- **Reply URL (ACS URL)**: `https://www.google.com/a/mohanrajs.demo.altostrat.com/acs`
- **Sign on URL**: `https://www.google.com/a/mohanrajs.demo.altostrat.com/ServiceLogin`
- **Unique User Identifier (Name ID)**: `user.userprincipalname` (`Email address`)
- **Users and groups**: Ensure `pradeepg@mohanrajs.demo.altostrat.com` (or `ge-service-desk-users` / `ge-finance-users`) is assigned to the Enterprise Application.

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
