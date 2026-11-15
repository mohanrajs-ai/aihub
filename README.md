# Gemini Enterprise AI Hub Portal (`aihub`)

Single-Portal RBAC Frontend (`frontend/`) and FastAPI Control Plane & Skill Workflow Backend (`backend/`) for Google Cloud Gemini Enterprise (Discovery Engine).

## Repository Structure

```text
aihub/
├── frontend/                     # React 18 + TypeScript + Vite Single-Portal RBAC UI
├── backend/                      # FastAPI Control Plane (8080) & Skill Workflow Service (8081)
│   ├── app/                      # Live GCP Engine Discovery, Group RBAC & Provisioning API
│   └── skill_workflow_service/   # 6-Stage Skill Governance & :streamAssist Evaluator API
├── docs/                         # Architecture & Governance One-Pagers
├── conductor/                    # Project Context, Style Guides & Tracks Registry
├── Dockerfile
└── docker-compose.yml
```

## Related Sibling Repositories (`/Users/mohanrajs/aops/`)

- **[`../geautodeployment`](../geautodeployment)**: Terraform Stacks, `gedeploy` CLI, and Enterprise Deployment / Publishing Guides (`docs/`).
- **[`../agents`](../agents)**: Deployable Google ADK Agents for Vertex AI Agent Runtime (`ReasoningEngine`).
- **[`../skill_governance_pipeline`](../skill_governance_pipeline)**: Standalone 6-Stage AI Skill Governance & Publishing CLI (`skillgp`).
- **[`../skills_catalog`](../skills_catalog)**: Git-managed Atomic Sub-Skills and Composite Parent Skills (`SKILL.md`).

## Quick Start

### 1. Start the Backend Control Plane & Skill Workflow Service
```bash
cd backend && ../.venv/bin/uvicorn app.main:app --reload --port 8080
cd backend && ../.venv/bin/uvicorn skill_workflow_service.main:app --reload --port 8081
```

### 2. Start the Frontend Development Server
```bash
cd frontend && npm run dev -- --host 0.0.0.0 --port 5173
```

### 3. Run Automated Tests
```bash
cd backend && ../.venv/bin/pytest -q
cd frontend && npm test -- --run
```
