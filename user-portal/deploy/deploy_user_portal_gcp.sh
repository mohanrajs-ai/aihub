#!/usr/bin/env bash
# ==============================================================================
# Fully Automated GCP Deployment Script for Gemini AI Hub — User Portal
# Prerequisite: Clone the GitHub repository manually first, configure
# user-portal/deploy/config.env, and run this script from the cloned repo.
# Automates:
#   1. Container build & push via Cloud Build (user-portal/cloudbuild.yaml)
#   2. Full Terraform provisioning (user-portal/deploy/terraform/):
#      - GCP APIs, VPC, Subnets, Proxy-Only Subnet & Private Services Access
#      - Automated CAS Private CA & Regional Certificate Manager TLS Certificate
#      - Automated Cloud DNS Private Managed Zone & A Record
#      - Cloud SQL for PostgreSQL 16 (REGIONAL HA, Private IP, PITR)
#      - GCP Secret Manager secrets & versions (OAuth Client ID/Secret, Session Secret, DB URL)
#      - Cloud Run v2 Service (ge-user-portal-web) & 15-min Sync Job + Cloud Scheduler
#      - Regional Internal HTTPS Application Load Balancer & GitHub Cloud Build Trigger
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORTAL_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

if [[ -f "${SCRIPT_DIR}/config.env" ]]; then
  echo "Loading deployment configuration from ${SCRIPT_DIR}/config.env..."
  # shellcheck disable=SC1091
  source "${SCRIPT_DIR}/config.env"
fi

: "${GCP_PROJECT_ID:?ERROR: GCP_PROJECT_ID must be set in user-portal/deploy/config.env or environment (e.g., export GCP_PROJECT_ID=<your-gcp-project-id>)}"
PROJECT_ID="${GCP_PROJECT_ID}"
REGION="${GCP_REGION:-us-central1}"
AR_REPO="${AR_REPO:-ge-user-portal-repo}"
IMAGE_NAME="${IMAGE_NAME:-ge-user-portal}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
GITHUB_REPO_URL="${GITHUB_REPO_URL:-}"
GITHUB_REPO_OWNER="${GITHUB_REPO_OWNER:-}"
GITHUB_REPO_NAME="${GITHUB_REPO_NAME:-}"
GITHUB_BRANCH="${GITHUB_BRANCH:-main}"
INTERNAL_DOMAIN_NAME="${INTERNAL_DOMAIN_NAME:-aihub.internal.corp}"
IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}/${IMAGE_NAME}:${IMAGE_TAG}"

echo "=================================================================="
echo " Deploying Gemini AI Hub — User Portal to GCP (100% Automated)"
echo " Source Dir      : ${PORTAL_DIR}"
echo " GitHub Repo     : ${GITHUB_REPO_URL:-<not set>}"
echo " Project         : ${PROJECT_ID}"
echo " Region          : ${REGION}"
echo " Internal Domain : ${INTERNAL_DOMAIN_NAME}"
echo " Image           : ${IMAGE_URI}"
echo "=================================================================="

# 1. Bootstrap Cloud Build & Artifact Registry APIs + Repository for Container Build
echo "[Step 1/3] Bootstrapping Cloud Build & Artifact Registry '${AR_REPO}'..."
gcloud services enable \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  --project="${PROJECT_ID}" \
  --quiet

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

# 2. Build & Push User Portal Container Image via Cloud Build
echo "[Step 2/3] Building and pushing User Portal container image via Cloud Build..."
cd "${PORTAL_DIR}"
gcloud builds submit \
  --config=cloudbuild.yaml \
  --substitutions="_REGION=${REGION},_AR_REPO=${AR_REPO},_IMAGE_NAME=${IMAGE_NAME},_TAG=${IMAGE_TAG}" \
  --project="${PROJECT_ID}" \
  --quiet

# 3. Provision Complete Infrastructure via Terraform (Zero Manual Steps for SSL, DNS, VPC, DB, Secrets, Run)
echo "[Step 3/3] Provisioning complete GCP stack via Terraform (user-portal/deploy/terraform/)..."
terraform -chdir="${PORTAL_DIR}/deploy/terraform" init
terraform -chdir="${PORTAL_DIR}/deploy/terraform" apply -auto-approve \
  -var="project_id=${PROJECT_ID}" \
  -var="region=${REGION}" \
  -var="container_image=${IMAGE_URI}" \
  -var="google_client_id=${GOOGLE_CLIENT_ID:-}" \
  -var="google_client_secret=${GOOGLE_CLIENT_SECRET:-}" \
  -var="internal_domain_name=${INTERNAL_DOMAIN_NAME}" \
  -var="github_repo_url=${GITHUB_REPO_URL}" \
  -var="github_repo_owner=${GITHUB_REPO_OWNER}" \
  -var="github_repo_name=${GITHUB_REPO_NAME}" \
  -var="github_branch=${GITHUB_BRANCH}"

echo "=================================================================="
echo " Deployment Complete!"
echo "=================================================================="
terraform -chdir="${PORTAL_DIR}/deploy/terraform" output
