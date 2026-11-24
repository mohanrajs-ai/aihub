# Gemini Enterprise AI Hub Portal (`aihub`)

Decoupled User Portal (`frontend-user/`) and Admin Console (`frontend-admin/`) codebases with two independent FastAPI container deployments (`Dockerfile.user` on port `8080`, `Dockerfile.admin` on port `8082`) for Google Cloud Gemini Enterprise (Discovery Engine).

## Repository Structure

```text
aihub/
├── frontend-user/                # Standalone User Portal SPA (React 18 + TS + Vite, Port 5173)
├── frontend-admin/               # Standalone Admin Console SPA (React 18 + TS + Vite, Port 5174)
├── backend/                      # FastAPI Control Plane & Skill Workflow Service
│   ├── app/
│   │   ├── user_main.py          # User Portal FastAPI Deployment Entrypoint (Port 8080)
│   │   ├── admin_main.py         # Admin Console FastAPI Deployment Entrypoint (Port 8082)
│   │   └── main.py               # Application Factory (portal_mode: user | admin | all)
│   └── skill_workflow_service/   # 6-Stage Skill Governance & :streamAssist Evaluator API
├── docs/                         # Architecture & Governance One-Pagers
├── conductor/                    # Project Context, Style Guides & Tracks Registry
├── Dockerfile.user               # Standalone User Portal Container Build (Port 8080)
├── Dockerfile.admin              # Standalone Admin Console Container Build (Port 8082)
└── docker-compose.yml            # Multi-Container Deployment (postgres, user-portal, admin-console)
```

## Related Sibling Repositories (`/Users/mohanrajs/aops/`)

- **[`../geautodeployment`](../geautodeployment)**: Terraform Stacks, `gedeploy` CLI, and Enterprise Deployment / Publishing Guides (`docs/`).
- **[`../agents`](../agents)**: Deployable Google ADK Agents for Vertex AI Agent Runtime (`ReasoningEngine`).
- **[`../skill_governance_pipeline`](../skill_governance_pipeline)**: Standalone 6-Stage AI Skill Governance & Publishing CLI (`skillgp`).
- **[`../skills_catalog`](../skills_catalog)**: Git-managed Atomic Sub-Skills and Composite Parent Skills (`SKILL.md`).

## Quick Start

### 1. Start the Decoupled Backend Services (or Combined Dev Server)
```bash
# User Portal API (Port 8080)
cd backend && ../.venv/bin/uvicorn app.user_main:app --reload --port 8080

# Admin Console API (Port 8082)
cd backend && ../.venv/bin/uvicorn app.admin_main:app --reload --port 8082
```

### 2. Start the Standalone Frontend Development Servers
```bash
# User Portal Dev Server (Port 5173)
cd frontend-user && npm run dev -- --host 0.0.0.0 --port 5173

# Admin Console Dev Server (Port 5174)
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
cd backend && ../.venv/bin/pytest -q
cd frontend-user && npm test -- --run && npm run build
cd frontend-admin && npm test -- --run && npm run build
```
