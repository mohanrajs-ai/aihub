# Implementation Plan: Decouple User Portal and Admin Console into Separate Codebases and Independent Deployments

## Phase 1: Standalone User Portal Codebase & Test Suite (`frontend-user/`) [checkpoint: cd3d1bd]
- [x] Task: Scaffold `frontend-user/` workspace and configuration [cd3d1bd]
  - [x] Initialize `frontend-user/package.json`, `vite.config.ts`, `tsconfig.json`, and Tailwind setup [cd3d1bd]
  - [x] Configure Vite proxy for backend API (`http://localhost:8080`) on port 5173 [cd3d1bd]
- [x] Task: Implement standalone User Portal application [cd3d1bd]
  - [x] Create user-only `App.tsx`, `Header.tsx`, `Sidebar.tsx`, and views (`CatalogGrid`, `AppCard`, `SearchFilterBar`, `SkillsSection`, `AgentsView`, `McpServersView`) [cd3d1bd]
  - [x] Ensure zero administrative components or route leaks exist in `frontend-user/` [cd3d1bd]
- [x] Task: Write unit tests and verify production build in `frontend-user/` [cd3d1bd]
  - [x] Write Vitest unit tests in `frontend-user/src/__tests__/UserPortal.test.tsx` [cd3d1bd]
  - [x] Run `npm test -- --run` and `npm run build` to verify clean build [cd3d1bd]
- [x] Task: Phase 1 Verification & Checkpoint (Refer to workflow.md) [cd3d1bd]

## Phase 2: Standalone Admin Console Codebase & Test Suite (`frontend-admin/`) [checkpoint: b2cb120]
- [x] Task: Scaffold `frontend-admin/` workspace and configuration [b2cb120]
  - [x] Initialize `frontend-admin/package.json`, `vite.config.ts`, `tsconfig.json`, and Tailwind setup [b2cb120]
  - [x] Configure Vite proxy for backend API (`http://localhost:8080`) on port 5174 [b2cb120]
- [x] Task: Implement standalone Admin Console application [b2cb120]
  - [x] Create admin-only `App.tsx`, `AdminHeader.tsx`, `AdminSidebar.tsx`, and admin studios (`SkillsSection`, `ProvisioningStudio`, Sync Dashboard, Access Matrix) [b2cb120]
  - [x] Implement unauthorized access guard for non-admin accounts [b2cb120]
- [x] Task: Write unit tests and verify production build in `frontend-admin/` [b2cb120]
  - [x] Write Vitest unit tests in `frontend-admin/src/__tests__/AdminConsole.test.tsx` [b2cb120]
  - [x] Run `npm test -- --run` and `npm run build` to verify clean build [b2cb120]
- [x] Task: Phase 2 Verification & Checkpoint (Refer to workflow.md) [b2cb120]

## Phase 3: Dual Independent Container Deployments & Docker Compose
- [ ] Task: Create `Dockerfile.user` for standalone User Portal container
- [ ] Task: Create `Dockerfile.admin` for standalone Admin Console container
- [ ] Task: Update `docker-compose.yml` to define independent `user-portal` (port 8080) and `admin-console` (port 8082) services
- [ ] Task: Phase 3 Verification & Checkpoint (Refer to workflow.md)

## Phase 4: Full System Verification, Regressions & Conductor Synchronization
- [ ] Task: Run full test suites across `frontend-user/`, `frontend-admin/`, and `backend/`
- [ ] Task: Update `conductor/product.md` and `conductor/tech-stack.md` to document two separate codebases and multi-container deployments
- [ ] Task: Phase 4 Verification & Checkpoint (Refer to workflow.md)
