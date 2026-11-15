"""Terraform & REST provisioning service with state isolation and plan gates."""

import datetime
import os
import pathlib
import re
import subprocess
import tempfile
import threading
import uuid
from typing import Any

from sqlalchemy import orm

from app import config
from app import db_models
from app import models

INFRA_ROOT = pathlib.Path(__file__).resolve().parents[3] / "infra"

SENSITIVE_KEYS = frozenset(
    {
        "m365_client_secret",
        "wif_oidc_client_secret",
        "client_secret",
        "cloud_identity_default_temp_password",
        "servicenow_admin_password",
        "atlassian_client_secret",
        "atlassian_api_token",
    }
)

ONBOARDING_STEPS_CATALOG: list[models.OnboardingStepDefinition] = [
    models.OnboardingStepDefinition(
        step_id="0C",
        phase_label="Phase 0C",
        cli_flag="--step-0c",
        cli_alias="--gcp-foundation",
        title="GCP APIs & Remote Terraform State Bucket",
        description=(
            "Enables 14 required GCP APIs (Discovery Engine, Cloud Identity, "
            "Admin SDK, Secret Manager, Vertex AI, Agent Registry, Cloud DNS) "
            "and creates the versioned GCS Terraform state bucket."
        ),
        api_endpoint="POST /api/v1/admin/provisioning/onboard/step/0C",
        script_or_stack="infra/onboard_customer.sh (Phase 0C)",
        default_enabled=True,
    ),
    models.OnboardingStepDefinition(
        step_id="0B",
        phase_label="Phase 0B",
        cli_flag="--step-0b",
        cli_alias="--google-admin",
        title="Google Admin Console & Cloud Identity Bootstrap",
        description=(
            "Auto-discovers CLOUD_IDENTITY_CUSTOMER_ID & GCP_ORG_ID, verifies "
            "corporate domain via DNS TXT & Site Verification API, and assigns "
            "Inbound SAML SSO Profile to the Root Org Unit."
        ),
        api_endpoint="POST /api/v1/admin/provisioning/onboard/step/0B",
        script_or_stack="infra/deploy_google_admin_bootstrap.sh",
        default_enabled=True,
    ),
    models.OnboardingStepDefinition(
        step_id="0A",
        phase_label="Phase 0A",
        cli_flag="--step-0a",
        cli_alias="--entra-bootstrap",
        title="Microsoft Entra ID OAuth + 49 Scopes + SAML 2.0 Gallery App",
        description=(
            "Provisions the Entra OAuth 2.0 App Registration with 49 M365/Graph "
            "permissions & Admin Consent, syncs credentials to GCP Secret "
            "Manager, and instantiates the SAML 2.0 Gallery App."
        ),
        api_endpoint="POST /api/v1/admin/provisioning/onboard/step/0A",
        script_or_stack=(
            "infra/deploy_entra_bootstrap.sh + infra/stacks/00-entra-bootstrap"
        ),
        default_enabled=True,
    ),
    models.OnboardingStepDefinition(
        step_id="0D",
        phase_label="Phase 0D",
        cli_flag="--step-0d",
        cli_alias="--servicenow-bootstrap",
        title="Optional: ServiceNow Instance Bootstrap (User, Roles, OAuth 2.0 & Secret Sync)",
        description=(
            "Creates the ServiceNow integration user, ITSM/KB/Catalog roles, "
            "OAuth 2.0 client endpoint, and syncs credentials to Secret Manager."
        ),
        api_endpoint="POST /api/v1/admin/provisioning/onboard/step/0D",
        script_or_stack="infra/deploy_servicenow_bootstrap.sh",
        default_enabled=False,
    ),
    models.OnboardingStepDefinition(
        step_id="0E",
        phase_label="Phase 0E",
        cli_flag="--step-0e",
        cli_alias="--atlassian-bootstrap",
        title="Optional: Atlassian Cloud Bootstrap (Tenant Cloud ID, OAuth 2.0 3LO & Secret Sync)",
        description=(
            "Discovers Atlassian Tenant Cloud ID, validates OAuth 2.0 (3LO) "
            "credentials, and syncs Jira/Confluence secrets to Secret Manager."
        ),
        api_endpoint="POST /api/v1/admin/provisioning/onboard/step/0E",
        script_or_stack="infra/deploy_atlassian_bootstrap.sh",
        default_enabled=False,
    ),
    models.OnboardingStepDefinition(
        step_id="1A",
        phase_label="Phase 1A",
        cli_flag="--step-1a",
        cli_alias="--directory-sync",
        title="GCP Directory Sync Configuration & GE UserStore License Sync",
        description=(
            "Configures & validates Google Cloud Identity Directory Sync and "
            "synchronizes Gemini Enterprise user licenses."
        ),
        api_endpoint="POST /api/v1/admin/provisioning/onboard/step/1A",
        script_or_stack="infra/deploy_gcp_directory_sync.sh",
        default_enabled=True,
    ),
    models.OnboardingStepDefinition(
        step_id="1B",
        phase_label="Phase 1B",
        cli_flag="--step-1b",
        cli_alias="--identity-terraform",
        title="Stack 01: Cloud Identity Per-App Group Nesting & SAML Handshake",
        description=(
            "Syncs Entra Security Groups 1:1 into Cloud Identity, nests them "
            "into per-app access groups, and completes the SAML SSO handshake."
        ),
        api_endpoint=(
            "POST /api/v1/admin/provisioning/onboard/step/1B "
            "(or POST /api/v1/admin/provisioning/identity)"
        ),
        script_or_stack=(
            "infra/deploy_identity.sh + infra/stacks/01-identity-foundation"
        ),
        default_enabled=True,
    ),
    models.OnboardingStepDefinition(
        step_id="1C",
        phase_label="Phase 1C",
        cli_flag="--step-1c",
        cli_alias="--seed-demo-csv",
        title="Optional Sandbox CSV Group Membership Seeding",
        description=(
            "Seeds Cloud Identity group memberships from a CSV file for "
            "sandbox/demo environments without SCIM Directory Sync."
        ),
        api_endpoint="POST /api/v1/admin/provisioning/onboard/step/1C",
        script_or_stack="infra/sync_group_members_from_csv.sh",
        default_enabled=False,
    ),
    models.OnboardingStepDefinition(
        step_id="2",
        phase_label="Phase 2",
        cli_flag="--step-2",
        cli_alias="--m365-connectors",
        title="Stack 03: Shared M365 Connectors (SharePoint, OneDrive, Outlook, Teams)",
        description=(
            "Provisions shared M365 federated & write-action connectors "
            "(<customer>-m365-sp, -od, -ol, -teams) in isolated workspace."
        ),
        api_endpoint=(
            "POST /api/v1/admin/provisioning/onboard/step/2 "
            "(or POST /api/v1/admin/provisioning/m365)"
        ),
        script_or_stack=(
            "infra/deploy_m365.sh + infra/stacks/03-m365-connectors"
        ),
        default_enabled=True,
    ),
    models.OnboardingStepDefinition(
        step_id="2B",
        phase_label="Phase 2B",
        cli_flag="--step-2b",
        cli_alias="--servicenow-connector",
        title="Optional Stack 03B: Shared ServiceNow Connector (KB, Incidents, Catalog & Actions)",
        description=(
            "Provisions the shared ServiceNow connector and BAP write actions "
            "in isolated Terraform workspace."
        ),
        api_endpoint="POST /api/v1/admin/provisioning/onboard/step/2B",
        script_or_stack="infra/deploy_servicenow.sh + infra/terraform-servicenow",
        default_enabled=False,
    ),
    models.OnboardingStepDefinition(
        step_id="2C",
        phase_label="Phase 2C",
        cli_flag="--step-2c",
        cli_alias="--atlassian-connectors",
        title="Optional Stack 03C: Shared Atlassian Connectors (Jira Cloud, Confluence Cloud & Actions)",
        description=(
            "Provisions shared Jira Cloud & Confluence Cloud federated "
            "connectors and BAP actions."
        ),
        api_endpoint="POST /api/v1/admin/provisioning/onboard/step/2C",
        script_or_stack="infra/deploy_atlassian.sh + infra/terraform-atlassian",
        default_enabled=False,
    ),
    models.OnboardingStepDefinition(
        step_id="3",
        phase_label="Phase 3",
        cli_flag="--step-3",
        cli_alias="--ge-apps",
        title="Stack 02: Departmental Gemini Enterprise Apps (16-Point Master Template)",
        description=(
            "Provisions isolated departmental GE Apps (Dev Sandbox, Service "
            "Desk, Finance, HR) from the 16-Point Master App Template."
        ),
        api_endpoint=(
            "POST /api/v1/admin/provisioning/onboard/step/3 "
            "(or POST /api/v1/admin/provisioning/ge-app)"
        ),
        script_or_stack=(
            "infra/create_app_from_template.sh + infra/stacks/02-ge-app-instance"
        ),
        default_enabled=True,
    ),
    models.OnboardingStepDefinition(
        step_id="4",
        phase_label="Phase 4",
        cli_flag="--step-4",
        cli_alias="--universal-agent",
        title="Optional: Deploy & Pin High-Code ADK Agents across GE Apps",
        description=(
            "Deploys Universal ADK Skill Orchestrator & Incident RCA Agent to "
            "Vertex AI Agent Runtime and pins them across customer GE Apps."
        ),
        api_endpoint=(
            "POST /api/v1/admin/provisioning/onboard/step/4 "
            "(or POST /api/v1/admin/provisioning/ge-agents/publish)"
        ),
        script_or_stack=(
            "infra/publish_universal_agent.sh + agents-cli publish"
        ),
        default_enabled=False,
    ),
    models.OnboardingStepDefinition(
        step_id="5",
        phase_label="Phase 5",
        cli_flag="--step-5",
        cli_alias="--skill-sharing",
        title="Optional: 6-Rubric Skill Benchmark Gate, GCS Upload & Multi-App Skill Sharing",
        description=(
            "Runs the 6-Rubric Skill Benchmark Gate, uploads approved skills "
            "to GCS catalog, and distributes them across departmental GE Apps."
        ),
        api_endpoint="POST /api/v1/admin/provisioning/onboard/step/5",
        script_or_stack="infra/publish_m365_skills.sh + skillgp",
        default_enabled=False,
    ),
]


