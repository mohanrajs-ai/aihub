/**
 * Root application component for Gemini Enterprise AppHub.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import {
  approveProvisioningJob,
  approveSkillWorkflow,
  buildGoogleSsoLoginUrl,
  createGeAppProvisioningJob,
  createIdentityProvisioningJob,
  createM365ProvisioningJob,
  fetchAgents,
  fetchApps,
  fetchAuthConfig,
  fetchCurrentUser,
  fetchMcpServers,
  fetchProvisioningJobs,
  fetchRegistrySkills,
  fetchSkills,
  fetchSyncStatus,
  fetchWorkflowNotifications,
  loginWithEmail,
  logoutUser,
  rejectProvisioningJob,
  rejectSkillWorkflow,
  triggerSync,
} from './api/client';
import { AgentsView } from './components/AgentsView';
import { CatalogGrid } from './components/CatalogGrid';
import { Header } from './components/Header';
import { LoginScreen } from './components/LoginScreen';
import { McpServersView } from './components/McpServersView';
import { ProvisioningStudio } from './components/ProvisioningStudio';
import { SearchFilterBar } from './components/SearchFilterBar';
import { Sidebar } from './components/Sidebar';
import { SkillsSection } from './components/SkillsSection';
import { ThemeProvider } from './context/ThemeContext';
import {
  AgentSummary,
  CatalogApplication,
  DiscoveredSkill,
  GeAppProvisionRequest,
  IdentityProvisionRequest,
  M365ConnectorProvisionRequest,
  McpServerSummary,
  PortalSection,
  ProvisioningJobItem,
  SkillRegistryItem,
  SuggestedUser,
  SyncStatusResponse,
  UserContext,
  WorkflowEmailItem,
} from './types/catalog';

const SESSION_TOKEN_KEY = 'ge_auth_token';

function filterAppsClientSide(
  apps: CatalogApplication[],
  searchQuery: string,
  category: string,
  department: string,
  tag: string,
  group: string,
): CatalogApplication[] {
  const needle = searchQuery.trim().toLowerCase();
  return apps.filter((app) => {
    if (category && app.category !== category) {
      return false;
    }
    if (department && app.department !== department) {
      return false;
    }
    if (tag && !app.tags.includes(tag)) {
      return false;
    }
    if (group) {
      const normalizedRoles = app.allowed_roles.map((r) => r.toLowerCase());
      const cleanGrp = group.toLowerCase().replace(/^group:/, '');
      if (
        !normalizedRoles.includes(cleanGrp) &&
        !normalizedRoles.includes(`group:${cleanGrp}`)
      ) {
        return false;
      }
    }
    if (!needle) {
      return true;
    }
    const searchable = [
      app.display_name,
      app.description,
      app.category,
      app.department,
      app.engine_id,
      ...app.tags,
    ]
      .join(' ')
      .toLowerCase();
    return searchable.includes(needle);
  });
}

/**
 * Main portal layout, authentication gate, and catalog state container.
 */
