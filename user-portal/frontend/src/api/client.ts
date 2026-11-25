/**
 * REST API client for communicating with the Gemini Enterprise AppHub backend.
 */

import {
  AccessRequestCreatePayload,
  AccessRequestItem,
  AgentSummary,
  AppsQueryParams,
  AuthConfigResponse,
  CatalogResponse,
  GeAppProvisionRequest,
  GePinnedAgentItem,
  GePinnedAgentListResponse,
  GePinnedAgentPublishRequest,
  IdentityProvisionRequest,
  LoginResponse,
  M365ConnectorProvisionRequest,
  McpServerSummary,
  ProvisioningJobItem,
  ProvisioningJobListResponse,
  SkillCatalogSeedResponse,
  SkillListResponse,
  SkillOrchestrateRequest,
  SkillOrchestrateResponse,
  SkillRegistryListResponse,
  SkillsQueryParams,
  SkillWorkflowItem,
  SyncRunSummary,
  SyncStatusResponse,
  UserContext,
  WorkflowEmailListResponse,
} from '../types/catalog';

function buildHeaders(
  devRole?: string,
  authToken?: string,
): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (devRole) {
    headers['X-Dev-User-Role'] = devRole;
  }
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }
  return headers;
}

/**
 * Fetches authentication configuration and suggested Workspace accounts.
 */
export async function fetchAuthConfig(): Promise<AuthConfigResponse> {
  const response = await fetch('/api/v1/auth/config', {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch auth config: HTTP ${response.status}`);
  }
  const data: AuthConfigResponse = await response.json();
  return data;
}

/**
 * Builds the backend Google Cloud Identity / Microsoft 365 SAML SSO login URL.
 */
export function buildGoogleSsoLoginUrl(email?: string): string {
  const params = new URLSearchParams();
  if (email && email.trim()) {
    params.set('email', email.trim().toLowerCase());
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    params.set('redirect_origin', window.location.origin);
  }
  const query = params.toString();
  return query
    ? `/api/v1/auth/google/login?${query}`
    : '/api/v1/auth/google/login';
}

/**
 * Signs in a user with their Google Workspace email address.
 */
export async function loginWithEmail(email: string): Promise<LoginResponse> {
  const response = await fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });
  if (!response.ok) {
    throw new Error(`Authentication failed: HTTP ${response.status}`);
  }
  const data: LoginResponse = await response.json();
  return data;
}

/**
 * Logs out the current user session.
 */
export async function logoutUser(): Promise<void> {
  await fetch('/api/v1/auth/logout', {
    method: 'POST',
    headers: { Accept: 'application/json' },
  });
}

/**
 * Fetches the resolved user identity and roles from /api/v1/me.
 */
export async function fetchCurrentUser(
  devRole?: string,
  authToken?: string,
): Promise<UserContext> {
  const response = await fetch('/api/v1/me', {
    headers: buildHeaders(devRole, authToken),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch user profile: HTTP ${response.status}`);
  }
  const data: UserContext = await response.json();
  return data;
}

/**
 * Fetches the role- and group-filtered application catalog from /api/v1/apps.
 */
export async function fetchApps(
  params: AppsQueryParams = {},
): Promise<CatalogResponse> {
  const searchParams = new URLSearchParams();
  if (params.q) {
    searchParams.set('q', params.q);
  }
  if (params.category) {
    searchParams.set('category', params.category);
  }
  if (params.department) {
    searchParams.set('department', params.department);
  }
  if (params.tag) {
    searchParams.set('tag', params.tag);
  }
  if (params.group) {
    searchParams.set('group', params.group);
  }
  const queryString = searchParams.toString();
  const url = queryString ? `/api/v1/apps?${queryString}` : '/api/v1/apps';

  const response = await fetch(url, {
    headers: buildHeaders(params.devRole, params.authToken),
  });
  if (!response.ok) {
    throw new Error(
      `Failed to fetch application catalog: HTTP ${response.status}`,
    );
  }
  const data: CatalogResponse = await response.json();
  return data;
}

/**
 * Fetches all enterprise GE applications so users can view and request access.
 */
