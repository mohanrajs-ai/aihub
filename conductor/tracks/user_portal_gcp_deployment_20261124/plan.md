# Implementation Plan: User Portal GCP Production Deployment

## Phase 1: Database Persistence for Access Requests & Standalone Sync Job Entrypoint
- [x] Task: Add `AccessRequestRecord` (`access_requests` table) to `backend-user/app/db_models.py`
- [x] Task: Persist `GET /api/v1/apps/access-requests` and `POST /api/v1/apps/access-requests` in PostgreSQL/SQLite via SQLAlchemy session
- [x] Task: Create `backend-user/app/sync_job.py` CLI entrypoint (`python -m app.sync_job`) for the 15-minute Cloud Run Sync Job

## Phase 2: Terraform Stack & Cloud Build Pipeline for GCP Deployment
- [x] Task: Create `cloudbuild.user.yaml` building `Dockerfile.user` and pushing to Artifact Registry
- [x] Task: Create Terraform stack in `deploy/terraform/user-portal/` (`versions.tf`, `variables.tf`, `main.tf`, `outputs.tf`) for Cloud SQL HA, Secret Manager, Service Accounts, Cloud Run Service, Cloud Run Sync Job, Cloud Scheduler, and Internal ALB

## Phase 3: Verification & Conductor Synchronization
- [x] Task: Write unit tests in `backend-user/tests/test_portal_deployments.py` verifying DB persistence of `access_requests`, `sync_job.py` execution, and Terraform/Cloud Build manifests
- [x] Task: Update `conductor/tracks.md` and `conductor/tech-stack.md`
