# Specification: Decouple User Portal and Admin Console into Separate Codebases and Independent Deployments

## 1. Overview & Business Justification
Previously, the User Portal and Admin Console were logically segregated within a single frontend SPA using URL-based routing and conditional component rendering. However, enterprise security standards and production deployment best practices require physical isolation:
- **Zero Attack Surface / Leaks**: The end-user bundle must not include administrative code, governance schemas, Terraform IaC forms, or admin API client methods.
- **Independent Release Cadence**: Changes to the admin governance and provisioning studio should deploy without rebuilding or risk of disrupting the end-user application catalog.
- **Network Perimeter Isolation**: The Admin Console deployment can be locked down behind restricted corporate networks, VPNs, and strict Identity-Aware Proxy (IAP) policies on separate ports/domains, while the User Portal is accessible organization-wide.

This track physically decouples the frontend into two standalone codebases:
1. **`frontend-user/`**: Dedicated Vite + React 18 + TS application for end-user app discovery, skill registry, agent directory, and MCP connectors.
2. **`frontend-admin/`**: Dedicated Vite + React 18 + TS application for administrators to manage 6-stage skill governance, execute Terraform provisioning, and monitor live sync operations.

Additionally, this track provides two independent container deployment manifests (`Dockerfile.user`, `Dockerfile.admin`) orchestrated via `docker-compose.yml`.

---

## 2. Architecture & Functional Requirements

### AR-1: Standalone User Portal Codebase (`frontend-user/`)
- Contains its own `package.json`, `vite.config.ts`, `tsconfig.json`, and Vitest test suite.
- Clean application entrypoint (`src/App.tsx`, `src/main.tsx`) exclusively rendering:
  - GE App Hub catalog grid, search/filter bar, and launch popups.
  - Skill Registry (browse published skills and submit new skills for review).
  - Agent Registry (directory of specialized Google ADK agents).
  - Connector/MCP view (directory of data connectors).
- User Header and Navigation rail containing zero admin links or toggles.
- Dev server runs on port `5173`.

### AR-2: Standalone Admin Console Codebase (`frontend-admin/`)
- Contains its own `package.json`, `vite.config.ts`, `tsconfig.json`, and Vitest test suite.
- Clean application entrypoint (`src/App.tsx`, `src/main.tsx`) exclusively rendering:
  - 6-Stage Skill Governance Studio (review, eval metrics, InfoSec approval/rejection).
  - Infrastructure Provisioning Studio (Terraform stacks, plan review, workspace locks).
  - Catalog & Identity Sync Dashboard (trigger manual sync, schedule telemetry).
  - Access & Roles Matrix.
- Admin Header with `ADMIN CONSOLE` branding and dedicated Admin Navigation rail.
- Built-in Access Guard: Displays an Access Denied banner if accessed by non-admin accounts.
- Dev server runs on port `5174`.

### AR-3: Independent Multi-Container Deployments & Backend Entrypoints
- **`backend/app/user_main.py` (`app.user_main:app`)**: Dedicated FastAPI entrypoint for the User Portal deployment (`portal_mode="user"`), serving `frontend-user/dist` and omitting administrative Terraform provisioning and sync trigger routers.
- **`backend/app/admin_main.py` (`app.admin_main:app`)**: Dedicated FastAPI entrypoint for the Admin Console deployment (`portal_mode="admin"`), serving `frontend-admin/dist` and exposing all governance, Terraform provisioning, and sync routers.
- **`Dockerfile.user`**: Multi-stage Docker build that compiles `frontend-user` and packages it into a production container running `app.user_main:app` (Port 8080).
- **`Dockerfile.admin`**: Multi-stage Docker build that compiles `frontend-admin` and packages it into an isolated production container running `app.admin_main:app` (Port 8082).
- **`docker-compose.yml`**: Defines independent `user-portal` and `admin-console` container services communicating with PostgreSQL.

---

## 3. Non-Functional Requirements
- **Bundle Purity**: `frontend-user` bundle contains 0KB of admin governance or Terraform provisioning code.
- **Independent Testing**: Both applications execute their own `npm test` and `npm run build` independently.
- **Backend Compatibility**: Backend API on port 8080 supports both client origins.

---

## 4. Acceptance Criteria
1. `frontend-user/` builds cleanly (`npm run build`) and passes its unit test suite (`npm test`).
2. `frontend-admin/` builds cleanly (`npm run build`) and passes its unit test suite (`npm test`).
3. `Dockerfile.user` and `Dockerfile.admin` build independent container images.
4. `docker-compose.yml` provisions separate `user-portal` (port 8080) and `admin-console` (port 8082) services.
5. All tests in both frontend apps and backend pass.
