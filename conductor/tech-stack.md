# Technology Stack: Gemini Enterprise AppHub Monorepo (`geapphub`)

## 1. Monorepo Directory & Deployment Architecture
- **`frontend-user/`**: Standalone React 18 + TypeScript + Vite + Tailwind CSS codebase for the end-user **User Portal** (Dev port `5173`, zero admin code in bundle).
- **`frontend-admin/`**: Standalone React 18 + TypeScript + Vite + Tailwind CSS codebase for the **Admin Console** (Dev port `5174`, role-gated administrative studios).
- **`backend/app/`**:
  - `user_main.py` (`app.user_main:app`, Port `8080`): User Portal FastAPI entrypoint serving `frontend-user/dist` and user-facing discovery APIs (omitting administrative provisioning/sync routers).
  - `admin_main.py` (`app.admin_main:app`, Port `8082`): Admin Console FastAPI entrypoint serving `frontend-admin/dist` and administrative governance, Terraform provisioning, and sync APIs (`require_admin`, `is_admin_user`).
  - `main.py` (`app.main:app`): Unified FastAPI application factory supporting `portal_mode` (`user`, `admin`, `all`).
- **`Dockerfile.user` & `Dockerfile.admin` + `docker-compose.yml`**: Two independent multi-stage container builds and deployments (`user-portal` on port `8080`, `admin-console` on port `8082`) backed by PostgreSQL 16.
- **`backend/skill_workflow_service/`**: FastAPI 6-Stage AI Skill Governance Factory (Port 8081 / Mounted) powered by Google ADK and `GeminiEnterpriseDiscoveryLlm` (`:streamAssist`).
- **`agents/universal_skill_orchestrator/`**: Deployable Google ADK Agent package managed via **`agents-cli` (`google-agents-cli ~= 1.4.1`)** (`agents-cli scaffold`, `agents-cli run`, `agents-cli eval run`, `agents-cli deploy --deployment-target agent_runtime`, and `agents-cli publish gemini-enterprise`) with dynamic `InstructionProvider`, `load_skill_bundle`, `execute_subskill`, and per-user OAuth token passthrough (`--authorization-id`).
- **`infra/`**: Terraform 1.5+ (`google` / `google-beta` ~> 5.0) & idempotent Discovery Engine REST provisioning stacks (`01-identity-foundation`, `02-ge-app-instance`, `03-m365-connectors`) plus bash verification suite (`infra/tests/run_tests.sh`).
- **`skills_catalog/`**: Version-controlled library of atomic `subskills/` and multi-step `composite_skills/` (`SKILL.md` + `manifest.json`).

## 2. Backend, Agent & Database Stack
- **Languages & Runtimes:** Python 3.11+, TypeScript (ES2022+), Bash 5+, HCL (Terraform 1.5+)
- **AI & Agent SDKs:** `google-adk` (Agent Development Kit), `google-cloud-discoveryengine`, `google-auth`, `httpx`
- **Database:** PostgreSQL 16 / SQLite (`sqlalchemy` 2.0 ORM) persisting `ge_applications` (with `data_store_ids`), Cloud Identity groups/memberships, `skill_workflow_runs`, `published_skills`, and provisioning job runs.

## 3. Testing, Linting & Quality Gates
- **Backend & Deterministic Agent Code:** `uv run pytest`, `ruff check` (`<= 80` char line limit, single-line sorted imports)
- **ADK Agent Behavioral Evaluation & Deployment CLI:** `agents-cli run`, `agents-cli eval run` (generate + grade), `agents-cli deploy`, `agents-cli publish gemini-enterprise`, `agents-cli registry`
- **Frontend (`frontend-user/` & `frontend-admin/`):** `vitest`, React Testing Library, `npm run build`
- **Infrastructure:** `infra/tests/run_tests.sh` (10 suites, 254 assertions, 80.5% script coverage), `terraform fmt`, `terraform validate`
