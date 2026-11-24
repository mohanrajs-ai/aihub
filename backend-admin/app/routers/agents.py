"""API router for Gemini Enterprise Specialized ADK / A2A Agent Registry."""

import fastapi
from sqlalchemy import orm

from app import database
from app import db_models
from app import models

router = fastapi.APIRouter(prefix="/api/v1/agents", tags=["agents"])

CYMBAL_AGENTS: list[models.AgentSummary] = [
    models.AgentSummary(
        agent_id="universal-skill-orchestrator",
        display_name="Enterprise Skill Orchestrator",
        resource_name="projects/457338748091/locations/us-central1/reasoningEngines/8050815728477011968",
        description=(
            "Universal ADK Skill Orchestrator deploying parent skills and "
            "sub-skills dynamically on Vertex AI Agent Runtime with per-user "
            "OAuth token passthrough."
        ),
        specialization="Multi-Domain Composite Skill Orchestrator",
        deployment_target="agent_runtime",
        pinned_apps=[
            "cymbal-dev-sandbox-app",
            "cymbal-service-desk-app",
            "cymbal-finance-app",
            "cymbal-hr-app",
        ],
        supported_connectors=[
            "outlook-calendar",
            "outlook-email",
            "teams",
            "onedrive",
            "sharepoint",
            "enterprise-knowledge",
            "servicenow",
            "jira",
            "confluence",
        ],
        supported_mcp_tools=[
            "load_skill_bundle",
            "execute_subskill",
            "execute_python_sla_finops_analysis",
            "execute_python_equity_quant_forecast",
        ],
        shared_skills=[
            "customer-escalation-resolver",
            "daily-morning-summary",
            "service-desk-major-incident-bridge",
            "sla-breach-financial-exposure-calculator",
            "stock-deep-research-5yr-forecast-engine",
        ],
        starter_prompts=[
            (
                "Search active P0/P1 incidents in ServiceNow and list "
                "related Jira tickets"
            ),
            (
                "Summarize today's production escalations across Teams, "
                "ServiceNow, and Confluence"
            ),
            (
                "Create a P1 Incident in ServiceNow for Payment Gateway "
                "Handshake Timeout"
            ),
            (
                "Generate a Jira Task in project CYM for SCIM token "
                "rotation"
            ),
        ],
        status="ACTIVE",
        subskills_count=8,
        version="1.4.1",
    ),
    models.AgentSummary(
        agent_id="cymbal-itsm-incident-agent",
        display_name="Cymbal ITSM & Major Incident Agent",
        resource_name="projects/457338748091/locations/us-central1/reasoningEngines/7142908841205612544",
        description=(
            "High-code specialized SRE & ITSM ADK agent bound to ServiceNow, "
            "Jira, Confluence, and Microsoft Teams MCP servers for automated "
            "P1/P2 incident triage and war-room coordination."
        ),
        specialization="High-Code SRE & ITSM Incident Response",
        deployment_target="agent_runtime",
        pinned_apps=[
            "cymbal-service-desk-app",
            "cymbal-dev-sandbox-app",
        ],
        supported_connectors=[
            "servicenow",
            "jira",
            "confluence",
            "teams",
            "outlook-email",
            "sharepoint",
            "onedrive",
            "enterprise-knowledge",
        ],
        supported_mcp_tools=[
            "cymbal-sn-fed:create_incident",
            "cymbal-jira-fed:create_issue",
            "cymbal-confluence-fed:search_runbooks",
            "cymbal-m365-teams:post_war_room_update",
        ],
        shared_skills=[
            "customer-escalation-resolver",
            "service-desk-major-incident-bridge",
            "servicenow-itsm-ticket-triage",
            "m365-teams-incident-swarm",
        ],
        starter_prompts=[
            "Run /service-desk-major-incident-bridge for P1 outage",
            "Run /customer-escalation-resolver on active VIP ticket",
            "Triage P1 ServiceNow incidents and correlate Jira issues",
        ],
        status="ACTIVE",
        subskills_count=4,
        version="1.2.0",
    ),
    models.AgentSummary(
        agent_id="cymbal-finops-quant-agent",
        display_name="Cymbal FinOps & Quantitative Forecasting Agent",
        resource_name="projects/457338748091/locations/us-central1/reasoningEngines/6289104429183746048",
        description=(
            "High-code specialized financial & quantitative ADK agent with "
            "sandboxed Python execution tools for SLA financial exposure "
            "modeling, 5-year equity forecasting, and SOX audit digests."
        ),
        specialization="High-Code Financial & Quantitative Python Execution",
        deployment_target="agent_runtime",
        pinned_apps=[
            "cymbal-finance-app",
            "cymbal-dev-sandbox-app",
        ],
        supported_connectors=[
            "onedrive",
            "sharepoint",
            "outlook-email",
            "outlook-calendar",
            "enterprise-knowledge",
            "servicenow",
        ],
        supported_mcp_tools=[
            "execute_python_sla_finops_analysis",
            "execute_python_equity_quant_forecast",
            "cymbal-m365-od:read_financial_models",
            "cymbal-m365-sp:lookup_sla_policy",
        ],
        shared_skills=[
            "sla-breach-financial-exposure-calculator",
            "stock-deep-research-5yr-forecast-engine",
            "m365-onedrive-artifact-finder",
            "sharepoint-policy-lookup",
        ],
        starter_prompts=[
            "Run /sla-breach-financial-exposure-calculator for Contoso P1",
            "Run /stock-deep-research-5yr-forecast-engine for GOOGL",
            "Calculate contractual SLA credit liability and SOX SHA-256 digest",
        ],
        status="ACTIVE",
        subskills_count=4,
        version="1.3.0",
    ),
    models.AgentSummary(
        agent_id="cymbal-hr-people-ops-agent",
        display_name="Cymbal HR & Policy Concierge Agent",
        resource_name="projects/457338748091/locations/us-central1/reasoningEngines/5910283746519089152",
        description=(
            "High-code specialized HR People Ops ADK agent grounded on "
            "SharePoint policy libraries, Outlook Calendar scheduling, and "
            "employee onboarding workflows."
        ),
        specialization="High-Code HR Policy & Employee Concierge",
        deployment_target="agent_runtime",
        pinned_apps=[
            "cymbal-hr-app",
            "cymbal-dev-sandbox-app",
        ],
        supported_connectors=[
            "sharepoint",
            "outlook-calendar",
            "outlook-email",
            "teams",
            "enterprise-knowledge",
        ],
        supported_mcp_tools=[
            "cymbal-m365-sp:search_hr_policies",
            "cymbal-m365-ol:schedule_onboarding",
            "cymbal-m365-teams:notify_hr_partner",
        ],
        shared_skills=[
            "daily-morning-summary",
            "sharepoint-policy-lookup",
            "m365-calendar-briefing",
        ],
        starter_prompts=[
            "Run /daily-morning-summary for HR leadership standup",
            "Lookup global parental leave and benefits policy in SharePoint",
        ],
        status="ACTIVE",
        subskills_count=3,
        version="1.1.0",
    ),
    models.AgentSummary(
        agent_id="skill-eval-agent",
        display_name="Enterprise Skill Evaluation ADK Agent",
        resource_name="projects/457338748091/locations/us-central1/reasoningEngines/3318820048226746368",
        description=(
            "High-code control-plane ADK Agent invoked during Stage 1 & Stage 2 "
            "of the Skill Governance Pipeline for eval dataset synthesis, "
            "6-Rubric benchmarking, Token FinOps, and multi-app/agent readiness."
        ),
        specialization="Governance Pipeline Stage 2: Skill Evaluation ADK Agent",
        deployment_target="agent_runtime",
        pinned_apps=["cymbal-dev-sandbox-app"],
        supported_connectors=[
            "outlook-calendar",
            "outlook-email",
            "teams",
            "onedrive",
            "sharepoint",
            "enterprise-knowledge",
            "servicenow",
            "jira",
            "confluence",
        ],
        supported_mcp_tools=[
            "synthesize_skill_eval_dataset",
            "templatize_skill_environment",
            "extract_connectors_and_subskills",
            "evaluate_skill_six_rubric_benchmark",
        ],
        shared_skills=[],
        starter_prompts=[
            "Evaluate skill_id='incident-comm-summarizer' across the 6-Rubric benchmark",
            "Synthesize Shape A, Shape B, and Boundary eval cases for a SKILL.md",
        ],
        status="ACTIVE",
        subskills_count=0,
        version="1.0.0",
    ),
    models.AgentSummary(
        agent_id="infosec-review-agent",
        display_name="Enterprise InfoSec Review ADK Agent",
        resource_name="projects/457338748091/locations/us-central1/reasoningEngines/7840434074106724352",
        description=(
            "High-code control-plane InfoSec ADK Agent invoked during Stage 3 "
            "of the Skill Governance Pipeline to audit skills across 6 security "
            "controls (IS-1..IS-6) and compute SHA-256 security certificates."
        ),
        specialization="Governance Pipeline Stage 3: InfoSec Review ADK Agent",
        deployment_target="agent_runtime",
        pinned_apps=["cymbal-dev-sandbox-app"],
        supported_connectors=[],
        supported_mcp_tools=[
            "scan_is1_prompt_injection",
            "scan_is2_secrets_and_credentials",
            "scan_is3_external_endpoints",
            "audit_is4_python_scripts_ast",
            "evaluate_is5_iam_least_privilege",
            "verify_is6_zero_trust_isolation",
            "run_full_infosec_skill_audit",
        ],
        shared_skills=[],
        starter_prompts=[
            "Run full 6-control InfoSec audit (IS-1..IS-6) on skill_id='incident-comm-summarizer'",
            "Audit SKILL.md for prompt injection, secrets, and Zero-Trust parameterization",
        ],
        status="ACTIVE",
        subskills_count=0,
        version="1.0.0",
    ),
    models.AgentSummary(
        agent_id="incident-rca-agent",
        display_name="Incident RCA StreamAssist Copilot",
        resource_name="projects/457338748091/locations/us-central1/reasoningEngines/3743952816176103424",
        description=(
            "High-code Incident Root Cause Analysis (RCA) ADK Agent that "
            "investigates an Incident ID (e.g. INC0010042) via Gemini "
            "Enterprise :streamAssist across ServiceNow, Jira, SharePoint "
            "Runbooks, and M365 Teams using the signed-in user's OAuth token "
            "and Gemini Enterprise seat quota."
        ),
        specialization="High-Code StreamAssist Incident RCA & 5-Whys Analysis",
        deployment_target="agent_runtime",
        pinned_apps=[
            "cymbal-service-desk-app",
            "cymbal-dev-sandbox-app",
            "cymbal-ops-copilot-ge-eu",
            "cymbal-corporate-assistant-ge",
        ],
        supported_connectors=[
            "servicenow",
            "jira",
            "sharepoint",
            "teams",
            "outlook-email",
            "enterprise-knowledge",
        ],
        supported_mcp_tools=[
            "verify_user_stream_assist_auth",
            "retrieve_incident_telemetry_stream_assist",
            "correlate_change_and_runbooks_stream_assist",
            "generate_incident_rca_report_stream_assist",
        ],
        shared_skills=[
            "incident-comm-summarizer",
            "service-desk-major-incident-bridge",
        ],
        starter_prompts=[
            "Perform a full Root Cause Analysis for incident INC0010042 on cymbal-service-desk-app",
            "Run an Incident RCA for INC0010089 and include 5-Whys, CAPA actions, and StreamAssist quota audit",
            "Correlate ServiceNow incident INC0010042 with recent Jira changes and SharePoint SRE runbooks",
        ],
        status="ACTIVE",
        subskills_count=2,
        version="1.0.0",
    ),
]


