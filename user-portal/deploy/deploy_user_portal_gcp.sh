#!/usr/bin/env bash
# ==============================================================================
# End-to-End GCP Deployment Script for Gemini AI Hub — User Portal
# Requires GCP_PROJECT_ID to be explicitly set by the user (no hardcoded values).
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORTAL_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

: "${GCP_PROJECT_ID:?ERROR: GCP_PROJECT_ID must be set (e.g., export GCP_PROJECT_ID=<your-gcp-project-id>)}"
PROJECT_ID="${GCP_PROJECT_ID}"
REGION="${GCP_REGION:-us-central1}"
AR_REPO="${AR_REPO:-ge-user-portal-repo}"
IMAGE_NAME="${IMAGE_NAME:-ge-user-portal}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}/${IMAGE_NAME}:${IMAGE_TAG}"

echo "=================================================================="
echo " Deploying Gemini AI Hub — User Portal to GCP"
echo " Source Dir : ${PORTAL_DIR}"
echo " Project    : ${PROJECT_ID}"
echo " Region     : ${REGION}"
echo " Image      : ${IMAGE_URI}"
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
  --project="${PROJECT_ID}" \
  --quiet

# 2. Ensure Artifact Registry Repository & Service Accounts Exist
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
echo "[Step 3/5] Building and pushing user-portal/Dockerfile via Cloud Build..."
cd "${PORTAL_DIR}"
gcloud builds submit \
  --config=cloudbuild.yaml \
  --substitutions="_REGION=${REGION},_AR_REPO=${AR_REPO},_IMAGE_NAME=${IMAGE_NAME},_TAG=${IMAGE_TAG}" \
  --project="${PROJECT_ID}" \
  --quiet

# 4. Provision Infrastructure via Terraform (or Direct Cloud Run + Secret Manager Deployment)
if [[ -n "${VPC_NETWORK_ID:-}" && -n "${VPC_EGRESS_SUBNET_ID:-}" && -n "${ILB_SUBNET_ID:-}" && -n "${SSL_CERTIFICATE_ID:-}" && -n "${INTERNAL_DOMAIN_NAME:-}" && -n "${PRIVATE_DNS_ZONE_NAME:-}" ]]; then
  echo "[Step 4/5] Applying Terraform stack in user-portal/deploy/terraform/..."
  terraform -chdir="${PORTAL_DIR}/deploy/terraform" init
  terraform -chdir="${PORTAL_DIR}/deploy/terraform" apply -auto-approve \
    -var="project_id=${PROJECT_ID}" \
    -var="region=${REGION}" \
    -var="container_image=${IMAGE_URI}" \
    -var="vpc_network_id=${VPC_NETWORK_ID}" \
    -var="vpc_egress_subnet_id=${VPC_EGRESS_SUBNET_ID}" \
    -var="ilb_subnet_id=${ILB_SUBNET_ID}" \
    -var="internal_domain_name=${INTERNAL_DOMAIN_NAME}" \
    -var="private_dns_zone_name=${PRIVATE_DNS_ZONE_NAME}" \
    -var="ssl_certificate_id=${SSL_CERTIFICATE_ID}"
else
  echo "[Step 4/5] Ensuring Secret Manager secrets and deploying Cloud Run service 'ge-user-portal-web' & sync job 'ge-user-portal-sync-job'..."
  for SECRET_NAME in ge-oauth-client-id ge-oauth-client-secret ge-user-session-secret; do
    gcloud secrets describe "${SECRET_NAME}" --project="${PROJECT_ID}" --quiet >/dev/null 2>&1 || \
      gcloud secrets create "${SECRET_NAME}" --replication-policy="automatic" --project="${PROJECT_ID}" --quiet
  done

  if [[ -n "${GOOGLE_CLIENT_ID:-}" ]]; then
    printf '%s' "${GOOGLE_CLIENT_ID}" | gcloud secrets versions add ge-oauth-client-id --data-file=- --project="${PROJECT_ID}" --quiet
  fi
  if [[ -n "${GOOGLE_CLIENT_SECRET:-}" ]]; then
    printf '%s' "${GOOGLE_CLIENT_SECRET}" | gcloud secrets versions add ge-oauth-client-secret --data-file=- --project="${PROJECT_ID}" --quiet
  fi
  if ! gcloud secrets versions list ge-user-session-secret --project="${PROJECT_ID}" --limit=1 --format="value(name)" --quiet 2>/dev/null | grep -q .; then
    openssl rand -hex 32 | tr -d '\n' | gcloud secrets versions add ge-user-session-secret --data-file=- --project="${PROJECT_ID}" --quiet
  fi

  gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:sa-user-portal-web@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor" \
    --condition=None --quiet >/dev/null

  gcloud run deploy ge-user-portal-web \
    --image="${IMAGE_URI}" \
    --region="${REGION}" \
    --project="${PROJECT_ID}" \
    --service-account="sa-user-portal-web@${PROJECT_ID}.iam.gserviceaccount.com" \
    --port=8080 \
    --min-instances=1 \
    --max-instances=10 \
    --cpu=2 \
    --memory=1Gi \
    --concurrency=80 \
    --no-invoker-iam-check \
    --set-env-vars="GCP_PROJECT_ID=${PROJECT_ID},GCP_LOCATION=global,SYNC_ENABLED=false,SYNC_ON_STARTUP=false" \
    --set-secrets="GOOGLE_CLIENT_ID=ge-oauth-client-id:latest,GOOGLE_CLIENT_SECRET=ge-oauth-client-secret:latest,SESSION_SECRET=ge-user-session-secret:latest" \
    --quiet

  gcloud run jobs deploy ge-user-portal-sync-job \
    --image="${IMAGE_URI}" \
    --region="${REGION}" \
    --project="${PROJECT_ID}" \
    --service-account="sa-user-portal-sync@${PROJECT_ID}.iam.gserviceaccount.com" \
    --command="python" \
    --args="-m,app.sync_job" \
    --set-env-vars="GCP_PROJECT_ID=${PROJECT_ID},GCP_LOCATION=global" \
    --quiet
fi

echo "[Step 5/5] Deployment complete!"
gcloud run services describe ge-user-portal-web \
  --region="${REGION}" \
  --project="${PROJECT_ID}" \
  --format="value(status.url)" \
  --quiet
