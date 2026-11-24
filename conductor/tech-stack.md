# Technology Stack: Gemini Enterprise AppHub Monorepo (`geapphub`)

## 1. Monorepo Directory & Deployment Architecture
- **`frontend-user/`**: Standalone React 18 + TypeScript + Vite + Tailwind CSS codebase for the end-user **User Portal** (Dev port `5173`, zero admin code in bundle).
- **`backend-user/`**: Standalone FastAPI codebase for the **User Portal API** (Port `8080`), serving `frontend-user/dist` and user-facing discovery APIs (`auth`, `apps`, `groups`, `agents`, `mcp_servers`, `skills`) backed by its own dedicated User Database (`geapphub_user` on Port `5432` / `backend-user/geapphub_user.db`). Physically excludes administrative provisioning (`provisioning.py`, `terraform_runner.py`, `provisioning_jobs` table), sync trigger (`sync.py`), and InfoSec skill approval routes.
- **`frontend-admin/`**: Standalone React 18 + TypeScript + Vite + Tailwind CSS codebase for the **Admin Console** (Dev port `5174`, role-gated administrative studios).
- **`backend-admin/`**: Standalone FastAPI codebase for the **Admin Console API** (Port `8082`), serving `frontend-admin/dist` and administrative 6-Stage Skill Governance (`skill_workflow_service`), Terraform Provisioning Studio (`provisioning.py`, `terraform_runner.py`), and Cloud Identity Sync (`sync.py`) backed by its own dedicated Admin Database (`geapphub_admin` on Port `5433` / `backend-admin/geapphub_admin.db`).
- **`Dockerfile.user` & `Dockerfile.admin` + `docker-compose.yml`**: Two independent multi-stage container builds and deployments (`user-portal` on port `8080` + `postgres-user` on port `5432`, and `admin-console` on port `8082` + `postgres-admin` on port `5433`).
- **`agents/universal_skill_orchestrator/`**: Deployable Google ADK Agent package managed via **`agents-cli` (`google-agents-cli ~= 1.4.1`)** (`agents-cli scaffold`, `agents-cli run`, `agents-cli eval run`, `agents-cli deploy --deployment-target agent_runtime`, and `agents-cli publish gemini-enterprise`) with dynamic `InstructionProvider`, `load_skill_bundle`, `execute_subskill`, and per-user OAuth token passthrough (`--authorization-id`).
- **`infra/`**: Terraform 1.5+ (`google` / `google-beta` ~> 5.0) & idempotent Discovery Engine REST provisioning stacks (`01-identity-foundation`, `02-ge-app-instance`, `03-m365-connectors`) plus bash verification suite (`infra/tests/run_tests.sh`).
- **`skills_catalog/`**: Version-controlled library of atomic `subskills/` and multi-step `composite_skills/` (`SKILL.md` + `manifest.json`).

## 2. Backend, Agent & Database Stack
- **Languages & Runtimes:** Python 3.11+, TypeScript (ES2022+), Bash 5+, HCL (Terraform 1.5+)
- **AI & Agent SDKs:** `google-adk` (Agent Development Kit), `google-cloud-discoveryengine`, `google-auth`, `httpx`
- **Databases (Dual Isolated Instances):**
  - **User Portal Database (`geapphub_user` / `backend-user/geapphub_user.db`)**: PostgreSQL 16 (Port `5432`) / SQLite (`sqlalchemy` 2.0 ORM) persisting user profiles, Cloud Identity group memberships, `ge_applications`, and published `skill_registry` entries (excludes `provisioning_jobs`).
  - **Admin Console Database (`geapphub_admin` / `backend-admin/geapphub_admin.db`)**: PostgreSQL 16 (Port `5433`) / SQLite (`sqlalchemy` 2.0 ORM) persisting `provisioning_jobs`, `sync_runs`, `skill_workflows`, `workflow_email_notifications`, and governance state.

## 3. Testing, Linting & Quality Gates
- **Backend (`backend-user/` & `backend-admin/`) & Deterministic Agent Code:** `uv run pytest`, `ruff check` (`<= 80` char line limit, single-line sorted imports)
- **ADK Agent Behavioral Evaluation & Deployment CLI:** `agents-cli run`, `agents-cli eval run` (generate + grade), `agents-cli deploy`, `agents-cli publish gemini-enterprise`, `agents-cli registry`
- **Frontend (`frontend-user/` & `frontend-admin/`):** `vitest`, React Testing Library, `npm run build`
- **Infrastructure:** `infra/tests/run_tests.sh` (10 suites, 254 assertions, 80.5% script coverage), `terraform fmt`, `terraform validate`
