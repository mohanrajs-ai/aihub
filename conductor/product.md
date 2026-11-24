# Product Definition: Gemini Enterprise AI Hub Portal (`aihub`)

## 1. Vision & Overview
**`aihub`** is the Dual-System RBAC Web UI (`frontend/`) and FastAPI Control Plane & Skill Workflow Backend (`backend/`) for Google Cloud Gemini Enterprise (Discovery Engine). The platform is architecturally decoupled into two dedicated environments: an end-user **User Portal** and an administrative **Admin Console**.

## 2. Core Capabilities
1. **User Portal (`frontend/src/components/UserPortal.tsx`):**
   - End-user discovery hub for Gemini Enterprise applications with Cloud Identity group filtering and popup launching.
   - Self-service AI Skill Registry, specialized Google ADK Agent directory, and MCP data connectors.
2. **Admin Console (`frontend/src/components/AdminConsole.tsx`):**
   - Centralized security and operations plane for IT administrators, SecOps, and platform architects.
   - 6-Stage AI Skill Governance Studio with human-in-the-loop InfoSec approval and distribution controls.
   - Terraform Infrastructure Provisioning Studio (GE App, Identity/WIF, M365 Connectors) with state locking and execution monitoring.
   - On-demand and scheduled Discovery Engine & Cloud Identity sync operations and access verification.
