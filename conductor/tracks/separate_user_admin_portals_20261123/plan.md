# Implementation Plan: Separate User Portal and Admin Console Systems

## Phase 1: Backend Role & Authorization Guardrails for Admin Endpoints [checkpoint: c67569f]
- [x] Task: Write backend unit tests for role-based authorization on admin endpoints [c67569f]
  - [x] Create tests verifying 403 Forbidden for non-admin tokens on `/api/v1/provisioning/*`, `/api/v1/sync/run`, and skill review/approval endpoints [c67569f]
  - [x] Create tests verifying successful 200/202 responses for authorized admin tokens [c67569f]
- [x] Task: Implement admin authorization dependencies in backend [c67569f]
  - [x] Add `require_admin_role` and `is_admin_user` helpers in `backend/app/auth.py` [c67569f]
  - [x] Protect `/api/v1/provisioning` router endpoints with `require_admin_role` [c67569f]
  - [x] Protect `/api/v1/sync/run` endpoint with `require_admin_role` [c67569f]
  - [x] Protect skill approval/rejection endpoints in `backend/app/routers/skills.py` with `require_admin_role` [c67569f]
- [x] Task: Phase 1 Verification & Checkpoint (Refer to workflow.md) [c67569f]

## Phase 2: User Portal and Admin Console UI Component Scaffolding [checkpoint: cca6527]
- [x] Task: Write frontend unit tests for separate User Portal and Admin Console components [cca6527]
  - [x] Create test suite verifying User Portal renders only Apps, Skills, Agents, MCP and excludes admin panels [cca6527]
  - [x] Create test suite verifying Admin Console renders Governance, Provisioning, Sync and blocks non-admin users [cca6527]
  - [x] Create test suite for Portal Switcher and unauthorized access fallback [cca6527]
- [x] Task: Implement dedicated User Portal component (`frontend/src/components/UserPortal.tsx`) [cca6527]
  - [x] Encapsulate user layout with user-centric navigation rail (Apps, Skills, Agents, MCP) [cca6527]
  - [x] Connect AppCard, CatalogGrid, SkillsSection (user view), AgentsView, and McpServersView [cca6527]
  - [x] Remove all admin governance and provisioning clutter from user views [cca6527]
- [x] Task: Implement dedicated Admin Console component (`frontend/src/components/AdminConsole.tsx`) [cca6527]
  - [x] Encapsulate admin layout with admin-centric navigation rail (Skill Governance, Provisioning, Sync Dashboard, Access Overview) [cca6527]
  - [x] Integrate Skill Governance review studio, ProvisioningStudio, and catalog sync triggers [cca6527]
  - [x] Implement unauthorized access guard with return button if non-admin accesses Admin Console [cca6527]
- [x] Task: Phase 2 Verification & Checkpoint (Refer to workflow.md) [cca6527]

## Phase 3: Header Portal Switcher & App Router Integration
- [ ] Task: Write unit tests for Header portal switcher and route management in `App.tsx`
  - [ ] Test that portal toggle appears only for admin roles
  - [ ] Test switching between User and Admin systems retains auth state and theme
  - [ ] Test URL path synchronization (`/` vs `/admin`)
- [ ] Task: Update `Header.tsx` with Portal Switcher
  - [ ] Add interactive tab/pill toggle: "User Portal" | "Admin Console" for authorized admin users
  - [ ] Display administrative badge when currently inside Admin Console
- [ ] Task: Refactor `App.tsx` into top-level System Router
  - [ ] Manage active system state (`user-portal` vs `admin-console`) based on URL and user selection
  - [ ] Render `UserPortal` or `AdminConsole` accordingly
  - [ ] Maintain global auth, theme, and project context across both systems
- [ ] Task: Phase 3 Verification & Checkpoint (Refer to workflow.md)

## Phase 4: Full System Verification, Regressions & Conductor Registry
- [ ] Task: Run full frontend test suite (`npm test -- --run`) and production build (`npm run build`)
- [ ] Task: Run backend test suite (`.venv/bin/pytest`) and resolve any regressions
- [ ] Task: Update `conductor/product.md` and `conductor/tech-stack.md` to reflect the two-system architecture
- [ ] Task: Phase 4 Verification & Checkpoint (Refer to workflow.md)