def _sync_governance_agent_runtime_ids(
    agents: list[models.AgentSummary],
) -> None:
    """Updates resource_name for skill-eval-agent & infosec-review-agent from deployment_metadata.json."""
    try:
        from skill_governance_pipeline.adk_agent_client import (
            DEFAULT_INFOSEC_REVIEW_RUNTIME_ID,
            DEFAULT_SKILL_EVAL_RUNTIME_ID,
            INFOSEC_REVIEW_AGENT_DIR,
            SKILL_EVAL_AGENT_DIR,
            resolve_agent_runtime_metadata,
        )

        eval_meta = resolve_agent_runtime_metadata(
            SKILL_EVAL_AGENT_DIR,
            "SKILL_EVAL_AGENT_RUNTIME_ID",
            DEFAULT_SKILL_EVAL_RUNTIME_ID,
        )
        sec_meta = resolve_agent_runtime_metadata(
            INFOSEC_REVIEW_AGENT_DIR,
            "INFOSEC_REVIEW_AGENT_RUNTIME_ID",
            DEFAULT_INFOSEC_REVIEW_RUNTIME_ID,
        )
        for ag in agents:
            if ag.agent_id == "skill-eval-agent":
                ag.resource_name = str(eval_meta["remote_agent_runtime_id"])
            elif ag.agent_id == "infosec-review-agent":
                ag.resource_name = str(sec_meta["remote_agent_runtime_id"])
    except Exception:
        pass


