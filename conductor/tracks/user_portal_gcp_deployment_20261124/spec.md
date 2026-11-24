# Specification: User Portal GCP Production Deployment

## 1. Overview
Defines and implements the production Google Cloud Platform (GCP) deployment stack for the standalone **Gemini AI Hub — User Portal** (`frontend-user/` + `backend-user/` + `geapphub_user` database) in `us-central1`.

## 2. Architecture Requirements
- **AR-1 (Cloud Run Web Service)**: Deploy `Dockerfile.user` as a single Cloud Run v2 service (`ge-user-portal-web`) with `min_instance_count=1`, `max_instance_count=10`, `2 vCPU / 1 GiB RAM`, `concurrency=80`, Direct VPC Egress, and `INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER`.
- **AR-2 (Internal Application Load Balancer & Private DNS/TLS)**: Expose the User Portal exclusively on an internal RFC 1918 IP via a Regional Internal Application Load Balancer (`INTERNAL_MANAGED`) backed by a Serverless NEG, Private CAS TLS certificate, and Cloud DNS Private Zone.
- **AR-3 (Cloud SQL PostgreSQL 16 HA)**: Provision a dedicated `geapphub_user` PostgreSQL 16 instance (`REGIONAL` 2-zone HA in `us-central1`, `db-custom-2-8192`, PITR enabled, Private IP only).
- **AR-4 (PostgreSQL `access_requests` Table)**: Persist all application access and AGY license requests in a dedicated `access_requests` table (`AccessRequestRecord`) in `geapphub_user`.
- **AR-5 (Scheduled Cloud Run Sync Job)**: Provision a Cloud Run v2 Job (`ge-user-portal-sync-job`, entrypoint `python -m app.sync_job`) triggered every 15 minutes by Cloud Scheduler to sync Discovery Engine applications and Cloud Identity groups into `geapphub_user`.
- **AR-6 (IAM Least-Privilege & Secret Manager)**: Separate identities into `sa-user-portal-web` and `sa-user-portal-sync` and inject `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `SESSION_SECRET` from GCP Secret Manager.
- **AR-7 (CI/CD & Terraform)**: Provide `cloudbuild.user.yaml` and the Terraform stack under `deploy/terraform/user-portal/`.
