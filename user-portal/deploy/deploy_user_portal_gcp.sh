#!/usr/bin/env bash
# ==============================================================================
# End-to-End CI/CD & Terraform Pipeline for Gemini AI Hub — User Portal
# Prerequisite: Clone the repository manually first, configure
# user-portal/deploy/config.env, and run this script from the cloned repo.
#
# Pipeline Stages (Zero GCS Bucket Dependency):
#   Stage 1: Bootstrap Google Artifact Registry (GENERIC source repo + DOCKER image repo) & IAM
#   Stage 2: Bootstrap & verify OAuth credentials secret (ge-oauth-credentials) in Cloud Secret Manager
#   Stage 3: Package & upload source code to Google Artifact Registry (GENERIC) and trigger
#            Cloud Build with --no-source (fetches code from Artifact Registry, builds & pushes image)
#   Stage 4: Provision GCP infrastructure via Terraform (using SSL_CERTIFICATE_ID & OAuth Secret)
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
AR_SOURCE_REPO="${AR_SOURCE_REPO:-ge-user-portal-source}"
SOURCE_PACKAGE="${SOURCE_PACKAGE:-user-portal-source}"
SOURCE_VERSION="${SOURCE_VERSION:-v1}"
AR_REPO="${AR_REPO:-ge-user-portal-repo}"
IMAGE_NAME="${IMAGE_NAME:-ge-user-portal}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
INTERNAL_DOMAIN_NAME="${INTERNAL_DOMAIN_NAME:-aihub.internal.corp}"

# OAuth Secret Manager ID & Regional Compute SSL Certificate ID
OAUTH_SECRET="${OAUTH_SECRET:-ge-oauth-credentials}"
SSL_CERTIFICATE_ID="${SSL_CERTIFICATE_ID:-}"

IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}/${IMAGE_NAME}:${IMAGE_TAG}"

echo "=================================================================="
echo " Gemini AI Hub — User Portal Deployment Pipeline"
echo " Source Dir        : ${PORTAL_DIR}"
echo " Project           : ${PROJECT_ID}"
echo " Region            : ${REGION}"
echo " AR Source Repo    : ${AR_SOURCE_REPO} (${SOURCE_PACKAGE}:${SOURCE_VERSION})"
echo " AR Docker Repo    : ${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}"
echo " Container Image   : ${IMAGE_URI}"
echo " OAuth Secret      : ${OAUTH_SECRET} (Client ID + Secret)"
echo " SSL Cert ID       : ${SSL_CERTIFICATE_ID:-<none (HTTP fallback)>}"
echo "=================================================================="

# ------------------------------------------------------------------------------
# Stage 1: Bootstrap GCP APIs, Google Artifact Registry (Generic + Docker) & IAM
# ------------------------------------------------------------------------------
echo "[Stage 1/4] Bootstrapping Google Artifact Registry ('${AR_SOURCE_REPO}' & '${AR_REPO}')..."
gcloud services enable \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  compute.googleapis.com \
  run.googleapis.com \
  --project="${PROJECT_ID}" \
  --quiet

# Create GENERIC Artifact Registry repository for User Portal source archives
if ! gcloud artifacts repositories describe "${AR_SOURCE_REPO}" \
  --location="${REGION}" \
  --project="${PROJECT_ID}" \
  --quiet >/dev/null 2>&1; then
  gcloud artifacts repositories create "${AR_SOURCE_REPO}" \
    --repository-format=generic \
    --location="${REGION}" \
    --description="Google Artifact Registry Generic repository for Gemini AI Hub User Portal source code" \
    --project="${PROJECT_ID}" \
    --quiet
fi

# Create DOCKER Artifact Registry repository for User Portal container images
if ! gcloud artifacts repositories describe "${AR_REPO}" \
  --location="${REGION}" \
  --project="${PROJECT_ID}" \
  --quiet >/dev/null 2>&1; then
  gcloud artifacts repositories create "${AR_REPO}" \
    --repository-format=docker \
    --location="${REGION}" \
    --description="Google Artifact Registry Docker repository for Gemini AI Hub User Portal" \
    --project="${PROJECT_ID}" \
    --quiet
