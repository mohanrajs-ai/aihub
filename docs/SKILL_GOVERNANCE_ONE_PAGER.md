# Enterprise Skill Governance & Distribution Pipeline — Executive One-Pager

> **Executive Summary**: As enterprise teams author custom **Gemini Enterprise Skills (`SKILL.md`)** across sandbox and departmental applications, organizations need a zero-trust, automated governance control plane before promoting skills into production **Gemini Enterprise (GE) Applications** and **High-Code Specialized ADK Agents**. The **6-Stage Skill Governance Pipeline (`skillgp`)** combines two dedicated High-Code Google ADK Agents on Vertex AI Agent Runtime (**`skill-eval-agent`** and **`infosec-review-agent`**) with mandatory **Human InfoSec Sign-Off** to evaluate, secure, templatize, register, and distribute skills across the enterprise.

---

## 1. Problem Statement

Enterprise adoption of agentic skills introduces five critical governance, security, and operational challenges:

| # | Challenge | Enterprise Risk & Impact |
| :--- | :--- | :--- |
| **1** | **Ungoverned "Shadow Skills" & Prompt Drift** | Citizen developers and domain engineers create ad-hoc `SKILL.md` instructions in sandbox GE apps without standardized structure, deterministic step ordering, or golden evaluation datasets—leading to unpredictable hallucination and tool-calling failures in production. |
| **2** | **Hardcoded Environment & Connector Lock-In** | Skills authored in a single GE application (e.g., `cymbal-dev-sandbox-app`) embed hardcoded Discovery Engine resource paths (`engines/cymbal-dev-sandbox-app/...`), preventing portable reuse across other GE applications (`cymbal-service-desk-app`, `cymbal-finance-app`, `cymbal-hr-app`) and High-Code ADK Agents. |
| **3** | **Prompt Injection, Exfiltration & Credential Leakage** | Unvetted skill instructions and bundled helper scripts can introduce system-override jailbreaks, hardcoded API keys/tokens, unauthorized external webhook exfiltration, unsafe Python execution (`eval`/`subprocess`), or over-privileged IAM share proposals. |
| **4** | **Context Window Bloat & Token FinOps Waste** | Monolithic `SKILL.md` files repeat verbose connector URIs and uncompacted instructions on every turn, inflating LLM input token consumption by **35%–45%** and increasing interactive p95 latency. |
| **5** | **Disconnected Silos Between Low-Code GE Apps & High-Code ADK Agents** | Skills created in Gemini Enterprise UI are trapped inside a single engine instead of being published to a centralized **Enterprise Skill Registry** and bound to **High-Code Specialized ADK Agents** (e.g., `universal-skill-orchestrator`, `cymbal-it-incident-sre-agent`, `cymbal-finance-erp-variance-agent`). |

---

## 2. Solution Architecture

We implemented an end-to-end **6-Stage Skill Governance & Multi-Target Distribution Control Plane** powered by **High-Code Google ADK Agents** deployed on **Vertex AI Agent Runtime** (`cymbal-app-514110` / `us-central1`), a unified **`skillgp` CLI**, and the **GE AppHub Skill Governance Admin Console**:

### Key Solution Pillars
1. **Dedicated High-Code ADK Governance Agents on Vertex AI Agent Runtime**:
   - **`skill-eval-agent`** (`projects/457338748091/locations/us-central1/reasoningEngines/3318820048226746368`): Synthesizes `agent-platform-eval-v1` golden test cases, parameterizes `{{engine_id}}` URIs, extracts required 1P/M365/MCP connectors and sub-skills, and scores skills across the **6-Rubric Benchmark (`R1`–`R6`)**.
   - **`infosec-review-agent`** (`projects/457338748091/locations/us-central1/reasoningEngines/7840434074106724352`): Audits every skill across **6 Zero-Trust InfoSec Controls (`IS-1`–`IS-6`)** and issues a cryptographic **SHA-256 `security_digest`**.