def get_onboarding_steps_catalog() -> list[models.OnboardingStepDefinition]:
    """Returns all 14 customer onboarding step definitions."""
    return [step.model_copy(deep=True) for step in ONBOARDING_STEPS_CATALOG]


def resolve_onboarding_steps(
    only_steps: list[str] | None = None,
    skip_steps: list[str] | None = None,
    seed_demo_csv: bool = False,
) -> tuple[list[str], list[str]]:
    """Resolves ordered enabled_steps and skipped_steps from CLI/API filters."""
    all_ids = [s.step_id for s in ONBOARDING_STEPS_CATALOG]
    enabled_map = {
        s.step_id: (True if (s.step_id == "1C" and seed_demo_csv) else s.default_enabled)
        for s in ONBOARDING_STEPS_CATALOG
    }

    def _expand(code: str) -> list[str]:
        norm = code.strip().upper()
        if norm == "1":
            return ["1A", "1B"]
        if norm in enabled_map:
            return [norm]
        raise ValueError(
            f"Unknown onboarding step '{code}'. Valid steps: {', '.join(all_ids)}"
        )

    if only_steps:
        for k in enabled_map:
            enabled_map[k] = False
        for raw_item in only_steps:
            for part in str(raw_item).split(","):
                if part.strip():
                    for cid in _expand(part):
                        enabled_map[cid] = True

    if skip_steps:
        for raw_item in skip_steps:
            for part in str(raw_item).split(","):
                if part.strip():
                    for cid in _expand(part):
                        enabled_map[cid] = False

    enabled = [sid for sid in all_ids if enabled_map[sid]]
    skipped = [sid for sid in all_ids if not enabled_map[sid]]
    return enabled, skipped

_BEARER_PATTERN = re.compile(
    r"(Bearer\s+)[A-Za-z0-9._\-~+/]+=*",
    re.IGNORECASE,
)
_YA29_PATTERN = re.compile(r"ya29\.[A-Za-z0-9._\-]+")

_LOCK_GUARD = threading.Lock()
_ACTIVE_WORKSPACE_LOCKS: dict[str, str] = {}


def _utc_now() -> datetime.datetime:
    """Returns current UTC timestamp."""
    return datetime.datetime.now(datetime.timezone.utc)


def _slugify(value: str) -> str:
    """Normalizes a string into a safe Terraform workspace slug."""
    cleaned = re.sub(r"[^a-zA-Z0-9\-]+", "-", value.strip().lower()).strip("-")
    return cleaned or "default"


def acquire_workspace_lock(workspace_key: str, job_id: str) -> None:
    """Acquires an exclusive lock on a Terraform workspace key.

    Args:
        workspace_key: Target Terraform workspace identifier.
        job_id: Provisioning job ID acquiring the lock.

    Raises:
        ValueError: If another job already holds the lock for workspace_key.
    """
    with _LOCK_GUARD:
        holder = _ACTIVE_WORKSPACE_LOCKS.get(workspace_key)
        if holder and holder != job_id:
            raise ValueError(
                f"Workspace state lock for '{workspace_key}' is currently "
                f"held by active job '{holder}'."
            )
        _ACTIVE_WORKSPACE_LOCKS[workspace_key] = job_id


def release_workspace_lock(workspace_key: str, job_id: str) -> None:
    """Releases a workspace state lock if held by job_id."""
    with _LOCK_GUARD:
        if _ACTIVE_WORKSPACE_LOCKS.get(workspace_key) == job_id:
            _ACTIVE_WORKSPACE_LOCKS.pop(workspace_key, None)