export function App(): React.ReactElement {
  const [authToken, setAuthToken] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const callbackToken = params.get('auth_token');
    if (callbackToken) {
      window.sessionStorage.setItem(SESSION_TOKEN_KEY, callbackToken);
      return callbackToken;
    }
    return window.sessionStorage.getItem(SESSION_TOKEN_KEY);
  });
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [ssoRedirectEnabled, setSsoRedirectEnabled] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('auth_error');
  });
  const [user, setUser] = useState<UserContext | null>(null);
  const [activeSection, setActiveSection] = useState<PortalSection>('apps');
  const [apps, setApps] = useState<CatalogApplication[]>([]);
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [mcpServers, setMcpServers] = useState<McpServerSummary[]>([]);
  const [skills, setSkills] = useState<DiscoveredSkill[]>([]);
  const [registrySkills, setRegistrySkills] = useState<SkillRegistryItem[]>([]);
  const [workflowEmails, setWorkflowEmails] = useState<WorkflowEmailItem[]>([]);
  const [provisioningJobs, setProvisioningJobs] = useState<
    ProvisioningJobItem[]
  >([]);
  const [activeWorkspaceLocks, setActiveWorkspaceLocks] = useState<string[]>(
    [],
  );
  const [pendingSkillsCount, setPendingSkillsCount] = useState<number>(0);
  const [approvedSkillsCount, setApprovedSkillsCount] = useState<number>(0);
  const [categories, setCategories] = useState<string[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [activeDevRole, setActiveDevRole] = useState<string>('employee');
  const [appsViewMode, setAppsViewMode] = useState<'grid' | 'list'>('list');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [syncStatus, setSyncStatus] = useState<SyncStatusResponse | null>(null);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('auth_token') || params.has('auth_error')) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (!authToken) {
      void fetchAuthConfig()
        .then((cfg) => {
          setSuggestedUsers(cfg.suggested_users);
          setSsoRedirectEnabled(Boolean(cfg.sso_redirect_enabled));
        })
        .catch(() => setSuggestedUsers([]));
    }
  }, [authToken]);

  const loadCatalogData = useCallback(
    async (role: string, token: string) => {
      setLoading(true);
      setError(null);
      try {
        const [userRes, catalogRes] = await Promise.all([
          fetchCurrentUser(role, token),
          fetchApps({ devRole: role, authToken: token }),
        ]);
        setUser(userRes);
        setApps(catalogRes.items);
        setCategories(catalogRes.categories);
        setDepartments(catalogRes.departments);
        setGroups(catalogRes.groups ?? userRes.groups ?? []);
        void fetchSkills({ devRole: role, authToken: token })
          .then((skillsRes) => {
            if (skillsRes && Array.isArray(skillsRes.items)) {
              setSkills(skillsRes.items);
              setPendingSkillsCount(skillsRes.pending_review_count ?? 0);
              setApprovedSkillsCount(skillsRes.approved_count ?? 0);
            }
          })
          .catch(() => null);
        void fetchRegistrySkills(token)
          .then((regRes) => {
            if (regRes && Array.isArray(regRes.items)) {
              setRegistrySkills(regRes.items);
            }
          })
          .catch(() => null);
        void fetchWorkflowNotifications(token)
          .then((notifRes) => {
            if (notifRes && Array.isArray(notifRes.items)) {
              setWorkflowEmails(notifRes.items);
            }
          })
          .catch(() => null);
        void fetchProvisioningJobs(token, role)
          .then((provRes) => {
            if (provRes && Array.isArray(provRes.items)) {
              setProvisioningJobs(provRes.items);
              setActiveWorkspaceLocks(provRes.active_workspace_locks ?? []);
            }
          })
          .catch(() => null);
        void fetchSyncStatus()
          .then((st) => setSyncStatus(st))
          .catch(() => null);
        void fetchAgents(token, role)
          .then((agRes) => {
            if (Array.isArray(agRes)) {
              setAgents(agRes);
            }
          })
          .catch(() => null);
        void fetchMcpServers(token, role)
          .then((mcpRes) => {
            if (Array.isArray(mcpRes)) {
              setMcpServers(mcpRes);
            }
          })
          .catch(() => null);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Unexpected backend error';
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (authToken) {
      void loadCatalogData(activeDevRole, authToken);
    }
  }, [activeDevRole, authToken, loadCatalogData]);

  async function handleLoginEmail(email: string): Promise<void> {
    setAuthLoading(true);
    setAuthError(null);
    if (ssoRedirectEnabled) {
      window.location.assign(buildGoogleSsoLoginUrl(email));
      return;
    }
    try {
      const res = await loginWithEmail(email);
      window.sessionStorage.setItem(SESSION_TOKEN_KEY, res.token);
      setUser(res.user);
      setAuthToken(res.token);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to sign in';
      setAuthError(message);
    } finally {
      setAuthLoading(false);
    }
  }

  function handleSignOut(): void {
    void logoutUser();
    window.sessionStorage.removeItem(SESSION_TOKEN_KEY);
    setAuthToken(null);
    setUser(null);
    setApps([]);
    setGroups([]);
    setSelectedGroup('');
  }

  function handleRoleOrUserSwitch(newRole: string): void {
    if (newRole.includes('@')) {
      setActiveDevRole('employee');
      void handleLoginEmail(newRole);
      return;
    }
    setActiveDevRole(newRole);
  }

  async function handleSyncNow(): Promise<void> {
    if (!authToken) {
      return;
    }
    setSyncing(true);
    try {
      await triggerSync();
      await loadCatalogData(activeDevRole, authToken);
    } catch {
      // Ignore transient sync trigger errors in header
    } finally {
      setSyncing(false);
    }
  }

  async function handleApproveSkill(
    skillId: string,
    targetEngines?: string[],
    targetAgents?: string[],
  ): Promise<void> {
    if (!authToken) {
      return;
    }
    await approveSkillWorkflow(
      skillId,
      'Approved via AppHub InfoSec Governance portal.',
      authToken,
      targetEngines,
      targetAgents,
    );
    await loadCatalogData(activeDevRole, authToken);
  }

  async function handleRejectSkill(skillId: string): Promise<void> {
    if (!authToken) {
      return;
    }
    await rejectSkillWorkflow(
      skillId,
      'Rejected during InfoSec human approval review.',
      authToken,
    );
    await loadCatalogData(activeDevRole, authToken);
  }

  async function handleProvisionGeApp(
    payload: GeAppProvisionRequest,
  ): Promise<void> {
    if (!authToken) {
      return;
    }
    await createGeAppProvisioningJob(payload, authToken, activeDevRole);
    await loadCatalogData(activeDevRole, authToken);
  }

  async function handleProvisionIdentity(
    payload: IdentityProvisionRequest,
  ): Promise<void> {
    if (!authToken) {
      return;
    }
    await createIdentityProvisioningJob(payload, authToken, activeDevRole);
    await loadCatalogData(activeDevRole, authToken);
  }

  async function handleProvisionM365(
    payload: M365ConnectorProvisionRequest,
  ): Promise<void> {
    if (!authToken) {
      return;
    }
    await createM365ProvisioningJob(payload, authToken, activeDevRole);
    await loadCatalogData(activeDevRole, authToken);
  }

  async function handleApproveProvisioningJob(
    jobId: string,
    notes?: string,
  ): Promise<void> {
    if (!authToken) {
      return;
    }
    await approveProvisioningJob(jobId, notes, authToken, activeDevRole);
    await loadCatalogData(activeDevRole, authToken);
  }

  async function handleRejectProvisioningJob(
    jobId: string,
    notes?: string,
  ): Promise<void> {
    if (!authToken) {
      return;
    }
    await rejectProvisioningJob(jobId, notes, authToken, activeDevRole);
    await loadCatalogData(activeDevRole, authToken);
  }

  const isAdmin = useMemo(() => {
    if (activeDevRole.toLowerCase() === 'admin') {
      return true;
    }
    const email = (user?.email || '').toLowerCase();
    if (email.startsWith('admin@') || email.includes('infosec')) {
      return true;
    }
    return Boolean(
      user?.roles?.some(
        (r) =>
          r.toLowerCase() === 'admin' || r.toLowerCase() === 'infosec',
      ),
    );
  }, [user, activeDevRole]);

  const filteredApps = useMemo(
    () =>
      filterAppsClientSide(
        apps,
        searchQuery,
        selectedCategory,
        selectedDepartment,
        selectedTag,
        selectedGroup,
      ),
    [
      apps,
      searchQuery,
      selectedCategory,
      selectedDepartment,
      selectedTag,
      selectedGroup,
    ],
  );

  function handleClearFilters(): void {
    setSearchQuery('');
    setSelectedCategory('');
    setSelectedDepartment('');
    setSelectedTag('');
    setSelectedGroup('');
  }

  return (
    <ThemeProvider>
      {!authToken ? (
        <LoginScreen
          suggestedUsers={suggestedUsers}
          loading={authLoading}
          error={authError}
          onLoginEmail={(email) => void handleLoginEmail(email)}
          onLoginSsoPopup={
            ssoRedirectEnabled
              ? () => window.location.assign(buildGoogleSsoLoginUrl())
              : undefined
          }
        />
      ) : (
        <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
          <Header
            user={user}
            activeDevRole={activeDevRole}
            onDevRoleChange={handleRoleOrUserSwitch}
            onSignOut={handleSignOut}
            syncStatus={syncStatus}
            syncing={syncing}
            onSyncNow={() => void handleSyncNow()}
          />

          <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
              <Sidebar
                activeSection={activeSection}
                onSelectSection={setActiveSection}
                appsCount={apps.length}
                skillsCount={skills.length}
                pendingSkillsCount={pendingSkillsCount}
                approvedSkillsCount={approvedSkillsCount}
                agentsCount={agents.length || 1}
                mcpCount={mcpServers.length || 7}
                isAdmin={isAdmin}
              />

              <div className="min-w-0 flex-1">
                {error && (
                  <div
                    role="alert"
                    className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-200"
                  >
                    <div className="flex items-center gap-3">
                      <AlertCircle
                        className="h-5 w-5 shrink-0"
                        aria-hidden="true"
                      />
                      <div>
                        <p className="font-semibold">
                          Unable to load application catalog
                        </p>
                        <p className="text-xs opacity-90">{error}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        void loadCatalogData(activeDevRole, authToken)
                      }
                      className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-red-700"
                    >
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                      Retry
                    </button>
                  </div>
                )}

                {activeSection === 'apps' && (
                  <>
                    <div className="mb-6">
                      <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                        GE App Hub
                      </h2>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                        Browse, filter, and launch Gemini Enterprise agents and
                        search applications authorized for your Cloud Identity
                        groups.
                      </p>
                    </div>

                    <SearchFilterBar
                      searchQuery={searchQuery}
                      selectedCategory={selectedCategory}
                      selectedDepartment={selectedDepartment}
                      selectedTag={selectedTag}
                      selectedGroup={selectedGroup}
                      categories={categories}
                      departments={departments}
                      groups={groups}
                      totalCount={apps.length}
                      filteredCount={filteredApps.length}
                      onSearchChange={setSearchQuery}
                      onCategoryChange={setSelectedCategory}
                      onDepartmentChange={setSelectedDepartment}
                      onGroupChange={setSelectedGroup}
                      onClearFilters={handleClearFilters}
                      viewMode={appsViewMode}
                      onViewModeChange={setAppsViewMode}
                    />

                    <CatalogGrid
                      apps={filteredApps}
                      loading={loading}
                      onResetFilters={handleClearFilters}
                      onSelectTag={(tag) =>
                        setSelectedTag((prev) => (prev === tag ? '' : tag))
                      }
                      viewMode={appsViewMode}
                    />
                  </>
                )}

                {activeSection === 'skills' && (
                  <SkillsSection
                    mode="user-hub"
                    skills={skills}
                    userApps={apps}
                    availableAgents={agents}
                    isAdmin={isAdmin}
                    onOpenGovernance={() =>
                      setActiveSection('skill-governance')
                    }
                    pendingReviewCount={pendingSkillsCount}
                    approvedCount={approvedSkillsCount}
                    registrySkills={registrySkills}
                    workflowEmails={workflowEmails}
                    loading={loading}
                    onApproveSkill={handleApproveSkill}
                    onRejectSkill={handleRejectSkill}
                  />
                )}

                {activeSection === 'skill-governance' && (
                  <SkillsSection
                    mode="admin-governance"
                    skills={skills}
                    userApps={apps}
                    availableAgents={agents}
                    isAdmin={isAdmin}
                    pendingReviewCount={pendingSkillsCount}
                    approvedCount={approvedSkillsCount}
                    registrySkills={registrySkills}
                    workflowEmails={workflowEmails}
                    loading={loading}
                    onApproveSkill={handleApproveSkill}
                    onRejectSkill={handleRejectSkill}
                  />
                )}

                {activeSection === 'provisioning' && isAdmin && (
                  <ProvisioningStudio
                    jobs={provisioningJobs}
                    activeWorkspaceLocks={activeWorkspaceLocks}
                    existingApps={apps}
                    onProvisionGeApp={handleProvisionGeApp}
                    onProvisionIdentity={handleProvisionIdentity}
                    onProvisionM365={handleProvisionM365}
                    onApproveJob={handleApproveProvisioningJob}
                    onRejectJob={handleRejectProvisioningJob}
                  />
                )}

                {activeSection === 'agents' && (
                  <AgentsView agents={agents} loading={loading} />
                )}

                {activeSection === 'mcp' && (
                  <McpServersView servers={mcpServers} loading={loading} />
                )}
              </div>
            </div>
          </main>
        </div>
      )}
    </ThemeProvider>
  );
}
