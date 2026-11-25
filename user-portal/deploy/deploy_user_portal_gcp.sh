#!/usr/bin/env bash
# ==============================================================================
# Automated GCP Deployment Script for Gemini AI Hub — User Portal
# Prerequisite: Clone the repository manually first, configure
# user-portal/deploy/config.env, and run this script from the cloned repo.
# Automates:
#   1. Syncing User Portal source to GCS & building container image via Cloud Build
#   2. Terraform provisioning (user-portal/deploy/terraform/):
#      - GCP APIs, VPC, Subnets, Proxy-Only Subnet & Private Services Access
#      - Cloud SQL for PostgreSQL 16 (REGIONAL HA, Private IP, PITR)
#      - GCP Secret Manager secrets & versions (OAuth Client ID/Secret, Session Secret, DB URL)
#      - Cloud Run v2 Service (ge-user-portal-web) & 15-min Sync Job + Cloud Scheduler
#      - Regional Internal Application Load Balancer (SSL Certificate & DNS are configured manually)
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORTAL_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
TF_DIR="${PORTAL_DIR}/deploy/terraform"

if [[ -f "${SCRIPT_DIR}/config.env" ]]; then
  echo "Loading deployment configuration from ${SCRIPT_DIR}/config.env..."
  # shellcheck disable=SC1091
  source "${SCRIPT_DIR}/config.env"
fi

: "${GCP_PROJECT_ID:?ERROR: GCP_PROJECT_ID must be set in user-portal/deploy/config.env or environment (e.g., export GCP_PROJECT_ID=<your-gcp-project-id>)}"
PROJECT_ID="${GCP_PROJECT_ID}"
REGION="${GCP_REGION:-us-central1}"
GCS_SOURCE_BUCKET="${GCS_SOURCE_BUCKET:-${PROJECT_ID}-user-portal-source}"
AR_REPO="${AR_REPO:-ge-user-portal-repo}"
IMAGE_NAME="${IMAGE_NAME:-ge-user-portal}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
SSL_CERTIFICATE_ID="${SSL_CERTIFICATE_ID:-}"
IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}/${IMAGE_NAME}:${IMAGE_TAG}"

echo "=================================================================="
echo " Deploying Gemini AI Hub — User Portal to GCP"
echo " Source Dir      : ${PORTAL_DIR}"
echo " GCS Source Bkt  : gs://${GCS_SOURCE_BUCKET}"
echo " Project         : ${PROJECT_ID}"
echo " Region          : ${REGION}"
echo " Image           : ${IMAGE_URI}"
echo "=================================================================="

# 1. Bootstrap Cloud Build, Cloud Storage & Artifact Registry
echo "[Step 1/3] Bootstrapping GCS Source Bucket 'gs://${GCS_SOURCE_BUCKET}' & Artifact Registry '${AR_REPO}'..."
gcloud services enable \
  storage.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  --project="${PROJECT_ID}" \
  --quiet

if ! gcloud storage buckets describe "gs://${GCS_SOURCE_BUCKET}" \
  --project="${PROJECT_ID}" \
  --quiet >/dev/null 2>&1; then
  gcloud storage buckets create "gs://${GCS_SOURCE_BUCKET}" \
    --location="${REGION}" \
    --uniform-bucket-level-access \
    --project="${PROJECT_ID}" \
    --quiet
fi

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

# 2. Sync Source Code to GCS & Submit Cloud Build from GCS Archive
echo "[Step 2/3] Syncing User Portal source to gs://${GCS_SOURCE_BUCKET}/src/ and building image from GCS..."
gcloud storage rsync -r --delete-unmatched-destination-objects \
  --exclude='(\.git|node_modules|__pycache__|\.pytest_cache|dist|\.terraform).*' \
  "${PORTAL_DIR}" "gs://${GCS_SOURCE_BUCKET}/src" \
  --project="${PROJECT_ID}" \
  --quiet