def get_active_workspace_locks() -> list[str]:
    """Returns sorted list of currently locked workspace keys."""
    with _LOCK_GUARD:
        return sorted(_ACTIVE_WORKSPACE_LOCKS.keys())


def sanitize_config_dict(raw: dict[str, Any]) -> dict[str, Any]:
    """Replaces sensitive credential fields with '***REDACTED***'."""
    sanitized: dict[str, Any] = {}
    for key, val in raw.items():
        if key.lower() in SENSITIVE_KEYS or "secret" in key.lower():
            sanitized[key] = "***REDACTED***" if val else ""
        else:
            sanitized[key] = val
    return sanitized


def redact_sensitive_text(text: str, secrets: list[str]) -> str:
    """Redacts secret values and OAuth bearer tokens from log output."""
    redacted = _BEARER_PATTERN.sub(r"\1***REDACTED***", text)
    redacted = _YA29_PATTERN.sub("ya29.***REDACTED***", redacted)
    for sec in secrets:
        clean_sec = (sec or "").strip()
        if len(clean_sec) >= 4:
            redacted = redacted.replace(clean_sec, "***REDACTED***")
    return redacted


def to_job_item(record: db_models.ProvisioningJobRecord) -> (
    models.ProvisioningJobItem
):
    """Converts a ProvisioningJobRecord ORM instance to ProvisioningJobItem."""
    return models.ProvisioningJobItem(
        job_id=record.job_id,
        stack_type=record.stack_type,
        title=record.title,
        workspace_key=record.workspace_key,
        state_backend_type=record.state_backend_type,
        state_bucket=record.state_bucket,
        state_prefix=record.state_prefix,
        execution_mode=record.execution_mode,
        status=record.status,
        initiated_by=record.initiated_by,
        approved_by=record.approved_by,
        sanitized_config=dict(record.sanitized_config or {}),
        plan_summary=record.plan_summary or "",
        log_lines=list(record.log_lines or []),
        outputs=dict(record.outputs or {}),
        error_message=record.error_message,
        created_at=(
            record.created_at.isoformat() if record.created_at else None
        ),
        updated_at=(
            record.updated_at.isoformat() if record.updated_at else None
        ),
        completed_at=(
            record.completed_at.isoformat() if record.completed_at else None
        ),
    )


