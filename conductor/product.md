# Product Definition: Gemini Enterprise AI Hub Portal (`aihub`)

## 1. Vision & Overview
**`aihub`** provides physically decoupled frontend and backend codebases and two independent deployments for Google Cloud Gemini Enterprise (Discovery Engine):
1. **Standalone User Portal (`frontend-user/` + `backend-user/`, Port 8080 / Dev 5173)**: Isolated end-user discovery frontend and backend with zero administrative code, Terraform provisioning scripts, or sync triggers.
2. **Standalone Admin Console (`frontend-admin/` + `backend-admin/`, Port 8082 / Dev 5174)**: Isolated administrative control plane frontend and backend deployable behind restricted corporate networks and IAP perimeters.

## 2. Core Capabilities
1. **User Portal (`frontend-user/` + `backend-user/`):**
   - End-user discovery hub for Gemini Enterprise applications with Cloud Identity group filtering and popup launching.
   - Self-service AI Skill Registry, specialized Google ADK Agent directory, and MCP data connectors.
   - Physically isolated frontend bundle and FastAPI backend (`backend-user/`) omitting administrative Terraform provisioning, sync trigger, and InfoSec approval routes.
2. **Admin Console (`frontend-admin/` + `backend-admin/`):**
   - Centralized security and operations plane for IT administrators, SecOps, and platform architects.
   - 6-Stage AI Skill Governance Studio with human-in-the-loop InfoSec approval and distribution controls.
   - Terraform Infrastructure Provisioning Studio (GE App, Identity/WIF, M365 Connectors) with state locking and execution monitoring.
   - On-demand and scheduled Discovery Engine & Cloud Identity sync operations and access verification.
