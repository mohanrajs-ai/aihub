/**
 * Standalone Admin Console Root Component.
 * Dedicated administrative operations plane for Gemini Enterprise AppHub.
 * Exclusively provides access to 6-Stage Skill Governance Studio,
 * Terraform Infrastructure Provisioning Studio, Catalog/Identity Sync, and RBAC matrix.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Database,
  Lock,
  RefreshCw,
  ShieldAlert,
  Users,
} from 'lucide-react';
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
import { AdminHeader } from './components/AdminHeader';
import { AdminSection, AdminSidebar } from './components/AdminSidebar';
import { LoginScreen } from './components/LoginScreen';
import { ProvisioningStudio } from './components/ProvisioningStudio';
import { SkillsSection } from './components/SkillsSection';
import { ThemeProvider } from './context/ThemeContext';
import {
  AgentSummary,
  CatalogApplication,
  DiscoveredSkill,
  GeAppProvisionRequest,
  IdentityProvisionRequest,
  M365ConnectorProvisionRequest,
  ProvisioningJobItem,
  SkillRegistryItem,
  SuggestedUser,
  SyncStatusResponse,
  UserContext,
  WorkflowEmailItem,
} from './types/catalog';

const SESSION_TOKEN_KEY = 'ge_admin_auth_token';

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

  const [activeSection, setActiveSection] = useState<AdminSection>('governance');
  const [apps, setApps] = useState<CatalogApplication[]>([]);
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [skills, setSkills] = useState<DiscoveredSkill[]>([]);
  const [registrySkills, setRegistrySkills] = useState<SkillRegistryItem[]>([]);
  const [workflowEmails, setWorkflowEmails] = useState<WorkflowEmailItem[]>([]);
  const [provisioningJobs, setProvisioningJobs] = useState<ProvisioningJobItem[]>([]);
  const [activeWorkspaceLocks, setActiveWorkspaceLocks] = useState<string[]>([]);
  const [pendingSkillsCount, setPendingSkillsCount] = useState<number>(0);
  const [approvedSkillsCount, setApprovedSkillsCount] = useState<number>(0);
  const [activeDevRole, setActiveDevRole] = useState<string>('admin');
  const [syncStatus, setSyncStatus] = useState<SyncStatusResponse | null>(null);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

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

  const loadAdminData = useCallback(
    async (role: string, token: string) => {
      setLoading(true);
      try {
        const [userRes, catalogRes] = await Promise.all([
          fetchCurrentUser(role, token),
          fetchApps({ devRole: role, authToken: token }),
        ]);
        setUser(userRes);
        setApps(catalogRes.items);

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
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (authToken) {
      void loadAdminData(activeDevRole, authToken);
    }
  }, [activeDevRole, authToken, loadAdminData]);

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
      const message = err instanceof Error ? err.message : 'Unable to sign in';
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
  }

  function handleRoleOrUserSwitch(newRole: string): void {
    if (newRole.includes('@')) {
      setActiveDevRole('admin');
      void handleLoginEmail(newRole);
      return;
    }
    setActiveDevRole(newRole);
  }

  async function handleSyncNow(): Promise<void> {
    if (!authToken) return;
    setSyncing(true);
    try {
      await triggerSync();
      await loadAdminData(activeDevRole, authToken);
    } finally {
      setSyncing(false);
    }
  }

  async function handleApproveSkill(
    skillId: string,
    targetEngines?: string[],
    targetAgents?: string[],
  ): Promise<void> {
    if (!authToken) return;
    await approveSkillWorkflow(
      skillId,
      'Approved via Admin Console InfoSec Review.',
      authToken,
      targetEngines,
      targetAgents,
    );
    await loadAdminData(activeDevRole, authToken);
  }

  async function handleRejectSkill(skillId: string): Promise<void> {
    if (!authToken) return;
    await rejectSkillWorkflow(
      skillId,
      'Rejected during Admin Console InfoSec Review.',
      authToken,
    );
    await loadAdminData(activeDevRole, authToken);
  }

  async function handleProvisionGeApp(
    payload: GeAppProvisionRequest,
  ): Promise<void> {
    if (!authToken) return;
    await createGeAppProvisioningJob(payload, authToken, activeDevRole);
    await loadAdminData(activeDevRole, authToken);
  }

  async function handleProvisionIdentity(
    payload: IdentityProvisionRequest,
  ): Promise<void> {
    if (!authToken) return;
    await createIdentityProvisioningJob(payload, authToken, activeDevRole);
    await loadAdminData(activeDevRole, authToken);
  }

  async function handleProvisionM365(
    payload: M365ConnectorProvisionRequest,
  ): Promise<void> {
    if (!authToken) return;
    await createM365ProvisioningJob(payload, authToken, activeDevRole);
    await loadAdminData(activeDevRole, authToken);
  }

  async function handleApproveProvisioningJob(
    jobId: string,
    notes?: string,
  ): Promise<void> {
    if (!authToken) return;
    await approveProvisioningJob(jobId, notes, authToken, activeDevRole);
    await loadAdminData(activeDevRole, authToken);
  }

  async function handleRejectProvisioningJob(
    jobId: string,
    notes?: string,
  ): Promise<void> {
    if (!authToken) return;
    await rejectProvisioningJob(jobId, notes, authToken, activeDevRole);
    await loadAdminData(activeDevRole, authToken);
  }

  const isAdmin = useMemo(() => {
    const adminRoles = [
      'admin',
      'it-admin',
      'security-reviewer',
      'platform-lead',
      'cloud-architect',
    ];
    if (user) {
      const email = (user.email || '').toLowerCase();
      const hasAdminRole = user.roles?.some((r) =>
        adminRoles.includes(r.toLowerCase()),
      );
      if (hasAdminRole || email.startsWith('admin@') || email.includes('infosec')) {
        return adminRoles.includes(activeDevRole.toLowerCase());
      }
      return false;
    }
    return adminRoles.includes(activeDevRole.toLowerCase());
  }, [user, activeDevRole]);

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
          <AdminHeader
            user={user}
            activeDevRole={activeDevRole}
            onDevRoleChange={handleRoleOrUserSwitch}
            onSignOut={handleSignOut}
          />

          <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
            {!isAdmin ? (
              <div className="mx-auto max-w-2xl py-12">
                <div className="overflow-hidden rounded-2xl border border-red-200 bg-white shadow-lg dark:border-red-900/60 dark:bg-slate-900">
                  <div className="border-b border-red-100 bg-red-50/80 px-6 py-5 dark:border-red-950 dark:bg-red-950/40">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-300">
                        <ShieldAlert className="h-6 w-6" aria-hidden="true" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-red-950 dark:text-red-200">
                          Administrator Role Required
                        </h2>
                        <p className="text-xs text-red-700 dark:text-red-400">
                          Access Restricted — Gemini Enterprise Admin Console
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                      You do not have administrative privileges to access the
                      Gemini Enterprise Admin Console. This operational plane is
                      strictly restricted to Platform Administrators, IT SecOps,
                      and Cloud Architects.
                    </p>
                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        Active User Identity:
                      </p>
                      <p className="mt-1 font-mono">{user?.email || 'unauthenticated'}</p>
                      <p className="mt-1">
                        Assigned Roles: {user?.roles?.join(', ') || 'employee'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
                <AdminSidebar
                  activeSection={activeSection}
                  onSelectSection={setActiveSection}
                  pendingSkillsCount={pendingSkillsCount}
                  skillsCount={skills.length}
                />

                <div className="min-w-0 flex-1">
                  {activeSection === 'governance' && (
                    <SkillsSection
                      mode="admin-governance"
                      skills={skills}
                      userApps={apps}
                      availableAgents={agents}
                      isAdmin={true}
                      pendingReviewCount={pendingSkillsCount}
                      approvedCount={approvedSkillsCount}
                      registrySkills={registrySkills}
                      workflowEmails={workflowEmails}
                      loading={loading}
                      onApproveSkill={handleApproveSkill}
                      onRejectSkill={handleRejectSkill}
                    />
                  )}

                  {activeSection === 'provisioning' && (
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

                  {activeSection === 'sync' && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-800">
                        <div>
                          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                            Catalog & Identity Sync Operations
                          </h3>
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                            Manage live Google Cloud Discovery Engine application
                            discovery and Cloud Identity group synchronization.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleSyncNow()}
                          disabled={syncing}
                          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
                        >
                          <RefreshCw
                            className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`}
                            aria-hidden="true"
                          />
                          {syncing ? 'Synchronizing...' : 'Trigger Sync Now'}
                        </button>
                      </div>

                      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            Total Synced Applications
                          </p>
                          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                            {syncStatus?.total_apps ?? apps.length}
                          </p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            Total Cloud Identity Groups
                          </p>
                          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                            {syncStatus?.total_groups ?? 0}
                          </p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            Last Sync Status
                          </p>
                          <p className="mt-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                            {syncStatus?.last_run?.status?.toUpperCase() || 'COMPLETED'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeSection === 'access' && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                        Access & Roles Matrix
                      </h3>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                        Configured Cloud Identity security groups and current
                        administrative RBAC boundaries.
                      </p>

                      <div className="mt-6 space-y-4">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                            Authorized Administrator Roles
                          </h4>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {[
                              'admin',
                              'it-admin',
                              'security-reviewer',
                              'platform-lead',
                              'cloud-architect',
                            ].map((role) => (
                              <span
                                key={role}
                                className="rounded-lg bg-indigo-100 px-2.5 py-1 text-xs font-mono font-medium text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
                              >
                                {role}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                            Active Administrator Context
                          </h4>
                          <div className="mt-2 text-xs space-y-1 font-mono text-slate-700 dark:text-slate-300">
                            <p>Email: {user?.email}</p>
                            <p>Roles: {user?.roles?.join(', ')}</p>
                            <p>Groups: {user?.groups?.join(', ') || 'None'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </main>
        </div>
      )}
    </ThemeProvider>
  );
}