def _build_env_and_secrets(
    stack_type: str,
    raw_config: dict[str, Any],
    workspace_key: str,
    state_prefix: str,
) -> tuple[dict[str, str], dict[str, str], list[str]]:
    """Builds non-secret config.env entries and ephemeral secret env vars."""
    file_vars: dict[str, str] = {
        "GCP_PROJECT_ID": str(raw_config.get("gcp_project_id", "mohandemo")),
        "GCP_REGION": str(raw_config.get("gcp_region", "us-central1")),
        "GE_LOCATION": str(raw_config.get("ge_location", "global")),
        "TF_STATE_BUCKET": str(raw_config.get("tf_state_bucket", "")),
        "TF_STATE_PREFIX": state_prefix,
        "TF_WORKSPACE_OVERRIDE": workspace_key,
    }
    ephemeral_env: dict[str, str] = {
        "CLOUDSDK_METRICS_ENVIRONMENT": "geapphub",
        "TF_WORKSPACE_OVERRIDE": workspace_key,
        "TF_STATE_PREFIX": state_prefix,
    }
    secrets: list[str] = []

    for sec_key in ("m365_client_secret", "wif_oidc_client_secret"):
        val = str(raw_config.get(sec_key) or "").strip()
        if val:
            secrets.append(val)
            env_name = sec_key.upper()
            ephemeral_env[env_name] = val
            ephemeral_env[f"TF_VAR_{sec_key}"] = val

    if stack_type == "GE_APP":
        app_id = str(raw_config.get("ge_app_id", "")).strip()
        ds_id = (
            str(raw_config.get("ge_data_store_id") or "").strip()
            or f"{app_id}-ds"
        )
        app_disp = raw_config.get("ge_app_display_name", app_id)
        ds_name = (
            str(raw_config.get("ge_data_store_display_name") or "").strip()
            or f"{app_disp} Knowledge Store"
        )
        bucket = (
            str(raw_config.get("ge_gcs_bucket_name") or "").strip()
            or f"{file_vars['GCP_PROJECT_ID']}-{app_id}-docs"
        )
        file_vars.update(
            {
                "GE_APP_ID": app_id,
                "GE_APP_DISPLAY_NAME": str(
                    raw_config.get("ge_app_display_name", app_id)
                ),
                "GE_COMPANY_NAME": str(
                    raw_config.get("ge_company_name", "Enterprise Corp")
                ),
                "GE_SOLUTION_TYPE": str(
                    raw_config.get("ge_solution_type", "SOLUTION_TYPE_SEARCH")
                ),
                "GE_SEARCH_TIER": str(
                    raw_config.get("ge_search_tier", "SEARCH_TIER_ENTERPRISE")
                ),
                "GE_ENABLE_LLM_ADDON": (
                    "true"
                    if raw_config.get("ge_enable_llm_addon", True)
                    else "false"
                ),
                "GE_INDUSTRY_VERTICAL": str(
                    raw_config.get("ge_industry_vertical", "GENERIC")
                ),
                "GE_DATA_STORE_ID": ds_id,
                "GE_DATA_STORE_DISPLAY_NAME": ds_name,
                "GE_BACKING_STORAGE_TYPE": str(
                    raw_config.get("ge_backing_storage_type", "GCS")
                ),
                "GE_GCS_BUCKET_NAME": bucket,
                "GE_BQ_DATASET_ID": str(
                    raw_config.get("ge_bq_dataset_id", "gemini_enterprise_data")
                ),
                "GE_IDENTITY_PROVIDER_TYPE": str(
                    raw_config.get("ge_identity_provider_type", "GSUITE")
                ),
                "GE_WORKFORCE_IDENTITY_POOL": str(
                    raw_config.get("ge_workforce_identity_pool", "")
                ),
                "GE_CUSTOMER_DOMAIN": str(
                    raw_config.get(
                        "ge_customer_domain", "mohanrajs.altostrat.com"
                    )
                ),
                "GE_APP_ACCESS_GROUP": str(
                    raw_config.get("ge_app_access_group", "")
                ),
                "GE_APP_GROUP_MEMBERS": str(
                    raw_config.get("ge_app_group_members", "")
                ),
                "GE_ENABLE_COMMON_CONNECTORS": (
                    "true"
                    if raw_config.get("enable_common_connectors", True)
                    else "false"
                ),
                "ENABLE_AGENT_REGISTRATION": (
                    "true"
                    if raw_config.get("enable_agent_registration", False)
                    else "false"
                ),
                "AGENT_ID": str(
                    raw_config.get("agent_id", "universal-skill-orchestrator")
                ),
                "AGENT_DISPLAY_NAME": str(
                    raw_config.get(
                        "agent_display_name", "Enterprise Skill Orchestrator"
                    )
                ),
                "AGENT_DESCRIPTION": str(
                    raw_config.get("agent_description", "")
                ),
                "AGENT_REASONING_ENGINE": str(
                    raw_config.get("agent_reasoning_engine", "")
                ),
            }
        )
    elif stack_type == "IDENTITY_WIF":
        file_vars.update(
            {
                "GCP_ORG_ID": str(raw_config.get("gcp_org_id", "123456789012")),
                "CLOUD_IDENTITY_CUSTOMER_ID": str(
                    raw_config.get(
                        "cloud_identity_customer_id", "customers/C01234567"
                    )
                ),
                "PRIMARY_CUSTOMER_DOMAIN": str(
                    raw_config.get(
                        "primary_customer_domain", "mohanrajs.altostrat.com"
                    )
                ),
                "SHARED_IDENTITY_DOMAIN": str(
                    raw_config.get(
                        "shared_identity_domain", "mohanrajs.altostrat.com"
                    )
                ),
                "M365_SECRET_ID": str(
                    raw_config.get(
                        "m365_secret_id", "m365-connector-credentials"
                    )
                ),
                "M365_TENANT_ID": str(raw_config.get("m365_tenant_id", "")),
                "M365_CLIENT_ID": str(raw_config.get("m365_client_id", "")),
                "ENTRA_GROUP_FILTER": str(
                    raw_config.get("entra_group_filter", "")
                ),
                "ENTRA_TO_APP_GROUP_MAPPINGS": str(
                    raw_config.get("entra_to_app_group_mappings", "")
                ),
                "ENABLE_CLOUD_IDENTITY_SAML_SSO": (
                    "true"
                    if raw_config.get("enable_cloud_identity_saml_sso", True)
                    else "false"
                ),
                "SAML_SSO_PROFILE_DISPLAY_NAME": str(
                    raw_config.get(
                        "saml_sso_profile_display_name",
                        "Microsoft Entra ID SSO",
                    )
                ),
                "ENABLE_WORKFORCE_POOL_OIDC": (
                    "true"
                    if raw_config.get("enable_workforce_pool_oidc", False)
                    else "false"
                ),
                "WORKFORCE_POOL_ID": str(
                    raw_config.get("workforce_pool_id", "entra-id-shared-pool")
                ),
                "WORKFORCE_PROVIDER_ID": str(
                    raw_config.get(
                        "workforce_provider_id", "entra-id-oidc-provider"
                    )
                ),
            }
        )
    elif stack_type == "M365_CONNECTORS":
        prefix = str(raw_config.get("m365_collection_prefix", "m365"))
        file_vars.update(
            {
                "M365_COLLECTION_PREFIX": prefix,
                "GE_APP_ID": str(raw_config.get("ge_app_id", "")),
                "M365_SECRET_ID": str(
                    raw_config.get(
                        "m365_secret_id", "m365-connector-credentials"
                    )
                ),
                "M365_TENANT_ID": str(raw_config.get("m365_tenant_id", "")),
                "M365_CLIENT_ID": str(raw_config.get("m365_client_id", "")),
                "M365_CONNECTOR_MODE": str(
                    raw_config.get("m365_connector_mode", "FEDERATED")
                ),
                "ENABLE_M365_ACTIONS": (
                    "true"
                    if raw_config.get("enable_m365_actions", True)
                    else "false"
                ),
                "ENABLE_SHAREPOINT_CONNECTOR": (
                    "true"
                    if raw_config.get("enable_sharepoint_connector", True)
                    else "false"
                ),
                "M365_SHAREPOINT_COLLECTION_ID": f"{prefix}-sp",
                "M365_SHAREPOINT_INSTANCE_URI": str(
                    raw_config.get(
                        "m365_sharepoint_instance_uri",
                        "https://contoso.sharepoint.com",
                    )
                ),
                "ENABLE_ONEDRIVE_CONNECTOR": (
                    "true"
                    if raw_config.get("enable_onedrive_connector", True)
                    else "false"
                ),
                "M365_ONEDRIVE_COLLECTION_ID": f"{prefix}-od",
                "M365_ONEDRIVE_INSTANCE_URI": str(
                    raw_config.get(
                        "m365_onedrive_instance_uri",
                        "https://contoso-my.sharepoint.com",
                    )
                ),
                "ENABLE_OUTLOOK_CONNECTOR": (
                    "true"
                    if raw_config.get("enable_outlook_connector", True)
                    else "false"
                ),
                "M365_OUTLOOK_COLLECTION_ID": f"{prefix}-ol",
                "ENABLE_TEAMS_CONNECTOR": (
                    "true"
                    if raw_config.get("enable_teams_connector", True)
                    else "false"
                ),
                "M365_TEAMS_COLLECTION_ID": f"{prefix}-teams",
            }
        )
    elif stack_type == "CUSTOMER_ONBOARD":
        cust = str(raw_config.get("customer_name", "cymbal")).strip()
        dom = str(
            raw_config.get(
                "customer_domain", "mohanrajs.demo.altostrat.com"
            )
        ).strip()
        enabled_steps, skipped_steps = resolve_onboarding_steps(
            only_steps=list(raw_config.get("only_steps") or []),
            skip_steps=list(raw_config.get("skip_steps") or []),
            seed_demo_csv=bool(raw_config.get("seed_demo_csv", False)),
        )
        enabled_set = set(enabled_steps)
        target_apps = raw_config.get("target_apps") or []
        if isinstance(target_apps, list):
            target_apps_csv = ",".join(str(a).strip() for a in target_apps if str(a).strip())
        else:
            target_apps_csv = str(target_apps).strip()

        for sec_k, env_k in (
            ("servicenow_admin_password", "SN_ADMIN_PASSWORD"),
            ("atlassian_client_secret", "ATLASSIAN_CLIENT_SECRET"),
            ("atlassian_api_token", "ATLASSIAN_API_TOKEN"),
        ):
            s_val = str(raw_config.get(sec_k) or "").strip()
            if s_val:
                secrets.append(s_val)
                ephemeral_env[env_k] = s_val

        file_vars.update(
            {
                "CUSTOMER_NAME": cust,
                "CUSTOMER_DOMAIN": dom,
                "ENTRA_TENANT_ID": str(
                    raw_config.get(
                        "entra_tenant_id",
                        "10a65113-9363-432b-bd99-a575f3337dd2",
                    )
                ),
                "DNS_PROJECT_ID": str(
                    raw_config.get("dns_project_id")
                    or file_vars["GCP_PROJECT_ID"]
                ),
                "DNS_ZONE_NAME": str(raw_config.get("dns_zone_name", "")),
                "ENTRA_MODE": str(raw_config.get("entra_mode", "terraform")),
                "SERVICENOW_INSTANCE_URI": str(
                    raw_config.get(
                        "servicenow_instance_uri",
                        "https://gcpconnector3.service-now.com",
                    )
                ),
                "SERVICENOW_ADMIN_USER": str(
                    raw_config.get("servicenow_admin_user", "admin")
                ),
                "ATLASSIAN_INSTANCE_URI": str(
                    raw_config.get(
                        "atlassian_instance_uri",
                        "https://mohanrajs-team.atlassian.net",
                    )
                ),
                "ATLASSIAN_INSTANCE_ID": str(
                    raw_config.get("atlassian_instance_id", "")
                ),
                "ATLASSIAN_ADMIN_EMAIL": str(
                    raw_config.get("atlassian_admin_email", "")
                ),
                "ATLASSIAN_CLIENT_ID": str(
                    raw_config.get("atlassian_client_id", "")
                ),
                "MEMBERS_CSV": str(raw_config.get("members_csv", "")),
                "PHASE_3_TARGET_APPS": target_apps_csv,
                "PHASE_4_DEPLOY_REASONING_ENGINE": (
                    "true"
                    if raw_config.get("deploy_reasoning_engine", True)
                    else "false"
                ),
                "ENABLE_PHASE_0C_GCP_FOUNDATION": (
                    "true" if "0C" in enabled_set else "false"
                ),
                "ENABLE_PHASE_0B_GOOGLE_ADMIN": (
                    "true" if "0B" in enabled_set else "false"
                ),
                "ENABLE_PHASE_0A_ENTRA_BOOTSTRAP": (
                    "true" if "0A" in enabled_set else "false"
                ),
                "ENABLE_PHASE_0D_SERVICENOW_BOOTSTRAP": (
                    "true" if "0D" in enabled_set else "false"
                ),
                "ENABLE_PHASE_0E_ATLASSIAN_BOOTSTRAP": (
                    "true" if "0E" in enabled_set else "false"
                ),
                "ENABLE_PHASE_1A_DIRECTORY_SYNC": (
                    "true" if "1A" in enabled_set else "false"
                ),
                "ENABLE_PHASE_1B_IDENTITY_TERRAFORM": (
                    "true" if "1B" in enabled_set else "false"
                ),
                "ENABLE_PHASE_1C_DEMO_CSV_SEED": (
                    "true" if "1C" in enabled_set else "false"
                ),
                "ENABLE_PHASE_2_M365_CONNECTORS": (
                    "true" if "2" in enabled_set else "false"
                ),
                "ENABLE_PHASE_2B_SERVICENOW_CONNECTOR": (
                    "true" if "2B" in enabled_set else "false"
                ),
                "ENABLE_PHASE_2C_ATLASSIAN_CONNECTORS": (
                    "true" if "2C" in enabled_set else "false"
                ),
                "ENABLE_PHASE_3_GE_APPS": (
                    "true" if "3" in enabled_set else "false"
                ),
                "ENABLE_PHASE_4_UNIVERSAL_AGENT": (
                    "true" if "4" in enabled_set else "false"
                ),
                "ENABLE_PHASE_5_SKILL_SHARING": (
                    "true" if "5" in enabled_set else "false"
                ),
                "ENABLED_STEPS_CSV": ",".join(enabled_steps),
                "SKIPPED_STEPS_CSV": ",".join(skipped_steps),
            }
        )

    return file_vars, ephemeral_env, secrets


