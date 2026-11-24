# Implementation Plan: Decouple User Portal and Admin Console into Separate Codebases and Independent Deployments

## Phase 1: Standalone User Portal Codebase & Test Suite (`frontend-user/`)
- [ ] Task: Scaffold `frontend-user/` workspace and configuration
  - [ ] Initialize `frontend-user/package.json`, `vite.config.ts`, `tsconfig.json`, and Tailwind setup
  - [ ] Configure Vite proxy for backend API (`http://localhost:8080`) on port 5173
- [ ] Task: Implement standalone User Portal application
  - [ ] Create user-only `App.tsx`, `Header.tsx`, `Sidebar.tsx`, and views (`CatalogGrid`, `AppCard`, `SearchFilterBar`, `SkillsSection`, `AgentsView`, `McpServersView`)
  - [ ] Ensure zero administrative components or route leaks exist in `frontend-user/`
- [ ] Task: Write unit tests and verify production build in `frontend-user/`
  - [ ] Write Vitest unit tests in `frontend-user/src/__tests__/UserPortal.test.tsx`
  - [ ] Run `npm test -- --run` and `npm run build` to verify clean build
- [ ] Task: Phase 1 Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Standalone Admin Console Codebase & Test Suite (`frontend-admin/`)
- [ ] Task: Scaffold `frontend-admin/` workspace and configuration
  - [ ] Initialize `frontend-admin/package.json`, `vite.config.ts`, `tsconfig.json`, and Tailwind setup
  - [ ] Configure Vite proxy for backend API (`http://localhost:8080`) on port 5174
- [ ] Task: Implement standalone Admin Console application
  - [ ] Create admin-only `App.tsx`, `AdminHeader.tsx`, `AdminSidebar.tsx`, and admin studios (`SkillsSection`, `ProvisioningStudio`, Sync Dashboard, Access Matrix)
  - [ ] Implement unauthorized access guard for non-admin accounts
- [ ] Task: Write unit tests and verify production build in `frontend-admin/`
  - [ ] Write Vitest unit tests in `frontend-admin/src/__tests__/AdminConsole.test.tsx`
  - [ ] Run `npm test -- --run` and `npm run build` to verify clean build
- [ ] Task: Phase 2 Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Dual Independent Container Deployments & Docker Compose
- [ ] Task: Create `Dockerfile.user` for standalone User Portal container
- [ ] Task: Create `Dockerfile.admin` for standalone Admin Console container
- [ ] Task: Update `docker-compose.yml` to define independent `user-portal` (port 8080) and `admin-console` (port 8082) services
- [ ] Task: Phase 3 Verification & Checkpoint (Refer to workflow.md)

## Phase 4: Full System Verification, Regressions & Conductor Synchronization
- [ ] Task: Run full test suites across `frontend-user/`, `frontend-admin/`, and `backend/`
- [ ] Task: Update `conductor/product.md` and `conductor/tech-stack.md` to document two separate codebases and multi-container deployments
- [ ] Task: Phase 4 Verification & Checkpoint (Refer to workflow.md)