export async function fetchRequestableApps(
  devRole?: string,
  authToken?: string,
): Promise<CatalogResponse> {
  const response = await fetch('/api/v1/apps/requestable', {
    headers: buildHeaders(devRole, authToken),
  });
  if (!response.ok) {
    throw new Error(
      `Failed to fetch requestable catalog: HTTP ${response.status}`,
    );
  }
  const data: CatalogResponse = await response.json();
  return data;
}

/**
 * Fetches submitted application and AGY license access requests for the user.
 */
export async function fetchAccessRequests(
  devRole?: string,
  authToken?: string,
): Promise<AccessRequestItem[]> {
  const response = await fetch('/api/v1/apps/access-requests', {
    headers: buildHeaders(devRole, authToken),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch access requests: HTTP ${response.status}`);
  }
  const data: AccessRequestItem[] = await response.json();
  return data;
}

/**
 * Submits a request for GE Application access or an AGY License.
 */
export async function submitAccessRequest(
  payload: AccessRequestCreatePayload,
  devRole?: string,
  authToken?: string,
): Promise<AccessRequestItem> {
  const response = await fetch('/api/v1/apps/access-requests', {
    method: 'POST',
    headers: {
      ...buildHeaders(devRole, authToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Failed to submit access request: HTTP ${response.status}`);
  }
  const data: AccessRequestItem = await response.json();
  return data;
}

/**
 * Fetches current database sync status and entity counts from /api/v1/sync/status.
 */
export async function fetchSyncStatus(): Promise<SyncStatusResponse> {
  const response = await fetch('/api/v1/sync/status', {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch sync status: HTTP ${response.status}`);
  }
  const data: SyncStatusResponse = await response.json();
  return data;
}

/**
 * Triggers an immediate synchronization of GE applications and Cloud Identity groups.
 */
export async function triggerSync(): Promise<SyncRunSummary> {
  const response = await fetch('/api/v1/sync', {
    method: 'POST',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Failed to trigger sync: HTTP ${response.status}`);
  }
  const data: SyncRunSummary = await response.json();
  return data;
}

/**
 * Fetches synced Gemini Enterprise skills and share approval status from /api/v1/skills.
 */
export async function fetchSkills(
  params: SkillsQueryParams = {},
): Promise<SkillListResponse> {
  const searchParams = new URLSearchParams();
  if (params.reviewStatus && params.reviewStatus !== 'ALL') {
    searchParams.set('review_status', params.reviewStatus);
  }
  if (params.engineId) {
    searchParams.set('engine_id', params.engineId);
  }
  if (params.q) {
    searchParams.set('q', params.q);
  }
  const queryString = searchParams.toString();
  const url = queryString ? `/api/v1/skills?${queryString}` : '/api/v1/skills';

  const response = await fetch(url, {
    headers: buildHeaders(params.devRole, params.authToken),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch skills: HTTP ${response.status}`);
  }
  const data: SkillListResponse = await response.json();
  return data;
}

/**
 * Approves a skill in Stage 3 InfoSec Review, publishing to Registry (Stage 4) and sharing to GE App (Stage 5).
 */
export async function approveSkillWorkflow(
  skillId: string,
  notes = 'Approved by InfoSec review.',
  authToken?: string,
  targetEngines?: string[],
  targetAgents?: string[],
): Promise<SkillWorkflowItem> {
  const payload: {
    notes: string;
    target_engines?: string[];
    target_agents?: string[];
  } = { notes };
  if (targetEngines && targetEngines.length > 0) {
    payload.target_engines = targetEngines;
  }
  if (targetAgents && targetAgents.length > 0) {
    payload.target_agents = targetAgents;
  }
  const response = await fetch(
    `/api/v1/workflows/skills/${encodeURIComponent(skillId)}/approve`,
    {
      method: 'POST',
      headers: {
        ...buildHeaders(undefined, authToken),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );
  if (!response.ok) {
    throw new Error(`Failed to approve skill workflow: HTTP ${response.status}`);
  }
  const data: SkillWorkflowItem = await response.json();
  return data;
}

/**
 * Rejects a skill in Stage 3 InfoSec Review.
 */
export async function rejectSkillWorkflow(
  skillId: string,
  notes = 'Rejected by InfoSec review.',
  authToken?: string,
): Promise<SkillWorkflowItem> {
  const response = await fetch(
    `/api/v1/workflows/skills/${encodeURIComponent(skillId)}/reject`,
    {
      method: 'POST',
      headers: {
        ...buildHeaders(undefined, authToken),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ notes }),
    },
  );
  if (!response.ok) {
    throw new Error(`Failed to reject skill workflow: HTTP ${response.status}`);
  }
  const data: SkillWorkflowItem = await response.json();
  return data;
}

/**
 * Fetches published skills from the Enterprise Skill Registry (/api/v1/registry/skills).
 */
export async function fetchRegistrySkills(
  authToken?: string,
): Promise<SkillRegistryListResponse> {
  const response = await fetch('/api/v1/registry/skills', {
    headers: buildHeaders(undefined, authToken),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch skill registry: HTTP ${response.status}`);
  }
  const data: SkillRegistryListResponse = await response.json();
  return data;
}

