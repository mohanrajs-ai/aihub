# Product Definition: Gemini Enterprise AI Hub Portal (`aihub`)

## 1. Vision & Overview
**`aihub`** provides physically decoupled codebases and independent deployments for Google Cloud Gemini Enterprise (Discovery Engine):
1. **Standalone User Portal (`frontend-user/` + `backend/app/user_main.py`, Port 8080 / Dev 5173)**: Isolated end-user discovery application with zero administrative code or provisioning surfaces.
2. **Standalone Admin Console (`frontend-admin/` + `backend/app/admin_main.py`, Port 8082 / Dev 5174)**: Isolated administrative control plane and security governance application deployable behind restricted corporate networks and IAP perimeters.

## 2. Core Capabilities
1. **User Portal (`frontend-user/` & `app.user_main:app`):**
   - End-user discovery hub for Gemini Enterprise applications with Cloud Identity group filtering and popup launching.
   - Self-service AI Skill Registry, specialized Google ADK Agent directory, and MCP data connectors.
   - Physically isolated bundle and API entrypoint omitting administrative Terraform provisioning and sync trigger routes.
2. **Admin Console (`frontend-admin/` & `app.admin_main:app`):**
   - Centralized security and operations plane for IT administrators, SecOps, and platform architects.
   - 6-Stage AI Skill Governance Studio with human-in-the-loop InfoSec approval and distribution controls.
   - Terraform Infrastructure Provisioning Studio (GE App, Identity/WIF, M365 Connectors) with state locking and execution monitoring.
   - On-demand and scheduled Discovery Engine & Cloud Identity sync operations and access verification.
