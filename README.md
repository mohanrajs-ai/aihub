# Gemini AI Hub — Repository Structure

This repository contains two physically decoupled applications with independent frontend SPAs, FastAPI backends, databases, and Docker deployments:

## 1. User Portal (`user-portal/`)
- **Frontend (`user-portal/frontend/`)**: React 18 + TypeScript + Vite SPA (Dev port `5173`) providing:
  - **GE App Hub**: Authorized Gemini Enterprise application catalog (`APP ID`, `APP Name`, `Group`, `Location`, `URL`).
  - **AGY Hub**: Antigravity on VS Code, Antigravity CLI, and Antigravity App onboarding for `Standard` and `Plus` licensed users.
  - **Request Access**: Self-service requests for ungranted applications and AGY licenses.
- **Backend (`user-portal/backend/`)**: FastAPI runtime (Port `8080`, `geapphub_user` PostgreSQL database).
- **GCP Deployment (`user-portal/deploy/` & `user-portal/docs/`)**:
  - [USER_PORTAL_GCP_DEPLOYMENT_GUIDE.md](./user-portal/docs/USER_PORTAL_GCP_DEPLOYMENT_GUIDE.md)
  - [user-portal-gcp-deployment-design.md](./user-portal/docs/user-portal-gcp-deployment-design.md)
  - [deploy_user_portal_gcp.sh](./user-portal/deploy/deploy_user_portal_gcp.sh)

## 2. Admin Portal (`admin-portal/`)
- **Frontend (`admin-portal/frontend/`)**: React 18 + TypeScript + Vite SPA (Dev port `5174`) for Skill Governance, Infrastructure Provisioning Studio, Agents, Connectors, and Sync.
- **Backend (`admin-portal/backend/`)**: FastAPI runtime (Port `8082`, `geapphub_admin` PostgreSQL database).
- **Documentation**: [SKILL_GOVERNANCE_ONE_PAGER.md](./admin-portal/docs/SKILL_GOVERNANCE_ONE_PAGER.md)
