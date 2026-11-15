# Specification: Universal ADK Skill & Sub-Skill Orchestrator Agent (`agents-cli`)

## 1. Overview
Instead of deploying a separate Vertex AI Reasoning Engine for each business workflow, build, evaluate, and deploy **one single Universal Skill Orchestrator ADK Agent** (`agents/universal_skill_orchestrator/`) using **`agents-cli` (`google-agents-cli ~= 1.4.1`)**. At runtime, it dynamically loads governed **Parent Skills** and chains reusable **Sub-Skills** (`skills_catalog/`) via Discovery Engine `:streamAssist` using the calling Gemini Enterprise user's forwarded OAuth 2.0 token.

## 2. `agents-cli` Workflow & Scope
- **Phase 1 — Scaffold & Enhance (`agents-cli scaffold`):**
  - Maintain `agents/universal_skill_orchestrator/` compliant with `agents-cli scaffold enhance . --deployment-target agent_runtime` (`agents-cli-manifest.yaml`, `app/agent.py`, built-in A2A protocol via `app/fast_api_app.py`).
- **Phase 2 — Build Dynamic Skill & Sub-Skill Tools (`agents/universal_skill_orchestrator/` & `skills_catalog/`):**
  - `agent.py`: Exports `root_agent` configured with dynamic `InstructionProvider` (`build_dynamic_skill_instruction`) and `before_model_callback` (`capture_calling_ge_user_token`).
  - `tools/skill_orchestration.py`: Implements `load_skill_bundle` and `execute_subskill`, resolving the rendered `SKILL.md` (`{{ENGINE_ID}}`, `{{DATA_STORE_IDS}}`) from the `geapphub` Published Skill Registry.
  - Smoke test interactively via `agents-cli run "<prompt>" --start-server` and `agents-cli playground`.
- **Phase 3 — Behavioral Evaluation (`agents-cli eval run`) vs. Code Tests (`uv run pytest`):**
  - Use `uv run pytest` strictly for deterministic code contracts (token extraction, registry lookups).
  - Use `agents-cli eval run` (`generate` + `grade`) with sample eval cases to validate tool trajectory (`load_skill_bundle` $\rightarrow$ `execute_subskill`) and synthesis quality.
- **Phase 4 — Deploy to Agent Runtime (`agents-cli deploy`):**
  - After explicit human approval of eval scores, deploy via `agents-cli deploy --project $PROJECT_ID --region us-central1 --no-wait` and track via `agents-cli deploy --status` to produce `deployment_metadata.json`.