ARCHIVE_FILE="$(mktemp /tmp/user-portal-source.XXXXXX.tgz)"
trap 'rm -f "${ARCHIVE_FILE}"' EXIT
tar -czf "${ARCHIVE_FILE}" \
  --exclude="node_modules" \
  --exclude="__pycache__" \
  --exclude=".pytest_cache" \
  --exclude=".terraform" \
  -C "${PORTAL_DIR}" .

gcloud storage cp "${ARCHIVE_FILE}" "gs://${GCS_SOURCE_BUCKET}/archives/user-portal-${IMAGE_TAG}.tgz" \
  --project="${PROJECT_ID}" \
  --quiet

gcloud builds submit "gs://${GCS_SOURCE_BUCKET}/archives/user-portal-${IMAGE_TAG}.tgz" \
  --config="${PORTAL_DIR}/cloudbuild.yaml" \
  --gcs-source-staging-dir="gs://${GCS_SOURCE_BUCKET}/staging" \
  --substitutions="_REGION=${REGION},_AR_REPO=${AR_REPO},_IMAGE_NAME=${IMAGE_NAME},_TAG=${IMAGE_TAG}" \
  --project="${PROJECT_ID}" \
  --quiet

# 3. Provision Infrastructure via Terraform (SSL Certificate & DNS are configured manually)
echo "[Step 3/3] Provisioning GCP stack via Terraform (user-portal/deploy/terraform/)..."
terraform -chdir="${TF_DIR}" init

import_if_missing() {
  local addr="$1"
  local id="$2"
  if ! terraform -chdir="${TF_DIR}" state show "${addr}" >/dev/null 2>&1; then
    terraform -chdir="${TF_DIR}" import \
      -var="project_id=${PROJECT_ID}" \
      -var="region=${REGION}" \
      -var="container_image=${IMAGE_URI}" \
      "${addr}" "${id}" >/dev/null 2>&1 || true
  fi
}

import_if_missing "google_storage_bucket.user_portal_source_bucket" "${GCS_SOURCE_BUCKET}"
import_if_missing "google_artifact_registry_repository.user_portal_repo" "projects/${PROJECT_ID}/locations/${REGION}/repositories/${AR_REPO}"
import_if_missing "google_service_account.web_sa" "projects/${PROJECT_ID}/serviceAccounts/sa-user-portal-web@${PROJECT_ID}.iam.gserviceaccount.com"
import_if_missing "google_service_account.sync_sa" "projects/${PROJECT_ID}/serviceAccounts/sa-user-portal-sync@${PROJECT_ID}.iam.gserviceaccount.com"
for SEC_ID in ge-user-db-url ge-oauth-client-id ge-oauth-client-secret ge-user-session-secret; do
  import_if_missing "google_secret_manager_secret.secrets[\"${SEC_ID}\"]" "projects/${PROJECT_ID}/secrets/${SEC_ID}"
done
import_if_missing "google_cloud_run_v2_service.user_portal_web" "projects/${PROJECT_ID}/locations/${REGION}/services/ge-user-portal-web"
import_if_missing "google_cloud_run_v2_job.user_portal_sync_job" "projects/${PROJECT_ID}/locations/${REGION}/jobs/ge-user-portal-sync-job"
import_if_missing "google_cloud_scheduler_job.user_portal_sync_schedule" "projects/${PROJECT_ID}/locations/${REGION}/jobs/ge-user-portal-sync-every-15m"

terraform -chdir="${TF_DIR}" apply -auto-approve \
  -var="project_id=${PROJECT_ID}" \
  -var="region=${REGION}" \
  -var="container_image=${IMAGE_URI}" \
  -var="google_client_id=${GOOGLE_CLIENT_ID:-}" \
  -var="google_client_secret=${GOOGLE_CLIENT_SECRET:-}" \
  -var="ssl_certificate_id=${SSL_CERTIFICATE_ID}"

echo "=================================================================="
echo " Terraform Deployment Complete! Configure SSL & DNS Manually Next."
echo "=================================================================="
terraform -chdir="${TF_DIR}" output
