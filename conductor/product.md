# Product Definition: Gemini Enterprise AI Hub Portal (`aihub`)

## 1. Vision & Overview
**`aihub`** provides physically decoupled frontend, backend, and database environments for Google Cloud Gemini Enterprise (Discovery Engine):
1. **Standalone User Portal (`frontend-user/` + `backend-user/` + `geapphub_user` DB, Port 8080 / Dev 5173)**: Isolated end-user discovery frontend, backend, and database (`postgres-user` / `geapphub_user.db`) with zero administrative code, Terraform provisioning tables, or sync triggers.
2. **Standalone Admin Console (`frontend-admin/` + `backend-admin/` + `geapphub_admin` DB, Port 8082 / Dev 5174)**: Isolated administrative control plane frontend, backend, and database (`postgres-admin` / `geapphub_admin.db`) deployable behind restricted corporate networks and IAP perimeters.

## 2. Core Capabilities
1. **User Portal (`frontend-user/` + `backend-user/` + `geapphub_user` DB):**
   - End-user discovery hub for Gemini Enterprise applications with Cloud Identity group filtering and popup launching.
   - Self-service AI Skill Registry, specialized Google ADK Agent directory, and MCP data connectors.
   - Physically isolated frontend bundle, FastAPI backend (`backend-user/`), and dedicated database (`geapphub_user`) omitting administrative Terraform provisioning tables (`provisioning_jobs`), sync trigger routes, and InfoSec approval routes.
2. **Admin Console (`frontend-admin/` + `backend-admin/` + `geapphub_admin` DB):**
   - Centralized security and operations plane for IT administrators, SecOps, and platform architects.
   - 6-Stage AI Skill Governance Studio with human-in-the-loop InfoSec approval and distribution controls.
   - Terraform Infrastructure Provisioning Studio (GE App, Identity/WIF, M365 Connectors) with state locking and execution monitoring persisted in `geapphub_admin`.
   - On-demand and scheduled Discovery Engine & Cloud Identity sync operations and access verification.
