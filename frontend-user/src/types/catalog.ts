/**
 * Shared TypeScript interfaces for the Gemini Enterprise AppHub catalog.
 */

export interface UserContext {
  email: string;
  user_id: string;
  roles: string[];
  groups?: string[];
  license_type?: 'standard' | 'plus' | 'none' | string;
  auth_source: string;
}

export interface SuggestedUser {
  email: string;
  label: string;
  description: string;
}

export interface AuthConfigResponse {
  google_client_id: string;
  sso_redirect_enabled?: boolean;
  suggested_users: SuggestedUser[];
}

export interface LoginResponse {
  token: string;
  user: UserContext;
}

export interface CatalogApplication {
  engine_id: string;
  display_name: string;
  description: string;
  category: string;
  department: string;
  tags: string[];
  icon_name: string;
  launch_url: string;
  location: string;
  solution_type: string;
  allowed_roles: string[];
  featured: boolean;
}

export interface CatalogResponse {
  items: CatalogApplication[];
  total: number;
  categories: string[];
  departments: string[];
  groups?: string[];
}

export interface AppsQueryParams {
  devRole?: string;
  authToken?: string;
  q?: string;
  category?: string;
  department?: string;
  tag?: string;
  group?: string;
}

export interface SyncRunSummary {
  id: number;
  trigger_source: string;
  status: string;
  apps_synced: number;
  groups_synced: number;
  memberships_synced: number;
  error_message?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
}

export type PortalSection =
  | 'apps'
  | 'antigravity'
  | 'skills'
  | 'agents'
  | 'mcp'
  | 'skill-governance'
  | 'provisioning';

export interface AgentSummary {
  agent_id: string;
  display_name: string;
  resource_name: string;
  description: string;
  specialization?: string;
  deployment_target: string;
  pinned_apps: string[];
  supported_connectors?: string[];
  supported_mcp_tools?: string[];
  shared_skills?: string[];
  starter_prompts: string[];
  status: string;
  subskills_count: number;
  version: string;
}

export interface McpServerSummary {
  server_id: string;
  display_name: string;
  data_source: string;
  endpoint_uri: string;
  connector_modes: string[];
  entities: string[];
  enabled_actions: string[];
  tools_count: number;
  status: string;
  action_state: string;
  attached_apps: string[];
}

export interface SyncStatusResponse {
  sync_enabled: boolean;
  sync_interval_seconds: number;
  database_dialect: string;
  total_apps: number;
  total_groups: number;
  total_users: number;
  total_memberships: number;
  total_skills?: number;
  pending_skills?: number;
  last_run?: SyncRunSummary | null;
}

export interface SkillIamProposal {
  proposal_id: string;
  principal: string;
  role: string;
  state: string;
  create_time: string;
  expire_time: string;
}

export interface SkillSubfile {
  file_name: string;
  mime_type: string;
}

export interface SkillWorkflowCheck {
  control_id?: string;
  check: string;
  passed: boolean;
  detail: string;
}

export interface SkillRubricBreakdownItem {
  rubric_id: string;
  rubric_name: string;
  weight_pct: number;
  score_100: number;
  verdict: string;
  evidence: string;
}

export interface SkillEvalCaseItem {
  case_id?: string;
  eval_case_id?: string;
  category?: string;
  prompt:
    | string
    | {
        role?: string;
        parts?: Array<{ text?: string }>;
      };
  expected_sub_skills?: string[];
  expected_connectors?: string[];
  rubric_groups?: string[];
  pass_criteria?: string[];
}

export interface SkillSixRubricBenchmark {
  skill_id?: string;
  display_name?: string;
  overall_weighted_score_100?: number;
  certification_tier?: string;
  passed?: boolean;
  rubric_breakdown?: SkillRubricBreakdownItem[];
  ascii_rubric_scorecard_chart?: string;
  latency_profile?: {
    step_p50_ms?: number;
    step_p95_ms?: number;
    step_p99_ms?: number;
    end_to_end_p95_ms?: number;
    within_interactive_sla?: boolean;
  };
  agents_cli_eval_dataset?: {
    schema_version?: string;
    eval_cases?: SkillEvalCaseItem[];
  };
  sha256_evaluation_certificate_digest?: string;
}