def get_cymbal_agents_with_registry_skills(
    session: orm.Session | None = None,
) -> list[models.AgentSummary]:
    """Returns registered ADK/A2A agents enriched with Registry skills."""
    agents = [a.model_copy(deep=True) for a in CYMBAL_AGENTS]
    _sync_governance_agent_runtime_ids(agents)
    if session is None:
        return agents

    try:
        reg_rows = session.query(db_models.SkillRegistryRecord).all()
        for reg in reg_rows:
            target_ags = list(reg.target_agents or [])
            if not target_ags:
                target_ags = ["universal-skill-orchestrator"]
            for ag in agents:
                if ag.agent_id in target_ags:
                    skill_slug = reg.display_name or reg.skill_id
                    if (
                        reg.skill_id not in ag.shared_skills
                        and skill_slug not in ag.shared_skills
                    ):
                        ag.shared_skills.append(skill_slug)
                        ag.subskills_count = max(
                            ag.subskills_count, len(ag.shared_skills)
                        )
                    prompt_candidate = f"Run /{skill_slug} workflow"
                    if prompt_candidate not in ag.starter_prompts:
                        ag.starter_prompts.append(prompt_candidate)
    except Exception:  # pylint: disable=broad-except
        pass
    return agents


@router.get("", response_model=list[models.AgentSummary])
def list_agents(
    session: orm.Session = fastapi.Depends(database.get_db_session),
) -> list[models.AgentSummary]:
    """Returns registered High-Code Specialized ADK and A2A agents for Cymbal."""
    return get_cymbal_agents_with_registry_skills(session=session)
