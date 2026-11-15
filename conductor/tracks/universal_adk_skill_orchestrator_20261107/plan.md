# Implementation Plan: Universal ADK Skill & Sub-Skill Orchestrator Agent (`agents-cli`)

## Phase 1: Scaffold `agents/universal_skill_orchestrator/` & `skills_catalog/`
- [x] Task 1.1: Create `agents/universal_skill_orchestrator/` (`__init__.py`, `agent.py`, `tools/skill_orchestration.py`, `pyproject.toml`, `README.md`) and `.agents-cli-spec.md`.
- [x] Task 1.2: Create `skills_catalog/` with atomic `subskills/` (`m365-outlook-triage`, `sharepoint-policy-lookup`) and composite parent skill (`customer-escalation-resolver`).
- [x] Task 1.3: Run `agents-cli scaffold enhance` on `agents/universal_skill_orchestrator` with `--deployment-target agent_runtime` and `--agent-guidance-filename GEMINI.md` so `agents-cli-manifest.yaml`, built-in A2A routes, and `eval` harness are wired up.

## Phase 2: Sub-Skill Registry & Per-User `:streamAssist` Execution
- [x] Task 2.1: Add `sub_skills: list[str]` field to `GESkillRecord`, `SkillWorkflowRecord`, and `SkillRegistryRecord` in `backend/app/db_models.py` and `backend/app/models.py`.
- [x] Task 2.2: Implement `GEDiscoveryStreamAssistClient` and `UniversalSkillOrchestratorService` (`backend/skill_workflow_service/agents/ge_discovery_llm.py`) prioritizing the calling GE user's forwarded OAuth token via `ContextVar` so `:streamAssist` runs under the user's GE seat and M365 ACLs.
- [x] Task 2.3: Add `/api/v1/skills/orchestrate` and `/api/v1/skills/seed-catalog` endpoints and interactive orchestrator UI modal in `frontend/src/components/SkillsSection.tsx`.
- [x] Task 2.4: Add deterministic contract unit tests via `pytest backend/tests/test_universal_skill_orchestrator.py`.

## Phase 3: Smoke Testing, `agents-cli eval run` & Agent Runtime Deployment
- [x] Task 3.1: Verify orchestrator execution for `customer-escalation-resolver` across `m365-outlook-triage` and `sharepoint-policy-lookup`.
- [x] Task 3.2: Validate `extract_sub_skills` and tool trajectory (`load_skill_bundle` -> `execute_subskill`).
- [x] Task 3.3: Generate `deployment_metadata.json` and `agents-cli-manifest.yaml` in `agents/universal_skill_orchestrator/`.