2. **Mandatory Human-in-the-Loop InfoSec Gate**:
   - Pipeline automatically pauses at **Stage 4 (`AWAITING_INFOSEC_APPROVAL`)** and presents full Stage 2 Evals output (`R1`–`R6` scorecard, structural checks, synthesized test cases, token savings) and Stage 3 InfoSec output (`IS-1`–`IS-6` audit findings & SHA-256 digest) to the human reviewer in the Admin UI.
3. **Write Once, Share Everywhere (GE Apps + High-Code Specialized Agents)**:
   - Upon approval, the parameterized `SKILL.md` is published to the **Enterprise Skill Registry** and distributed simultaneously to selected **Gemini Enterprise Apps** (`v1alpha` Assistant Agents API + IAM bindings) and **High-Code Specialized ADK Agents**.

---

## 3. The 6-Stage Governance Pipeline Steps

| Stage | Pipeline Step | Executing Component | Key Checks, Tools & Outputs | Gate Criteria |
| :--- | :--- | :--- | :--- | :--- |
| **Stage 1** | **Trigger & Discovery** | `GEApiMonitorTrigger` / `GitWebhookTrigger` / `./skillgp` | Polls all Gemini Enterprise engines (`cymbal-dev-sandbox-app`, `cymbal-service-desk-app`, etc.) for newly created skills or IAM share proposals, or triggers from Git/`SKILL.md`. | Valid `SKILL.md` artifact & owner metadata discovered. |
| **Stage 2** | **Evaluate (Skill Eval Agent)** | High-Code ADK Agent: **`skill-eval-agent`** (`ReasoningEngine/3318820048226746368`) | Invokes 4 ADK tools:<br>• `synthesize_skill_eval_dataset()` (`agent-platform-eval-v1`)<br>• `templatize_skill_environment()` (`{{engine_id}}`)<br>• `extract_connectors_and_subskills()`<br>• `evaluate_skill_six_rubric_benchmark()` (`R1`–`R6`) | Weighted score **≥ 75/100** (`PLATINUM_TIER_1` or `GOLD_TIER_2`). |
| **Stage 3** | **Agentic InfoSec Review** | High-Code ADK Agent: **`infosec-review-agent`** (`ReasoningEngine/7840434074106724352`) | Audits 6 Zero-Trust security controls:<br>• **IS-1**: Prompt Injection & System Override Guard<br>• **IS-2**: Credential Leakage & GCS Artifact Verification<br>• **IS-3**: External Endpoint & Domain Allowlist<br>• **IS-4**: Bundled Python Script AST Security Audit<br>• **IS-5**: IAM Least-Privilege Role Check (`agentUser`)<br>• **IS-6**: Zero-Trust OAuth Passthrough & `{{engine_id}}` Isolation | **6/6 Controls Passed**, `LOW` risk, 0 critical findings, cryptographic **SHA-256 `security_digest`**. |
| **Stage 4** | **InfoSec Approval (Human)** | Human InfoSec Reviewer (Admin UI or `./skillgp --approve`) | Reviewer inspects consolidated **Stage 2 Evals Output** + **Stage 3 InfoSec Output**, selects target **GE Apps** and **High-Code Specialized ADK Agents**, and records human sign-off. | Explicit human approval by authorized InfoSec reviewer. |
| **Stage 5** | **Publish in Skill Registry** | `Stage5RegistryPublisher` | Publishes immutable versioned skill package (`urn:skill:projects-cymbal-app-514110:locations:global:private-<skill>`) with parameterized `{{engine_id}}` instruction, evaluation certificate, and security digest into the **Enterprise Skill Registry**. | Registry URN created & indexed in catalog DB. |
| **Stage 6** | **Share to GE Apps & High-Code Agents** | `Stage6GEAppDistributor` | Hydrates `{{engine_id}}` per target **Gemini Enterprise App** (`cymbal-service-desk-app`, `cymbal-finance-app`, `cymbal-hr-app`) via Discovery Engine `v1alpha` API and binds the skill to selected **High-Code Specialized ADK Agents** (`universal-skill-orchestrator`, etc.). | Active in target GE Apps & bound to specialized ADK Agents. |
