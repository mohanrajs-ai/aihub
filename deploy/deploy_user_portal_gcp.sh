#!/usr/bin/env bash
# ==============================================================================
# End-to-End GCP Deployment Script for Gemini AI Hub — User Portal
# Deploys:
#   1. Required GCP APIs (Run, Cloud Build, Artifact Registry, SQL, Compute, DNS, Secret Manager, Scheduler)
#   2. Artifact Registry Repository & Container Build via Cloud Build (Dockerfile.user)
#   3. Least-Privilege Service Accounts (sa-user-portal-web, sa-user-portal-sync) & Secret Manager Secrets
#   4. Cloud SQL for PostgreSQL 16 (REGIONAL HA, Private IP, PITR) & geapphub_user DB
#   5. Cloud Run v2 Service (ge-user-portal-web) & 15-min Cloud Run Sync Job + Cloud Scheduler
#   6. Regional Internal Application Load Balancer (HTTPS) via Terraform
# ==============================================================================
set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || echo "techm-514903")}"
REGION="${GCP_REGION:-us-central1}"
AR_REPO="ge-user-portal-repo"
IMAGE_NAME="ge-user-portal"
IMAGE_TAG="${IMAGE_TAG:-latest}"
IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}/${IMAGE_NAME}:${IMAGE_TAG}"

echo "=================================================================="
echo " Deploying Gemini AI Hub — User Portal to GCP"
echo " Project : ${PROJECT_ID}"
echo " Region  : ${REGION}"
echo " Image   : ${IMAGE_URI}"
echo "=================================================================="

# 1. Enable Required Google Cloud APIs
echo "[Step 1/5] Enabling required Google Cloud APIs..."
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

# 2. Ensure Artifact Registry Repository & Cloud Build Permissions Exist
echo "[Step 2/5] Ensuring Artifact Registry repository '${AR_REPO}' and Service Accounts exist..."
if ! gcloud artifacts repositories describe "${AR_REPO}" \
  --location="${REGION}" \
  --project="${PROJECT_ID}" \
  --quiet >/dev/null 2>&1; then
  gcloud artifacts repositories create "${AR_REPO}" \
    --repository-format=docker \
    --location="${REGION}" \
    --description="Container repository for Gemini AI Hub User Portal" \
    --project="${PROJECT_ID}" \
    --quiet
fi

PROJECT_NUMBER="$(gcloud projects describe "${PROJECT_ID}" --format="value(projectNumber)" --quiet)"
CB_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
for ROLE in roles/storage.objectAdmin roles/artifactregistry.writer roles/logging.logWriter roles/cloudbuild.builds.builder; do
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${CB_SA}" \
    --role="${ROLE}" --condition=None --quiet >/dev/null
done

gcloud iam service-accounts describe "sa-user-portal-web@${PROJECT_ID}.iam.gserviceaccount.com" --project="${PROJECT_ID}" --quiet >/dev/null 2>&1 || \
  gcloud iam service-accounts create sa-user-portal-web --display-name="Gemini AI Hub User Portal Web Runtime SA" --project="${PROJECT_ID}" --quiet

gcloud iam service-accounts describe "sa-user-portal-sync@${PROJECT_ID}.iam.gserviceaccount.com" --project="${PROJECT_ID}" --quiet >/dev/null 2>&1 || \
  gcloud iam service-accounts create sa-user-portal-sync --display-name="Gemini AI Hub User Portal Catalog Sync SA" --project="${PROJECT_ID}" --quiet

# 3. Build & Push User Portal Container Image via Cloud Build
echo "[Step 3/5] Building and pushing Dockerfile.user via Cloud Build..."
gcloud builds submit \
  --config=cloudbuild.user.yaml \
  --substitutions="_REGION=${REGION},_AR_REPO=${AR_REPO},_IMAGE_NAME=${IMAGE_NAME},_TAG=${IMAGE_TAG}" \
  --project="${PROJECT_ID}" \
  --quiet

# 4. Provision Infrastructure via Terraform (or Direct Cloud Run Deployment)
if [[ -n "${VPC_NETWORK_ID:-}" && -n "${VPC_EGRESS_SUBNET_ID:-}" && -n "${ILB_SUBNET_ID:-}" && -n "${SSL_CERTIFICATE_ID:-}" ]]; then
  echo "[Step 4/5] Applying Terraform stack in deploy/terraform/user-portal/..."
  terraform -chdir=deploy/terraform/user-portal init
  terraform -chdir=deploy/terraform/user-portal apply -auto-approve \
    -var="project_id=${PROJECT_ID}" \
    -var="region=${REGION}" \
    -var="container_image=${IMAGE_URI}" \
    -var="vpc_network_id=${VPC_NETWORK_ID}" \
    -var="vpc_egress_subnet_id=${VPC_EGRESS_SUBNET_ID}" \
    -var="ilb_subnet_id=${ILB_SUBNET_ID}" \
    -var="ssl_certificate_id=${SSL_CERTIFICATE_ID}"
else
  echo "[Step 4/5] Deploying Cloud Run service 'ge-user-portal-web' and sync job 'ge-user-portal-sync-job'..."
  gcloud run deploy ge-user-portal-web \
    --image="${IMAGE_URI}" \
    --region="${REGION}" \
    --project="${PROJECT_ID}" \
    --port=8080 \
    --min-instances=1 \
    --max-instances=10 \
    --cpu=2 \
    --memory=1Gi \
    --concurrency=80 \
    --ingress=internal-and-cloud-load-balancing \
    --set-env-vars="GCP_PROJECT_ID=${PROJECT_ID},SYNC_ENABLED=false" \
    --quiet

  gcloud run jobs deploy ge-user-portal-sync-job \
    --image="${IMAGE_URI}" \
    --region="${REGION}" \
    --project="${PROJECT_ID}" \
    --command="python" \
    --args="-m,app.sync_job" \
    --set-env-vars="GCP_PROJECT_ID=${PROJECT_ID}" \
    --quiet
fi

echo "[Step 5/5] Deployment complete!"
gcloud run services describe ge-user-portal-web \
  --region="${REGION}" \
  --project="${PROJECT_ID}" \
  --format="value(status.url)"