export interface SkillTokenOptimization {
  discovery_tokens: number;
  instruction_tokens: number;
  total_tokens: number;
  optimized_instruction_tokens: number;
  optimized_total_tokens: number;
  tokens_saved: number;
  reduction_pct: number;
  duplicate_uri_count: number;
  efficiency_grade: string;
  recommendations?: string[];
}

export interface SkillRequiredConnector {
  connector_id: string;
  display_name: string;
}

export interface SkillTargetAppEvaluation {
  engine_id: string;
  app_display_name: string;
  location: string;
  connector_readiness: 'READY' | 'MISSING_CONNECTORS' | string;
  matched_connectors: string[];
  missing_connectors: string[];
  data_store_count: number;
  eval_score: number;
  eval_status: string;
  rendered_tokens: number;
  optimized_tokens: number;
  tokens_saved: number;
  reduction_pct: number;
  efficiency_grade: string;
  selected_for_distribution?: boolean;
}

export interface SkillDistributedApp {
  engine_id: string;
  app_display_name: string;
  location: string;
  launch_url: string;
  status: string;
  sharing_scope: string;
  distributed_at?: string;
}

export interface SkillTargetAgentEvaluation {
  agent_id: string;
  agent_name: string;
  specialization: string;
  architecture: string;
  pinned_apps: string[];
  selected_for_share?: boolean;
  tool_compatibility: 'COMPATIBLE' | 'MISSING_TOOL_BINDINGS' | string;
  matched_connectors: string[];
  missing_connectors: string[];
  supported_mcp_tools: string[];
  eval_score: number;
  eval_status: string;
}

export interface SkillDistributedAgent {
  agent_id: string;
  agent_name: string;
  specialization: string;
  architecture: string;
  pinned_apps?: string[];
  registry_id?: string;
  skill_id?: string;
  binding_mode: string;
  status: string;
  distributed_at?: string;
}

export interface SkillWorkflowItem {
  workflow_id: string;
  skill_id: string;
  engine_id: string;
  skill_display_name: string;
  owner_email: string;
  current_stage:
    | 'SKILL_EVALUATION'
    | 'INFOSEC_SCAN'
    | 'AWAITING_INFOSEC_APPROVAL'
    | 'PUBLISH_REGISTRY'
    | 'SHARE_TO_APP'
    | 'COMPLETED'
    | 'REJECTED'
    | 'FAILED'
    | string;
  status: string;
  eval_score: number;
  eval_status: string;
  eval_report?: {
    agent_id?: string;
    agent_name?: string;
    agent_runtime_id?: string;
    invocation_mode?: string;
    deployment_status?: string;
    tools_invoked?: string[];
    model?: string;
    skill_name?: string;
    score?: number;
    passed?: boolean;
    verdict?: string;
    summary?: string;
    checks?: SkillWorkflowCheck[];
    token_optimization?: SkillTokenOptimization;
    six_rubric_benchmark?: SkillSixRubricBenchmark;
    templatized_instruction?: string;
    required_connectors?: SkillRequiredConnector[];
    sub_skills?: string[];
  };
  templatized_instruction?: string;
  required_connectors?: SkillRequiredConnector[];
  requested_groups?: string[];
  distribution_scope?: 'SINGLE_APP' | 'MULTI_APP' | 'GLOBAL' | string;
  target_engines?: string[];
  target_app_evaluations?: SkillTargetAppEvaluation[];
  distributed_apps?: SkillDistributedApp[];
  target_agents?: string[];
  target_agent_evaluations?: SkillTargetAgentEvaluation[];
  distributed_agents?: SkillDistributedAgent[];
  sub_skills?: string[];
  infosec_risk_level: string;
  infosec_status: string;
  infosec_report?: {
    agent_id?: string;
    agent_name?: string;
    agent_runtime_id?: string;
    invocation_mode?: string;
    deployment_status?: string;
    tools_invoked?: string[];
    model?: string;
    skill_name?: string;
    risk_level?: string;
    passed?: boolean;
    verdict?: string;
    summary?: string;
    findings?: Array<string | { control_id?: string; severity?: string; message?: string; remediation?: string }>;
    checks?: SkillWorkflowCheck[];
    security_digest?: string;
    controls_passed?: number;
    controls_total?: number;
    human_approval_required?: boolean;
  };
  approval_status: string;
  approved_by: string;
  approval_notes: string;
  approved_at?: string | null;
  registry_id: string;
  shared_in_ge: boolean;
  shared_principals: string[];
  started_at?: string | null;
  updated_at?: string | null;
  completed_at?: string | null;
}