/**
 * Fetches InfoSec approval email notifications (/api/v1/workflows/notifications).
 */
export async function fetchWorkflowNotifications(
  authToken?: string,
): Promise<WorkflowEmailListResponse> {
  const response = await fetch('/api/v1/workflows/notifications', {
    headers: buildHeaders(undefined, authToken),
  });
  if (!response.ok) {
    throw new Error(
      `Failed to fetch workflow notifications: HTTP ${response.status}`,
    );
  }
  const data: WorkflowEmailListResponse = await response.json();
  return data;
}

/**
 * Fetches all Terraform provisioning jobs and active workspace locks.
 */
export async function fetchProvisioningJobs(
  authToken?: string,
  devRole = 'admin',
): Promise<ProvisioningJobListResponse> {
  const response = await fetch('/api/v1/admin/provisioning/jobs', {
    headers: buildHeaders(devRole, authToken),
  });
  if (!response.ok) {
    throw new Error(
      `Failed to fetch provisioning jobs: HTTP ${response.status}`,
    );
  }
  const data: ProvisioningJobListResponse = await response.json();
  return data;
}

/**
 * Starts a Stack 02 (Gemini Enterprise App Instance) Terraform plan or apply job.
 */
export async function createGeAppProvisioningJob(
  payload: GeAppProvisionRequest,
  authToken?: string,
  devRole = 'admin',
): Promise<ProvisioningJobItem> {
  const response = await fetch('/api/v1/admin/provisioning/ge-app', {
    method: 'POST',
    headers: {
      ...buildHeaders(devRole, authToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new Error(
      (errBody as { detail?: string }).detail ||
        `Failed to start GE App provisioning: HTTP ${response.status}`,
    );
  }
  return (await response.json()) as ProvisioningJobItem;
}

/**
 * Starts a Stack 01 (Identity & WIF Foundation) Terraform plan or apply job.
 */
export async function createIdentityProvisioningJob(
  payload: IdentityProvisionRequest,
  authToken?: string,
  devRole = 'admin',
): Promise<ProvisioningJobItem> {
  const response = await fetch('/api/v1/admin/provisioning/identity', {
    method: 'POST',
    headers: {
      ...buildHeaders(devRole, authToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new Error(
      (errBody as { detail?: string }).detail ||
        `Failed to start Identity provisioning: HTTP ${response.status}`,
    );
  }
  return (await response.json()) as ProvisioningJobItem;
}

/**
 * Starts a Stack 03 (Microsoft 365 Connectors) Terraform plan or apply job.
 */
export async function createM365ProvisioningJob(
  payload: M365ConnectorProvisionRequest,
  authToken?: string,
  devRole = 'admin',
): Promise<ProvisioningJobItem> {
  const response = await fetch('/api/v1/admin/provisioning/m365', {
    method: 'POST',
    headers: {
      ...buildHeaders(devRole, authToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new Error(
      (errBody as { detail?: string }).detail ||
        `Failed to start M365 connector provisioning: HTTP ${response.status}`,
    );
  }
  return (await response.json()) as ProvisioningJobItem;
}

/**
 * Approves a PENDING_APPROVAL Terraform job and executes terraform apply.
 */
export async function approveProvisioningJob(
  jobId: string,
  notes = 'Approved Terraform execution plan.',
  authToken?: string,
  devRole = 'admin',
): Promise<ProvisioningJobItem> {
  const response = await fetch(
    `/api/v1/admin/provisioning/jobs/${encodeURIComponent(jobId)}/approve`,
    {
      method: 'POST',
      headers: {
        ...buildHeaders(devRole, authToken),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ notes }),
    },
  );
  if (!response.ok) {
    throw new Error(
      `Failed to approve provisioning job: HTTP ${response.status}`,
    );
  }
  return (await response.json()) as ProvisioningJobItem;
}

/**
 * Rejects a PENDING_APPROVAL Terraform job and releases its workspace state lock.
 */
export async function rejectProvisioningJob(
  jobId: string,
  notes = 'Rejected Terraform execution plan.',
  authToken?: string,
  devRole = 'admin',
): Promise<ProvisioningJobItem> {
  const response = await fetch(
    `/api/v1/admin/provisioning/jobs/${encodeURIComponent(jobId)}/reject`,
    {
      method: 'POST',
      headers: {
        ...buildHeaders(devRole, authToken),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ notes }),
    },
  );
  if (!response.ok) {
    throw new Error(
      `Failed to reject provisioning job: HTTP ${response.status}`,
    );
  }
  return (await response.json()) as ProvisioningJobItem;
}

/**
 * Seeds atomic sub-skills and composite parent skills from skills_catalog/.
 */
export async function seedSkillsCatalog(
  authToken?: string,
  devRole?: string,
): Promise<SkillCatalogSeedResponse> {
  const response = await fetch('/api/v1/skills/seed-catalog', {
    method: 'POST',
    headers: buildHeaders(devRole, authToken),
  });
  if (!response.ok) {
    throw new Error(`Failed to seed skills catalog: HTTP ${response.status}`);
  }
  return (await response.json()) as SkillCatalogSeedResponse;
}

/**
 * Executes a Parent Skill and its Sub-Skills via the Universal ADK Skill Orchestrator.
 */
export async function orchestrateSkill(
  payload: SkillOrchestrateRequest,
  authToken?: string,
  devRole?: string,
): Promise<SkillOrchestrateResponse> {
  const response = await fetch('/api/v1/skills/orchestrate', {
    method: 'POST',
    headers: {
      ...buildHeaders(devRole, authToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new Error(
      (errBody as { detail?: string }).detail ||
        `Failed to orchestrate skill: HTTP ${response.status}`,
    );
  }
  return (await response.json()) as SkillOrchestrateResponse;
}

/**
 * Fetches all Pinned Universal Skill Orchestrator registrations across GE Apps.
 */
export async function fetchPinnedGeAgents(
  authToken?: string,
  devRole = 'admin',
): Promise<GePinnedAgentListResponse> {
  const response = await fetch('/api/v1/admin/provisioning/ge-agents', {
    headers: buildHeaders(devRole, authToken),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch pinned GE agents: HTTP ${response.status}`);
  }
  return (await response.json()) as GePinnedAgentListResponse;
}

/**
 * Publishes & pins the Universal Skill Orchestrator in a GE App via agents-cli.
 */
export async function publishPinnedGeAgent(
  payload: GePinnedAgentPublishRequest,
  authToken?: string,
  devRole = 'admin',
): Promise<GePinnedAgentItem> {
  const response = await fetch('/api/v1/admin/provisioning/ge-agents/publish', {
    method: 'POST',
    headers: {
      ...buildHeaders(devRole, authToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(
      `Failed to publish pinned GE agent: HTTP ${response.status}`,
    );
  }
  return (await response.json()) as GePinnedAgentItem;
}

/**
 * Fetches registered ADK and A2A agents for the Cymbal project from /api/v1/agents.
 */
export async function fetchAgents(
  authToken?: string,
  devRole?: string,
): Promise<AgentSummary[]> {
  const response = await fetch('/api/v1/agents', {
    headers: buildHeaders(devRole, authToken),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch agents: HTTP ${response.status}`);
  }
  return (await response.json()) as AgentSummary[];
}

/**
 * Fetches active MCP and Enterprise Data Connector tool servers from /api/v1/mcp-servers.
 */
export async function fetchMcpServers(
  authToken?: string,
  devRole?: string,
): Promise<McpServerSummary[]> {
  const response = await fetch('/api/v1/mcp-servers', {
    headers: buildHeaders(devRole, authToken),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch MCP servers: HTTP ${response.status}`);
  }
  return (await response.json()) as McpServerSummary[];
}