fi

PROJECT_NUMBER="$(gcloud projects describe "${PROJECT_ID}" --format="value(projectNumber)" --quiet)"
for SA_EMAIL in \
  "${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  "${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"; do
  for ROLE in \
    roles/artifactregistry.reader \
    roles/artifactregistry.writer \
    roles/secretmanager.secretAccessor \
    roles/logging.logWriter \
    roles/cloudbuild.builds.builder; do
    gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
      --member="serviceAccount:${SA_EMAIL}" \
      --role="${ROLE}" --condition=None --quiet >/dev/null 2>&1 || true
  done
done

# ------------------------------------------------------------------------------
# Stage 2: Ensure OAuth Secret ('ge-oauth-credentials') Exists in Cloud Secret Manager
# ------------------------------------------------------------------------------
echo "[Stage 2/4] Configuring & verifying '${OAUTH_SECRET}' in Cloud Secret Manager..."

if ! gcloud secrets describe "${OAUTH_SECRET}" --project="${PROJECT_ID}" --quiet >/dev/null 2>&1; then
  gcloud secrets create "${OAUTH_SECRET}" \
    --replication-policy="automatic" \
    --project="${PROJECT_ID}" \
    --quiet
fi

if [[ -n "${OAUTH_JSON_FILE:-}" && -f "${OAUTH_JSON_FILE}" ]]; then
  gcloud secrets versions add "${OAUTH_SECRET}" \
    --data-file="${OAUTH_JSON_FILE}" --project="${PROJECT_ID}" --quiet
elif [[ -n "${GOOGLE_CLIENT_ID:-}" && -n "${GOOGLE_CLIENT_SECRET:-}" ]]; then
  printf '{"client_id":"%s","client_secret":"%s"}' "${GOOGLE_CLIENT_ID}" "${GOOGLE_CLIENT_SECRET}" | \
    gcloud secrets versions add "${OAUTH_SECRET}" \
      --data-file=- --project="${PROJECT_ID}" --quiet
elif ! gcloud secrets versions access latest --secret="${OAUTH_SECRET}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
  echo "ERROR: Secret '${OAUTH_SECRET}' has no version in Secret Manager. Upload your OAuth credentials JSON to '${OAUTH_SECRET}' first." >&2
  exit 1
fi

# ------------------------------------------------------------------------------
# Stage 3: Upload Source to Google Artifact Registry & Trigger Cloud Build (--no-source)
# ------------------------------------------------------------------------------
echo "[Stage 3/4] Packaging User Portal source & uploading to Google Artifact Registry '${AR_SOURCE_REPO}'..."
ARCHIVE_FILE="/tmp/user-portal-source.tgz"
trap 'rm -f "${ARCHIVE_FILE}"' EXIT
tar -czf "${ARCHIVE_FILE}" \
  --exclude="node_modules" \
  --exclude="__pycache__" \
  --exclude=".pytest_cache" \
  --exclude=".terraform" \
  -C "${PORTAL_DIR}" .

# Remove existing version if re-uploading the same SOURCE_VERSION
gcloud artifacts versions delete "${SOURCE_VERSION}" \
  --package="${SOURCE_PACKAGE}" \
  --repository="${AR_SOURCE_REPO}" \
  --location="${REGION}" \
  --project="${PROJECT_ID}" \
  --quiet >/dev/null 2>&1 || true

gcloud artifacts generic upload \
  --location="${REGION}" \
  --project="${PROJECT_ID}" \
  --repository="${AR_SOURCE_REPO}" \
  --package="${SOURCE_PACKAGE}" \
  --version="${SOURCE_VERSION}" \
  --source="${ARCHIVE_FILE}" \
  --quiet

echo "[Stage 3/4] Submitting Cloud Build (--no-source) pulling source from Google Artifact Registry..."
gcloud builds submit --no-source \
  --config="${PORTAL_DIR}/cloudbuild.yaml" \
  --substitutions="_REGION=${REGION},_AR_SOURCE_REPO=${AR_SOURCE_REPO},_SOURCE_PACKAGE=${SOURCE_PACKAGE},_SOURCE_VERSION=${SOURCE_VERSION},_AR_REPO=${AR_REPO},_IMAGE_NAME=${IMAGE_NAME},_TAG=${IMAGE_TAG},_OAUTH_SECRET=${OAUTH_SECRET},_SSL_CERTIFICATE_ID=${SSL_CERTIFICATE_ID},_INTERNAL_DOMAIN_NAME=${INTERNAL_DOMAIN_NAME},_DEPLOY_INFRA=false" \
  --project="${PROJECT_ID}" \
  --quiet

# ------------------------------------------------------------------------------
# Stage 4: Provision Infrastructure via Terraform (SSL Certificate ID & OAuth Secret)
# ------------------------------------------------------------------------------
echo "[Stage 4/4] Provisioning GCP infrastructure via Terraform (user-portal/deploy/terraform/)..."
terraform -chdir="${TF_DIR}" init

# Remove deprecated GCS source bucket from Terraform state if present from an older deployment
if terraform -chdir="${TF_DIR}" state show "google_storage_bucket.user_portal_source_bucket" >/dev/null 2>&1; then
  terraform -chdir="${TF_DIR}" state rm "google_storage_bucket.user_portal_source_bucket" >/dev/null 2>&1 || true
fi

import_if_missing() {
  local addr="$1"
  local id="$2"
  if ! terraform -chdir="${TF_DIR}" state show "${addr}" >/dev/null 2>&1; then
    terraform -chdir="${TF_DIR}" import \
      -var="project_id=${PROJECT_ID}" \
      -var="region=${REGION}" \
      -var="ar_source_repo_id=${AR_SOURCE_REPO}" \
      -var="ar_repo_id=${AR_REPO}" \
      -var="container_image=${IMAGE_URI}" \
      -var="oauth_secret_name=${OAUTH_SECRET}" \
      -var="ssl_certificate_id=${SSL_CERTIFICATE_ID}" \
      "${addr}" "${id}" >/dev/null 2>&1 || true
  fi
}

import_if_missing "google_service_account.web_sa" "projects/${PROJECT_ID}/serviceAccounts/sa-user-portal-web@${PROJECT_ID}.iam.gserviceaccount.com"
import_if_missing "google_service_account.sync_sa" "projects/${PROJECT_ID}/serviceAccounts/sa-user-portal-sync@${PROJECT_ID}.iam.gserviceaccount.com"
for SEC_ID in \
  ge-user-db-url \
  ge-user-session-secret; do
  import_if_missing "google_secret_manager_secret.secrets[\"${SEC_ID}\"]" "projects/${PROJECT_ID}/secrets/${SEC_ID}"
done
import_if_missing "google_cloud_run_v2_service.user_portal_web" "projects/${PROJECT_ID}/locations/${REGION}/services/ge-user-portal-web"
import_if_missing "google_cloud_run_v2_job.user_portal_sync_job" "projects/${PROJECT_ID}/locations/${REGION}/jobs/ge-user-portal-sync-job"
import_if_missing "google_cloud_scheduler_job.user_portal_sync_schedule" "projects/${PROJECT_ID}/locations/${REGION}/jobs/ge-user-portal-sync-every-15m"

terraform -chdir="${TF_DIR}" apply -auto-approve \
  -var="project_id=${PROJECT_ID}" \
  -var="region=${REGION}" \
  -var="ar_source_repo_id=${AR_SOURCE_REPO}" \
  -var="ar_repo_id=${AR_REPO}" \
  -var="container_image=${IMAGE_URI}" \
  -var="oauth_secret_name=${OAUTH_SECRET}" \
  -var="ssl_certificate_id=${SSL_CERTIFICATE_ID}" \
  -var="internal_domain_name=${INTERNAL_DOMAIN_NAME}"

echo "=================================================================="
echo " Deployment Pipeline Complete!"
echo "=================================================================="
terraform -chdir="${TF_DIR}" output