export interface DiscoveredSkill {
  skill_id: string;
  resource_name: string;
  engine_id: string;
  app_display_name: string;
  display_name: string;
  description: string;
  instruction: string;
  gcs_uri: string;
  owner_email: string;
  state: string;
  sharing_scope: string;
  sharing_state: string;
  has_active_iam_proposals: boolean;
  review_status: 'PENDING_REVIEW' | 'APPROVED' | 'DRAFT' | string;
  iam_proposals: SkillIamProposal[];
  shared_principals: string[];
  subfiles: SkillSubfile[];
  sub_skills?: string[];
  shared_apps?: string[];
  shared_agents?: string[];
  create_time: string;
  update_time: string;
  last_synced_at?: string | null;
  workflow?: SkillWorkflowItem | null;
}

export interface SkillRegistryItem {
  registry_id: string;
  skill_id: string;
  resource_name: string;
  engine_id: string;
  app_display_name: string;
  display_name: string;
  description: string;
  instruction: string;
  version: string;
  owner_email: string;
  eval_score: number;
  infosec_risk_level: string;
  approved_by: string;
  shared_principals: string[];
  required_connectors?: SkillRequiredConnector[];
  target_engines?: string[];
  distributed_apps?: SkillDistributedApp[];
  target_agents?: string[];
  target_agent_evaluations?: SkillTargetAgentEvaluation[];
  distributed_agents?: SkillDistributedAgent[];
  sub_skills?: string[];
  published_at?: string | null;
}

export interface SubSkillStepTrace {
  step_index: number;
  sub_skill_name: string;
  sub_skill_display_name: string;
  sub_skill_input: string;
  status: string;
  stream_assist_endpoint: string;
  identity_mode: string;
  output_summary: string;
  connectors_invoked: string[];
  latency_ms: number;
}

export interface SkillOrchestrateRequest {
  skill_id: string;
  engine_id?: string;
  user_prompt?: string;
  forwarded_oauth_token?: string;
}

export interface SkillOrchestrateResponse {
  orchestration_id: string;
  agent_name: string;
  skill_id: string;
  skill_display_name: string;
  engine_id: string;
  calling_user_email: string;
  identity_passthrough_mode: string;
  stream_assist_endpoint: string;
  is_composite_skill: boolean;
  sub_skills_loaded: string[];
  sub_skill_traces: SubSkillStepTrace[];
  final_response: string;
  total_tokens_saved: number;
  executed_at: string;
}

export interface SkillCatalogSeedResponse {
  seeded_skills: string[];
  total_seeded: number;
}

export interface GePinnedAgentPublishRequest {
  engine_id: string;
  display_name?: string;
  description?: string;
  authorization_id?: string;
  registration_mode?: string;
  default_pinned?: boolean;
}

export interface GePinnedAgentItem {
  agent_resource_name: string;
  engine_id: string;
  app_display_name: string;
  agent_id: string;
  display_name: string;
  description: string;
  registration_mode: string;
  default_pinned: boolean;
  authorization_resource: string;
  reasoning_engine: string;
  agents_cli_command: string;
  starter_prompts: string[];
  custom_placeholder_text: string;
  status: string;
  updated_at: string;
}

export interface GePinnedAgentListResponse {
  items: GePinnedAgentItem[];
  total: number;
}

export interface SkillRegistryListResponse {
  items: SkillRegistryItem[];
  total: number;
}

