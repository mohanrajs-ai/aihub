# Specification: Separate User Portal and Admin Console Systems

## 1. Overview & Business Justification
Currently, Gemini Enterprise AppHub (`aihub`) operates as a single blended interface where regular end users and platform administrators navigate the same sidebar and layout. While admin sections (`Skill Governance`, `Infra Provisioning`) are conditionally rendered based on role flags, this tight coupling creates visual clutter for end users, increases cognitive load, and risks inadvertent exposure or execution of administrative capabilities.

This track decouples the application into two dedicated, purpose-built systems:
1. **User Portal (`/` or `/user`)**: An intuitive, productivity-focused application hub for employees, knowledge workers, and creators to discover and launch Gemini Enterprise apps, explore and register self-service AI skills, view specialized ADK agents, and explore MCP connectors.
2. **Admin Console (`/admin`)**: A centralized, security-governed operations plane for platform operators, IT administrators, and InfoSec reviewers to oversee the 6-stage AI Skill Governance workflow, orchestrate Terraform IaC provisioning (GE App, Identity/WIF, M365 Connectors), manage live catalog/identity syncs, and inspect user/group permissions.

---

## 2. Functional Requirements

### FR-1: System Routing & Portal Switcher Architecture
- Provide explicit entrypoints and state separation for the two systems:
  - **User Portal**: Active at root `/` or `/user`.
  - **Admin Console**: Active at `/admin`.
- If an authorized user (roles: `it-admin`, `security-reviewer`, `platform-lead`, `cloud-architect`) is logged in:
  - Display a prominent Portal Switcher toggle in the top header allowing seamless switching between **User Portal** and **Admin Console**.
- If an unauthenticated or non-admin user attempts to access the Admin Console (`/admin`):
  - Block access with an Unauthorized Access screen / Access Request banner offering a 1-click return to the User Portal.

### FR-2: User Portal System Experience
- Dedicated left navigation rail exclusively containing user-facing modules:
  - **GE App Hub (`apps`)**: Searchable, filterable enterprise catalog with popup launching and group filtering.
  - **Skill Registry (`skills`)**: Published skills catalog and self-service "Submit New Skill" modal (submitting skills into the governance queue without displaying admin approval/rejection actions).
  - **Agent Registry (`agents`)**: Directory of specialized Google ADK and A2A agents with launch prompts.
  - **Connector/MCP (`mcp`)**: Directory of external data sources and MCP endpoints.
- Total removal of admin-only badges, pending admin review banners, and IaC provisioning modules from the user layout.

### FR-3: Admin Console System Experience
- Dedicated administrative header styling and navigation rail:
  - **Skill Governance Studio (`governance`)**: Full 6-stage evaluation dashboard, stage progression timeline, InfoSec approve/reject controls, and SKILL.md inspect modal.
  - **Infra Provisioning Studio (`provisioning`)**: Terraform execution tabs (GE App, Identity/WIF, M365), workspace state locks, plan approvals, and execution logs.
  - **Sync & Data Operations (`sync`)**: Live GCP Discovery Engine & Cloud Identity sync triggers, status metrics, and historical run summaries.
  - **Access & Roles Overview (`access`)**: Preview and verification of Cloud Identity groups, role assignments, and permission boundaries.
- Prominent breadcrumb and "Back to User Portal" action.

### FR-4: Backend Authorization Guardrails
- Secure administrative API endpoints with role-based authorization:
  - `/api/v1/provisioning/*`: Requires admin role.
  - `/api/v1/sync/run`: Requires admin role.
  - `/api/v1/skills/{skill_id}/review`, `/api/v1/skills/{skill_id}/approve`, `/api/v1/skills/{skill_id}/reject`: Requires admin/security reviewer role.
- Return HTTP 403 Forbidden with clear diagnostic error when accessed without sufficient privileges.

### FR-5: Unified Authentication, Theme & Branding
- Both systems share the single-sign-on (SSO) session token, active user context, dark/light theme preferences, and Cymbal/Tech Mahindra branding tokens.

---

## 3. Non-Functional Requirements
- **Performance**: Zero noticeable latency increase during route or portal switching.
- **Security**: Defense-in-depth authorization (client-side route guards backed by server-side FastAPI role checks).
- **Test Coverage**: Maintain >80% test coverage across both frontend (Vitest) and backend (Pytest).
- **Accessibility**: Comply with WCAG 2.1 AA keyboard navigation and screen reader semantics.

---

## 4. Acceptance Criteria
1. Non-admin users cannot see or navigate to Admin Console features or execute administrative actions.
2. Admins can toggle between User Portal and Admin Console via the Header switcher.
3. User Portal displays only end-user modules (Apps, Skills, Agents, MCP) with zero admin UI clutter.
4. Admin Console houses Skill Governance, Infra Provisioning, Sync triggers, and Access management.
5. Unauthorized direct access to `/admin` shows a clean access-denied state with a link back to User Portal.
6. All automated Vitest and Pytest suites pass.

---

## 5. Out of Scope
- Splitting the repository into multiple discrete git repos.
- Altering the underlying PostgreSQL database schemas.
