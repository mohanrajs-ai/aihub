# Specification: Cymbal GCP Console UI Redesign & Project Cutover

## 1. Overview
Cut over the **Gemini Enterprise AppHub (`geapphub`)** backend, database, and React frontend exclusively to the **Cymbal (`cymbal-app-514110`)** Google Cloud project (`mohanrajs.demo.altostrat.com`), purge legacy non-Cymbal records (`mohandemo`, old demo apps) from the database, and redesign the portal into a **Google Cloud Console-inspired layout** featuring primary navigation for **Apps**, **Skills**, **Agents**, and **MCP**.

## 2. Functional Requirements

### 2.1 Backend & Configuration Cutover (`backend/app/`)
1. **Settings Defaults (`config.py`)**:
   - Change default `gcp_project_id` to `"cymbal-app-514110"`.
   - Update `DEFAULT_ADMIN_USERS` to include `mohanraj@mohanrajs.demo.altostrat.com` and `admin@mohanrajs.demo.altostrat.com`.
2. **Metadata Enrichment & Sync Purge (`firestore.py`, `sync.py`)**:
   - Update enrichment map and discovery service to target Cymbal engines: `cymbal-dev-sandbox-app`, `cymbal-service-desk-app`, `cymbal-finance-app`, and `cymbal-hr-app`.
   - Add logic in `CatalogSyncService` to purge stale/non-Cymbal applications and groups from the database when syncing.
3. **New Agents & MCP Servers Endpoints**:
   - Add `/api/v1/agents`: returns the list of deployed ADK/A2A agents for Cymbal (including `universal-skill-orchestrator`, reasoning engine resource ID `projects/457338748091/locations/us-central1/reasoningEngines/8050815728477011968`, pinned apps, and description).
   - Add `/api/v1/mcp-servers`: returns the list of active MCP / Data Connector servers for Cymbal (`cymbal-m365-sp`, `cymbal-m365-od`, `cymbal-m365-ol`, `cymbal-m365-teams`, `cymbal-sn-fed`, `cymbal-jira-fed`, `cymbal-confluence-fed`), their connector modes, entities, supported actions/tools count, endpoint URIs, and health status.

### 2.2 Database Cleanup
- Clean up `geapphub_local.db` (and PostgreSQL if active) to remove all non-Cymbal apps (retaining only `cymbal-dev-sandbox-app`, `cymbal-service-desk-app`, `cymbal-finance-app`, `cymbal-hr-app`).
- Ensure users and groups reflect the Cymbal domain `mohanrajs.demo.altostrat.com`.

### 2.3 Frontend Google Cloud Console Redesign (`frontend/src/`)
1. **Google Cloud Console Top Header ([`Header.tsx`](file:///Users/mohanrajs/aops/geapphub/frontend/src/components/Header.tsx))**:
   - Replace legacy "Tech Mahindra" banner with a Google Cloud Console top navigation bar.
   - Display Google Cloud / Gemini Enterprise logo and title: "Google Cloud | Gemini Enterprise AppHub".
   - Include a GCP Project Selector pill displaying `cymbal-app-514110` with project badge.
   - Include live Sync status indicator & trigger button, Cymbal user preview role switcher (`mohanraj@mohanrajs.demo.altostrat.com`, `pradeepg@mohanrajs.demo.altostrat.com`, `admin`), theme toggle, and sign out button.
2. **Google Cloud Console Left Sidebar Navigation ([`Sidebar.tsx`](file:///Users/mohanrajs/aops/geapphub/frontend/src/components/Sidebar.tsx))**:
   - Modern Google Cloud navigation rail with 4 primary workspace sections:
     - **Apps** (`apps`): Gemini Enterprise search & assistant applications.
     - **Skills** (`skills`): Published AI Skill Hub & Governance catalog.
     - **Agents** (`agents`): Live ADK & A2A Agent Registry.
     - **MCP** (`mcp`): Live MCP & Enterprise Data Connector servers.
   - Admin section for Platform Admins:
     - **Skill Governance** (`governance`): 6-Stage Skill Governance Studio.
     - **Terraform Provisioning** (`provisioning`): Infrastructure Studio.
3. **Agents & MCP Views**:
   - **`AgentsView`**: Google Cloud-styled console table/card list displaying active ADK/A2A agents, ReasoningEngine resource IDs, deployment targets, pinned applications, and starter prompts.
   - **`McpServersView`**: Google Cloud-styled console table/card list displaying active MCP & Data Connector tool servers, connector type (M365, ServiceNow, Jira, Confluence), connector modes (`FEDERATED`, `ACTIONS`), enabled tools/actions count, endpoint URIs, and status badges.

## 3. Acceptance Criteria
- Default backend settings target `cymbal-app-514110`.
- Database contains strictly Cymbal project applications and groups.
- Sidebar renders Apps, Skills, Agents, and MCP with live badges and responsive switching.
- Header renders Google Cloud Console styling with Cymbal project pill.
- All backend tests (`pytest`) and frontend tests (`vitest` + `npm run build`) pass.
