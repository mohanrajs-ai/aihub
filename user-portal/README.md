# Gemini AI Hub — User Portal (`user-portal/`)

Standalone employee-facing discovery portal for Gemini Enterprise applications, Antigravity (AGY) onboarding, and self-service access requests.

## Quick Links
- **GCP Deployment Guide**: [docs/USER_PORTAL_GCP_DEPLOYMENT_GUIDE.md](./docs/USER_PORTAL_GCP_DEPLOYMENT_GUIDE.md)
- **GCP Architecture Design**: [docs/user-portal-gcp-deployment-design.md](./docs/user-portal-gcp-deployment-design.md)
- **Automated Deployment Script**: [deploy/deploy_user_portal_gcp.sh](./deploy/deploy_user_portal_gcp.sh)

## Local Development

```bash
export GCP_PROJECT_ID="<YOUR_GCP_PROJECT_ID>"

# Start Backend (Port 8080)
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8080

# Start Frontend (Port 5173)
cd ../frontend
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```
