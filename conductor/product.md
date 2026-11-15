# Product Definition: Gemini Enterprise AppHub & Control Plane Monorepo (`geapphub`)

## 1. Vision & Overview
**Gemini Enterprise AppHub (`geapphub`)** is a unified Enterprise AI Control Plane and Federated Discovery Portal for Google Cloud Gemini Enterprise (Discovery Engine). Organized as a five-module monorepo (`frontend/`, `backend/`, `agents/`, `infra/`, `skills_catalog/`), it governs the entire lifecycle of enterprise AI: infrastructure provisioning, group-based app discovery, 6-stage AI skill governance, and zero-trust multi-skill agent execution.

## 2. Target Personas
- **Enterprise End Users & Business Consumers:** Discover and launch authorized Gemini Enterprise applications, browse approved skills in the **User AI Skill Hub**, and execute composite skills via the pinned **Enterprise Skill Orchestrator** agent inside Gemini Enterprise.
- **Platform & InfoSec Administrators:** Provision new Gemini Enterprise engines, Workforce Identity Federation (Entra ID / Okta), and Microsoft 365 connectors via the **Admin Provisioning Studio**, and govern/distribute AI skills across apps via the **6-Stage Skill Governance Studio**.

## 3. Core Platform Subsections (Monorepo Capabilities)
1. **Federated Multi-App Discovery Portal (`frontend/` + `backend/app/`):**
   - Live multi-region Discovery Engine & Data Store synchronization (`global`, `us`, `eu`) with Cloud Identity Group RBAC filtering and OIDC-safe popup launching.
2. **6-Stage AI Skill Governance Factory & In-Portal RBAC Split (`backend/skill_workflow_service/` + `frontend/`):**
   - Automated Policy/Security Gate, Environment Templatizer (`{{ENGINE_ID}}`, `{{DATA_STORE_IDS}}`), Connector Dependency Analyzer, Synthetic Eval Generator, Multi-Turn `:streamAssist` Evaluator, Prompt Optimizer, Multi-App Connector Readiness Matrix, and Scoped Admin Distribution (`selected` vs `global`).
3. **Self-Service Infrastructure, Identity & M365 Provisioning Studio (`infra/` + `backend/app/routers/provisioning.py`):**
   - Declarative Terraform stacks (`01-identity-foundation`, `02-ge-app-instance`, `03-m365-connectors`) executable via CLI (`infra/deploy*.sh`) or the RBAC-protected Admin Web UI with live SSE logs and secret redaction.
4. **Universal ADK Skill & Sub-Skill Orchestrator (`agents/universal_skill_orchestrator/` + `skills_catalog/`):**
   - Single deployable Vertex AI Reasoning Engine ADK Agent that dynamically loads governed Parent Skills and chains reusable Sub-Skills using the calling GE user's forwarded OAuth token (`toolAuthorizations` $\rightarrow$ `:streamAssist`).
5. **Gemini Enterprise Pinned Assistant Publisher (`backend/app/services/ge_agent_publisher.py`):**
   - Registers the Universal Skill Orchestrator under `engines/{engine_id}/assistants/default_assistant/agents` with `defaultPinned: true` (alongside Deep Research) and syncs published skills as `starterPrompts`.
