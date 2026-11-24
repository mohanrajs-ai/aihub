/**
 * Root application component for Gemini Enterprise AppHub.
 * Orchestrates global authentication, active session state, and routes to
 * either the User Portal or the Admin Console system.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { AdminConsole } from './components/AdminConsole';
import { Header } from './components/Header';
import { LoginScreen } from './components/LoginScreen';
import { UserPortal } from './components/UserPortal';
import { ThemeProvider } from './context/ThemeContext';
import {
  AgentSummary,
  CatalogApplication,
  DiscoveredSkill,
  GeAppProvisionRequest,
  IdentityProvisionRequest,
  M365ConnectorProvisionRequest,
  McpServerSummary,
  ProvisioningJobItem,
  SkillRegistryItem,
  SuggestedUser,
  SyncStatusResponse,
  UserContext,
  WorkflowEmailItem,
} from './types/catalog';

const SESSION_TOKEN_KEY = 'ge_auth_token';

/**
 * Main portal layout, authentication gate, and system switcher container.
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

  // Top-level System Router State: 'user' | 'admin'
  const [activeSystem, setActiveSystem] = useState<'user' | 'admin'>(() => {
    if (typeof window !== 'undefined') {
      if (
        window.location.pathname.startsWith('/admin') ||
        window.location.hash === '#admin'
      ) {
        return 'admin';
      }
    }
    return 'user';
  });

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
    setActiveSystem('user');
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
    const adminRoles = [
      'admin',
      'it-admin',
      'security-reviewer',
      'platform-lead',
      'cloud-architect',
    ];
    if (user?.roles?.some((r) => adminRoles.includes(r.toLowerCase()))) {
      return true;
    }
    const email = (user?.email || '').toLowerCase();
    return email.startsWith('admin@') || email.includes('infosec');
  }, [user, activeDevRole]);

  function handleSystemChange(system: 'user' | 'admin'): void {
    setActiveSystem(system);
    if (typeof window !== 'undefined') {
      window.history.replaceState(
        {},
        document.title,
        system === 'admin' ? '#admin' : '#user',
      );
    }
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
            isAdmin={isAdmin}
            activeSystem={activeSystem}
            onSystemChange={handleSystemChange}
          />

          <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
            {activeSystem === 'admin' ? (
              <AdminConsole
                user={user}
                isAdmin={isAdmin}
                apps={apps}
                agents={agents}
                skills={skills}
                registrySkills={registrySkills}
                workflowEmails={workflowEmails}
                provisioningJobs={provisioningJobs}
                activeWorkspaceLocks={activeWorkspaceLocks}
                onApproveSkill={handleApproveSkill}
                onRejectSkill={handleRejectSkill}
                onProvisionGeApp={handleProvisionGeApp}
                onProvisionIdentity={handleProvisionIdentity}
                onProvisionM365={handleProvisionM365}
                onApproveJob={handleApproveProvisioningJob}
                onRejectJob={handleRejectProvisioningJob}
                onReturnToUserPortal={() => handleSystemChange('user')}
                syncStatus={syncStatus}
                syncing={syncing}
                onSyncNow={() => void handleSyncNow()}
                loading={loading}
              />
            ) : (
              <UserPortal
                user={user}
                apps={apps}
                agents={agents}
                mcpServers={mcpServers}
                skills={skills}
                registrySkills={registrySkills}
                workflowEmails={workflowEmails}
                loading={loading}
                error={error}
                onRetry={() => void loadCatalogData(activeDevRole, authToken)}
                categories={categories}
                departments={departments}
                groups={groups}
                pendingSkillsCount={pendingSkillsCount}
                approvedSkillsCount={approvedSkillsCount}
              />
            )}
          </main>
        </div>
      )}
    </ThemeProvider>
  );
}
