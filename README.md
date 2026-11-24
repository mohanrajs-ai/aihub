# Gemini Enterprise AI Hub Portal (`aihub`)

Physically decoupled User Portal (`frontend-user/` + `backend-user/`) and Admin Console (`frontend-admin/` + `backend-admin/`) codebases with two independent FastAPI container deployments (`Dockerfile.user` on port `8080`, `Dockerfile.admin` on port `8082`) sharing a single PostgreSQL / SQLite database.

## Repository Structure

```text
aihub/
├── frontend-user/                # Standalone User Portal SPA (React 18 + TS + Vite, Port 5173)
├── backend-user/                 # Standalone User Portal FastAPI Backend (Port 8080, zero admin code)
├── frontend-admin/               # Standalone Admin Console SPA (React 18 + TS + Vite, Port 5174)
├── backend-admin/                # Standalone Admin Console FastAPI Backend (Port 8082, Governance + IaC + Sync)
├── docs/                         # Architecture & Governance One-Pagers
├── conductor/                    # Project Context, Style Guides & Tracks Registry
├── Dockerfile.user               # Standalone User Portal Container Build (frontend-user + backend-user, Port 8080)
├── Dockerfile.admin              # Standalone Admin Console Container Build (frontend-admin + backend-admin, Port 8082)
└── docker-compose.yml            # Multi-Container Deployment (postgres, user-portal, admin-console)
```

## Related Sibling Repositories (`/Users/mohanrajs/aops/`)

- **[`../geautodeployment`](../geautodeployment)**: Terraform Stacks, `gedeploy` CLI, and Enterprise Deployment / Publishing Guides (`docs/`).
- **[`../agents`](../agents)**: Deployable Google ADK Agents for Vertex AI Agent Runtime (`ReasoningEngine`).
- **[`../skill_governance_pipeline`](../skill_governance_pipeline)**: Standalone 6-Stage AI Skill Governance & Publishing CLI (`skillgp`).
- **[`../skills_catalog`](../skills_catalog)**: Git-managed Atomic Sub-Skills and Composite Parent Skills (`SKILL.md`).

## Quick Start

### 1. Start the Standalone Backend Services
```bash
# User Portal Backend (Port 8080)
cd backend-user && ../.venv/bin/uvicorn app.main:app --reload --port 8080

# Admin Console Backend (Port 8082)
cd backend-admin && ../.venv/bin/uvicorn app.main:app --reload --port 8082
```

### 2. Start the Standalone Frontend Development Servers
```bash
# User Portal Dev Server (Port 5173 -> proxies /api to :8080)
cd frontend-user && npm run dev -- --host 0.0.0.0 --port 5173

# Admin Console Dev Server (Port 5174 -> proxies /api to :8082)
cd frontend-admin && npm run dev -- --host 0.0.0.0 --port 5174
```

### 3. Deploy Independent Containers via Docker Compose
```bash
docker compose up --build -d
# User Portal:   http://localhost:8080
# Admin Console: http://localhost:8082
```

### 4. Run Automated Tests
```bash
cd backend-user && ../.venv/bin/pytest -q
cd backend-admin && ../.venv/bin/pytest -q
cd frontend-user && npm test -- --run && npm run build
cd frontend-admin && npm test -- --run && npm run build
```