export interface WorkflowEmailItem {
  id: number;
  workflow_id: string;
  skill_id: string;
  recipient_email: string;
  subject: string;
  body_text: string;
  delivery_status: string;
  created_at?: string | null;
}

export interface WorkflowEmailListResponse {
  items: WorkflowEmailItem[];
  total: number;
}

export interface SkillListResponse {
  items: DiscoveredSkill[];
  total: number;
  pending_review_count: number;
  approved_count: number;
  draft_count: number;
}

export interface SkillsQueryParams {
  devRole?: string;
  authToken?: string;
  reviewStatus?: string;
  engineId?: string;
  q?: string;
}

export interface ProvisioningJobItem {
  job_id: string;
  stack_type: 'GE_APP' | 'IDENTITY_WIF' | 'M365_CONNECTORS' | string;
  title: string;
  workspace_key: string;
  state_backend_type: 'LOCAL_WORKSPACE' | 'GCS_REMOTE' | string;
  state_bucket: string;
  state_prefix: string;
  execution_mode: 'PLAN_AND_WAIT' | 'DRY_RUN' | 'APPLY' | string;
  status:
    | 'PLANNING'
    | 'PENDING_APPROVAL'
    | 'APPLYING'
    | 'SUCCEEDED'
    | 'FAILED'
    | 'REJECTED'
    | string;
  initiated_by: string;
  approved_by: string;
  sanitized_config: Record<string, unknown>;
  plan_summary: string;
  log_lines: string[];
  outputs: Record<string, unknown>;
  error_message?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  completed_at?: string | null;
}

export interface ProvisioningJobListResponse {
  items: ProvisioningJobItem[];
  total: number;
  active_workspace_locks: string[];
}

export interface GeAppProvisionRequest {
  gcp_project_id?: string;
  gcp_region?: string;
  ge_location: string;
  ge_app_id: string;
  ge_app_display_name: string;
  ge_company_name?: string;
  ge_solution_type?: string;
  ge_search_tier?: string;
  ge_enable_llm_addon?: boolean;
  ge_industry_vertical?: string;
  ge_data_store_id?: string;
  ge_backing_storage_type?: string;
  ge_gcs_bucket_name?: string;
  ge_identity_provider_type?: string;
  ge_customer_domain?: string;
  ge_app_access_group?: string;
  ge_app_group_members?: string;
  enable_common_connectors?: boolean;
  tf_state_bucket?: string;
  execution_mode: 'PLAN_AND_WAIT' | 'DRY_RUN' | 'APPLY';
}

export interface IdentityProvisionRequest {
  gcp_project_id?: string;
  gcp_org_id?: string;
  ge_location?: string;
  cloud_identity_customer_id?: string;
  primary_customer_domain: string;
  shared_identity_domain: string;
  m365_secret_id?: string;
  m365_tenant_id?: string;
  m365_client_id?: string;
  m365_client_secret?: string;
  entra_group_filter?: string;
  enable_cloud_identity_saml_sso?: boolean;
  saml_sso_profile_display_name?: string;
  enable_workforce_pool_oidc?: boolean;
  workforce_pool_id?: string;
  tf_state_bucket?: string;
  execution_mode: 'PLAN_AND_WAIT' | 'DRY_RUN' | 'APPLY';
}

export interface M365ConnectorProvisionRequest {
  gcp_project_id?: string;
  ge_location?: string;
  m365_collection_prefix: string;
  ge_app_id?: string;
  m365_secret_id?: string;
  m365_tenant_id?: string;
  m365_client_id?: string;
  m365_client_secret?: string;
  m365_connector_mode?: string;
  enable_m365_actions?: boolean;
  enable_sharepoint_connector?: boolean;
  m365_sharepoint_instance_uri?: string;
  enable_onedrive_connector?: boolean;
  m365_onedrive_instance_uri?: string;
  enable_outlook_connector?: boolean;
  enable_teams_connector?: boolean;
  tf_state_bucket?: string;
  execution_mode: 'PLAN_AND_WAIT' | 'DRY_RUN' | 'APPLY';
}