class TerraformProvisioningService:
    """Executes Terraform stacks with workspace locks and plan gates."""

    def __init__(self, settings: config.Settings | None = None) -> None:
        self._settings = settings or config.get_settings()

    def _compute_workspace_and_prefix(
        self,
        stack_type: str,
        raw_config: dict[str, Any],
    ) -> tuple[str, str, str]:
        """Computes isolated workspace_key, state_prefix, and title."""
        loc = _slugify(str(raw_config.get("ge_location", "global")))
        if stack_type == "CUSTOMER_ONBOARD":
            cust = _slugify(str(raw_config.get("customer_name", "cymbal")))
            enabled_steps, _ = resolve_onboarding_steps(
                only_steps=list(raw_config.get("only_steps") or []),
                skip_steps=list(raw_config.get("skip_steps") or []),
                seed_demo_csv=bool(raw_config.get("seed_demo_csv", False)),
            )
            step_slug = (
                _slugify("-".join(enabled_steps).lower())
                if len(enabled_steps) <= 4
                else "all-phases"
            )
            workspace = f"onboard-{cust}-{step_slug}"
            prefix = f"gemini-enterprise/onboard/{cust}/{step_slug}"
            steps_label = ",".join(enabled_steps) if len(enabled_steps) < 13 else "All 14 Steps"
            title = (
                f"Customer Onboarding ({cust} • {raw_config.get('customer_domain', '')} "
                f"• Steps: {steps_label})"
            )
            return workspace, prefix, title
        if stack_type == "GE_APP":
            app_id = _slugify(str(raw_config.get("ge_app_id", "ge-app")))
            workspace = f"app-{loc}-{app_id}"
            prefix = f"gemini-enterprise/apps/{loc}/{app_id}"
            title = (
                f"GE App: {raw_config.get('ge_app_display_name') or app_id} "
                f"({loc})"
            )
            return workspace, prefix, title
        if stack_type == "IDENTITY_WIF":
            domain = _slugify(
                str(raw_config.get("primary_customer_domain", "corp"))
            )
            pool = _slugify(
                str(raw_config.get("workforce_pool_id", "identity-sync"))
            )
            workspace = f"id-{domain}-{pool}"
            prefix = f"gemini-enterprise/identity/{domain}/{pool}"
            title = (
                f"Identity & WIF: {raw_config.get('primary_customer_domain')} "
                f"({pool})"
            )
            return workspace, prefix, title
        prefix_slug = _slugify(
            str(raw_config.get("m365_collection_prefix", "m365"))
        )
        workspace = f"m365-{loc}-{prefix_slug}"
        prefix = f"gemini-enterprise/m365/{loc}/{prefix_slug}"
        app_target = raw_config.get("ge_app_id") or "standalone"
        title = f"M365 Connectors ({prefix_slug} -> {app_target})"
        return workspace, prefix, title

    def create_and_run_plan(
        self,
        session: orm.Session,
        stack_type: str,
        raw_config: dict[str, Any],
        initiated_by: str,
    ) -> db_models.ProvisioningJobRecord:
        """Creates a provisioning job, locks workspace, and runs plan/apply."""
        workspace_key, state_prefix, title = self._compute_workspace_and_prefix(
            stack_type, raw_config
        )
        job_id = f"prov-{uuid.uuid4().hex[:10]}"
        acquire_workspace_lock(workspace_key, job_id)

        state_bucket = str(raw_config.get("tf_state_bucket") or "").strip()
        backend_type = "GCS_REMOTE" if state_bucket else "LOCAL_WORKSPACE"
        exec_mode = (
            str(raw_config.get("execution_mode") or "PLAN_AND_WAIT")
            .strip()
            .upper()
        )

        record = db_models.ProvisioningJobRecord(
            job_id=job_id,
            stack_type=stack_type,
            title=title,
            workspace_key=workspace_key,
            state_backend_type=backend_type,
            state_bucket=state_bucket,
            state_prefix=state_prefix,
            execution_mode=exec_mode,
            status="PLANNING",
            initiated_by=initiated_by,
            sanitized_config=sanitize_config_dict(raw_config),
            log_lines=[],
            outputs={},
        )
        session.add(record)
        session.commit()

        try:
            self._execute_phase(
                session=session,
                record=record,
                raw_config=raw_config,
                phase="PLAN",
            )
            if exec_mode == "APPLY" and record.status != "FAILED":
                self._execute_phase(
                    session=session,
                    record=record,
                    raw_config=raw_config,
                    phase="APPLY",
                )
        finally:
            if record.status != "PENDING_APPROVAL":
                release_workspace_lock(workspace_key, job_id)
        return record

    def approve_and_apply(
        self,
        session: orm.Session,
        job_id: str,
        approver_email: str,
        notes: str = "",
    ) -> db_models.ProvisioningJobRecord:
        """Approves a PENDING_APPROVAL job and executes the Terraform apply."""
        record = (
            session.query(db_models.ProvisioningJobRecord)
            .filter_by(job_id=job_id)
            .one_or_none()
        )
        if record is None:
            raise KeyError(f"Provisioning job '{job_id}' not found.")
        if record.status != "PENDING_APPROVAL":
            raise ValueError(
                f"Job '{job_id}' is in status '{record.status}', "
                "expected 'PENDING_APPROVAL'."
            )

        acquire_workspace_lock(record.workspace_key, record.job_id)
        try:
            record.approved_by = approver_email
            logs = list(record.log_lines or [])
            logs.append(
                f"[APPROVAL] Plan approved by {approver_email}"
                + (f" ({notes})" if notes else "")
            )
            record.log_lines = logs
            record.status = "APPLYING"
            session.commit()

            self._execute_phase(
                session=session,
                record=record,
                raw_config=dict(record.sanitized_config or {}),
                phase="APPLY",
            )
        finally:
            release_workspace_lock(record.workspace_key, record.job_id)
        return record

    def reject_job(
        self,
        session: orm.Session,
        job_id: str,
        reviewer_email: str,
        notes: str = "",
    ) -> db_models.ProvisioningJobRecord:
        """Rejects a PENDING_APPROVAL job and releases its workspace lock."""
        record = (
            session.query(db_models.ProvisioningJobRecord)
            .filter_by(job_id=job_id)
            .one_or_none()
        )
        if record is None:
            raise KeyError(f"Provisioning job '{job_id}' not found.")
        release_workspace_lock(record.workspace_key, record.job_id)
        record.status = "REJECTED"
        record.approved_by = reviewer_email
        logs = list(record.log_lines or [])
        logs.append(
            f"[REJECTED] Plan rejected by {reviewer_email}"
            + (f": {notes}" if notes else "")
        )
        record.log_lines = logs
        record.completed_at = _utc_now()
        session.commit()
        return record

    def _execute_phase(
        self,
        session: orm.Session,
        record: db_models.ProvisioningJobRecord,
        raw_config: dict[str, Any],
        phase: str,
    ) -> None:
        """Executes the PLAN (dry-run) or APPLY phase and records logs."""
        file_vars, ephemeral_env, secrets = _build_env_and_secrets(
            stack_type=record.stack_type,
            raw_config=raw_config,
            workspace_key=record.workspace_key,
            state_prefix=record.state_prefix,
        )
        logs = list(record.log_lines or [])
        logs.append(
            f"[{phase}] Workspace='{record.workspace_key}' "
            f"Backend='{record.state_backend_type}' "
            f"Prefix='{record.state_prefix}'"
        )
        logs.append(
            "[SECURITY] Sensitive credentials injected via ephemeral "
            "TF_VAR_* environment (zero plaintext secret files on disk)."
        )

        script_map = {
            "GE_APP": INFRA_ROOT / "deploy.sh",
            "IDENTITY_WIF": INFRA_ROOT / "deploy_identity.sh",
            "M365_CONNECTORS": INFRA_ROOT / "deploy_m365.sh",
            "CUSTOMER_ONBOARD": INFRA_ROOT / "onboard_customer.sh",
        }
        script_path = script_map[record.stack_type]

        with tempfile.NamedTemporaryFile(
            mode="w",
            suffix=".env",
            prefix=f"{record.job_id}-",
            delete=False,
            encoding="utf-8",
        ) as tmp_env:
            tmp_path = pathlib.Path(tmp_env.name)
            for k, v in sorted(file_vars.items()):
                escaped = str(v).replace('"', '\\"')
                tmp_env.write(f'{k}="{escaped}"\n')

        try:
            if phase == "PLAN":
                cmd_lines = self._run_script_or_preview(
                    script_path=script_path,
                    tmp_env_path=tmp_path,
                    ephemeral_env=ephemeral_env,
                    secrets=secrets,
                    dry_run=True,
                    record=record,
                    file_vars=file_vars,
                )
                logs.extend(cmd_lines)
                record.plan_summary = "\n".join(cmd_lines[-14:])
                if record.execution_mode == "DRY_RUN":
                    record.status = "SUCCEEDED"
                    record.outputs = self._build_outputs(
                        record.stack_type, file_vars, dry_run=True
                    )
                    record.completed_at = _utc_now()
                elif record.execution_mode == "PLAN_AND_WAIT":
                    logs.append(
                        "[GATE] Terraform Plan & REST Dry-Run complete. "
                        "Awaiting Admin Approval before Apply."
                    )
                    record.status = "PENDING_APPROVAL"
                else:
                    record.status = "APPLYING"
            else:
                apply_lines = self._run_script_or_preview(
                    script_path=script_path,
                    tmp_env_path=tmp_path,
                    ephemeral_env=ephemeral_env,
                    secrets=secrets,
                    dry_run=False,
                    record=record,
                    file_vars=file_vars,
                )
                logs.extend(apply_lines)
                record.outputs = self._build_outputs(
                    record.stack_type, file_vars, dry_run=False
                )
                record.status = "SUCCEEDED"
                record.completed_at = _utc_now()
                self._post_apply_catalog_sync(session, record, file_vars, logs)
        except Exception as exc:  # pylint: disable=broad-except
            err_msg = redact_sensitive_text(str(exc), secrets)
            logs.append(f"[ERROR] {err_msg}")
            record.error_message = err_msg
            record.status = "FAILED"
            record.completed_at = _utc_now()
        finally:
            tmp_path.unlink(missing_ok=True)
            record.log_lines = logs
            record.updated_at = _utc_now()
            session.commit()

    def _run_script_or_preview(
        self,
        script_path: pathlib.Path,
        tmp_env_path: pathlib.Path,
        ephemeral_env: dict[str, str],
        secrets: list[str],
        dry_run: bool,
        record: db_models.ProvisioningJobRecord,
        file_vars: dict[str, str],
    ) -> list[str]:
        """Runs the infra/deploy*.sh script or deterministic plan preview."""
        simulate = (
            self._settings.use_mock_data
            or os.getenv("PROVISIONING_SIMULATE", "true").lower() == "true"
        )
        if not simulate and script_path.is_file():
            cmd = [str(script_path), "--config", str(tmp_env_path)]
            if dry_run:
                cmd.append("--dry-run")
            env = {**os.environ, **ephemeral_env}
            proc = subprocess.run(
                cmd,
                cwd=str(INFRA_ROOT),
                env=env,
                capture_output=True,
                text=True,
                timeout=300,
                check=False,
            )
            combined = (proc.stdout or "") + "\n" + (proc.stderr or "")
            lines = [
                redact_sensitive_text(line.rstrip(), secrets)
                for line in combined.splitlines()
                if line.strip()
            ]
            if proc.returncode != 0:
                raise RuntimeError(
                    f"Script exited with code {proc.returncode}: "
                    + (lines[-1] if lines else "unknown error")
                )
            return lines

        mode_label = "PLAN (DRY-RUN)" if dry_run else "APPLY"
        if record.stack_type == "CUSTOMER_ONBOARD":
            cust = file_vars.get("CUSTOMER_NAME", "cymbal")
            dom = file_vars.get("CUSTOMER_DOMAIN", "cymbal.com")
            proj = file_vars.get("GCP_PROJECT_ID", "cymbal-app-514110")
            enabled_csv = file_vars.get("ENABLED_STEPS_CSV", "")
            enabled_set = {s.strip() for s in enabled_csv.split(",") if s.strip()}
            lines = [
                f"[GEDEPLOY] Master Customer Onboarding: {cust} ({dom}) -> Project '{proj}'",
                f"[GEDEPLOY] Enabled Steps: {enabled_csv or 'none'} | Mode: {mode_label}",
            ]
            for step_def in ONBOARDING_STEPS_CATALOG:
                if step_def.step_id in enabled_set:
                    lines.append(
                        f"[ENABLED] {step_def.phase_label} ({step_def.cli_flag} / {step_def.cli_alias}) : "
                        f"{step_def.title} -> [{mode_label}] {step_def.script_or_stack}"
                    )
                else:
                    lines.append(
                        f"[SKIPPED] {step_def.phase_label} ({step_def.cli_flag}) : {step_def.title}"
                    )
            return [redact_sensitive_text(item, secrets) for item in lines]

        stack_dir = {
            "GE_APP": "infra/stacks/02-ge-app-instance",
            "IDENTITY_WIF": "infra/stacks/01-identity-foundation",
            "M365_CONNECTORS": "infra/stacks/03-m365-connectors",
        }[record.stack_type]

        lines = [
            f"[TERRAFORM] terraform -chdir={stack_dir} init -input=false",
            (
                f"[TERRAFORM] terraform -chdir={stack_dir} workspace "
                f"select -or-create {record.workspace_key}"
            ),
            f"[TERRAFORM] terraform -chdir={stack_dir} validate",
        ]
        if dry_run:
            lines.append(
                f"[TERRAFORM] terraform -chdir={stack_dir} plan -out=tfplan "
                f"(project={file_vars['GCP_PROJECT_ID']}, "
                f"location={file_vars['GE_LOCATION']})"
            )
        else:
            lines.append(
                f"[TERRAFORM] terraform -chdir={stack_dir} apply "
                "-auto-approve tfplan"
            )

        if record.stack_type == "GE_APP":
            app_id = file_vars.get("GE_APP_ID", "")
            ds_id = file_vars.get("GE_DATA_STORE_ID", "")
            storage = file_vars.get("GE_BACKING_STORAGE_TYPE", "GCS")
            grp = file_vars.get("GE_APP_ACCESS_GROUP") or f"{app_id}-users"
            lines.extend(
                [
                    (
                        f"[{mode_label}] Upsert Discovery Engine Data Store "
                        f"'{ds_id}' ({storage})"
                    ),
                    (
                        f"[{mode_label}] Upsert Gemini Enterprise Engine "
                        f"'{app_id}' "
                        f"(tier={file_vars.get('GE_SEARCH_TIER')}, "
                        f"idp={file_vars.get('GE_IDENTITY_PROVIDER_TYPE')})"
                    ),
                    (
                        f"[{mode_label}] Bind Cloud Identity Access Group "
                        f"'{grp}'"
                    ),
                ]
            )
        elif record.stack_type == "IDENTITY_WIF":
            dom = file_vars.get("PRIMARY_CUSTOMER_DOMAIN", "")
            prof = file_vars.get("SAML_SSO_PROFILE_DISPLAY_NAME", "")
            lines.extend(
                [
                    (
                        f"[{mode_label}] Sync Microsoft Entra ID groups to "
                        f"Cloud Identity ({dom})"
                    ),
                    (
                        f"[{mode_label}] Configure Location ACL idpType=GSUITE "
                        f"& Inbound SAML SSO Profile ('{prof}')"
                    ),
                ]
            )
        else:
            prefix = file_vars.get("M365_COLLECTION_PREFIX", "m365")
            enabled: list[str] = []
            if file_vars.get("ENABLE_SHAREPOINT_CONNECTOR") == "true":
                enabled.append(f"{prefix}-sp (SharePoint)")
            if file_vars.get("ENABLE_OUTLOOK_CONNECTOR") == "true":
                enabled.append(f"{prefix}-ol (Outlook)")
            if file_vars.get("ENABLE_TEAMS_CONNECTOR") == "true":
                enabled.append(f"{prefix}-teams (Teams)")
            if file_vars.get("ENABLE_ONEDRIVE_CONNECTOR") == "true":
                enabled.append(f"{prefix}-od (OneDrive)")
            lines.extend(
                [
                    (
                        f"[{mode_label}] Upsert Secret Manager secret "
                        f"'{file_vars.get('M365_SECRET_ID')}'"
                    ),
                    (
                        f"[{mode_label}] Call :setUpDataConnector for "
                        + ", ".join(enabled)
                    ),
                ]
            )
        return [redact_sensitive_text(item, secrets) for item in lines]

    def _build_outputs(
        self,
        stack_type: str,
        file_vars: dict[str, str],
        dry_run: bool,
    ) -> dict[str, Any]:
        """Builds structured Terraform / REST outputs for the completed job."""
        proj = file_vars.get("GCP_PROJECT_ID", "mohandemo")
        loc = file_vars.get("GE_LOCATION", "global")
        if stack_type == "CUSTOMER_ONBOARD":
            cust = file_vars.get("CUSTOMER_NAME", "cymbal")
            dom = file_vars.get("CUSTOMER_DOMAIN", "cymbal.com")
            enabled_steps = [
                s for s in file_vars.get("ENABLED_STEPS_CSV", "").split(",") if s
            ]
            skipped_steps = [
                s for s in file_vars.get("SKIPPED_STEPS_CSV", "").split(",") if s
            ]
            target_apps_raw = file_vars.get("PHASE_3_TARGET_APPS", "")
            apps = (
                [a.strip() for a in target_apps_raw.split(",") if a.strip()]
                if target_apps_raw
                else [
                    f"{cust}-dev-sandbox-app",
                    f"{cust}-service-desk-app",
                    f"{cust}-finance-app",
                    f"{cust}-hr-app",
                ]
            )
            return {
                "customer_name": cust,
                "customer_domain": dom,
                "gcp_project_id": proj,
                "tf_state_bucket": f"{cust}-ge-tfstate",
                "executed_steps": enabled_steps,
                "skipped_steps": skipped_steps,
                "provisioned_apps": apps if "3" in enabled_steps else [],
                "provisioned_connectors": [
                    *(
                        [f"{cust}-m365-sp", f"{cust}-m365-od", f"{cust}-m365-ol", f"{cust}-m365-teams"]
                        if "2" in enabled_steps
                        else []
                    ),
                    *([f"{cust}-servicenow"] if "2B" in enabled_steps else []),
                    *(
                        [f"{cust}-jira-fed", f"{cust}-confluence-fed"]
                        if "2C" in enabled_steps
                        else []
                    ),
                ],
                "dry_run": dry_run,
            }
        if stack_type == "GE_APP":
            app_id = file_vars.get("GE_APP_ID", "")
            ds_id = file_vars.get("GE_DATA_STORE_ID", f"{app_id}-ds")
            return {
                "engine_id": app_id,
                "data_store_id": ds_id,
                "location": loc,
                "engine_resource_name": (
                    f"projects/{proj}/locations/{loc}/collections/"
                    f"default_collection/engines/{app_id}"
                ),
                "console_url": (
                    f"https://console.cloud.google.com/gen-app-builder/"
                    f"locations/{loc}/engines/{app_id}?project={proj}"
                ),
                "dry_run": dry_run,
            }
        if stack_type == "IDENTITY_WIF":
            return {
                "primary_customer_domain": file_vars.get(
                    "PRIMARY_CUSTOMER_DOMAIN", ""
                ),
                "saml_sso_enabled": (
                    file_vars.get("ENABLE_CLOUD_IDENTITY_SAML_SSO") == "true"
                ),
                "workforce_pool_id": file_vars.get("WORKFORCE_POOL_ID", ""),
                "dry_run": dry_run,
            }
        prefix = file_vars.get("M365_COLLECTION_PREFIX", "m365")
        stores: list[str] = []
        if file_vars.get("ENABLE_SHAREPOINT_CONNECTOR") == "true":
            stores.append(f"{prefix}-sp")
        if file_vars.get("ENABLE_OUTLOOK_CONNECTOR") == "true":
            stores.append(f"{prefix}-ol")
        if file_vars.get("ENABLE_TEAMS_CONNECTOR") == "true":
            stores.append(f"{prefix}-teams")
        if file_vars.get("ENABLE_ONEDRIVE_CONNECTOR") == "true":
            stores.append(f"{prefix}-od")
        return {
            "m365_collection_prefix": prefix,
            "provisioned_data_store_ids": stores,
            "bound_engine_id": file_vars.get("GE_APP_ID", ""),
            "dry_run": dry_run,
        }

    def _post_apply_catalog_sync(
        self,
        session: orm.Session,
        record: db_models.ProvisioningJobRecord,
        file_vars: dict[str, str],
        logs: list[str],
    ) -> None:
        """Upserts provisioned GE App / M365 Data Stores into the Catalog DB."""
        loc = file_vars.get("GE_LOCATION", "global")
        if record.stack_type == "GE_APP":
            app_id = file_vars.get("GE_APP_ID", "").strip()
            ds_id = file_vars.get("GE_DATA_STORE_ID", f"{app_id}-ds").strip()
            display_name = file_vars.get("GE_APP_DISPLAY_NAME", app_id).strip()
            existing = (
                session.query(db_models.GEApplicationRecord)
                .filter_by(engine_id=app_id)
                .one_or_none()
            )
            launch_url = (
                f"https://vertexaisearch.cloud.google.com/home/cid/{app_id}"
            )
            ds_list = [ds_id] if ds_id else []
            if file_vars.get("GE_ENABLE_COMMON_CONNECTORS") == "true":
                ds_list.extend(
                    ["m365-sp", "m365-ol", "m365-teams", "m365-od"]
                )
            if existing is None and app_id:
                session.add(
                    db_models.GEApplicationRecord(
                        engine_id=app_id,
                        display_name=display_name,
                        description=(
                            f"Provisioned via Admin Studio in {loc} "
                            f"(Workspace: {record.workspace_key})."
                        ),
                        category="Enterprise Search",
                        department="Enterprise",
                        tags=["terraform", loc, "gemini-enterprise"],
                        icon_name="Sparkles",
                        launch_url=launch_url,
                        default_launch_url=launch_url,
                        location=loc,
                        solution_type=file_vars.get(
                            "GE_SOLUTION_TYPE", "SOLUTION_TYPE_SEARCH"
                        ),
                        industry_vertical=file_vars.get(
                            "GE_INDUSTRY_VERTICAL", "GENERIC"
                        ),
                        app_type="APP_TYPE_INTRANET",
                        iam_principals=["user:admin@mohanrajs.altostrat.com"],
                        data_store_ids=sorted(set(ds_list)),
                        allowed_roles=["*"],
                        featured=True,
                    )
                )
            elif existing is not None:
                cur_ids = list(existing.data_store_ids or [])
                merged = sorted(set(cur_ids + ds_list))
                existing.data_store_ids = merged
            logs.append(
                f"[SYNC] Registered GE Engine '{app_id}' and data stores "
                f"{sorted(set(ds_list))} in AppHub Catalog."
            )
        elif record.stack_type == "M365_CONNECTORS":
            target_app = file_vars.get("GE_APP_ID", "").strip()
            new_stores = record.outputs.get("provisioned_data_store_ids", [])
            if target_app and new_stores:
                existing = (
                    session.query(db_models.GEApplicationRecord)
                    .filter_by(engine_id=target_app)
                    .one_or_none()
                )
                if existing is not None:
                    cur_ids = list(existing.data_store_ids or [])
                    merged = sorted(set(cur_ids + list(new_stores)))
                    existing.data_store_ids = merged
                    logs.append(
                        f"[SYNC] Attached M365 data stores {new_stores} to "
                        f"GE Engine '{target_app}'."
                    )
