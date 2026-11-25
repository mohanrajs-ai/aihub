# Gemini AI Hub — Admin Portal (`admin-portal/`)

Standalone administrative control plane for 6-Stage AI Skill Governance, Terraform Infrastructure Provisioning Studio, Agents, MCP Connectors, and Cloud Identity Sync.

## Local Development

```bash
export GCP_PROJECT_ID="<YOUR_GCP_PROJECT_ID>"

# Start Backend (Port 8082)
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8082

# Start Frontend (Port 5174)
cd ../frontend
npm install
npm run dev -- --host 0.0.0.0 --port 5174
```
