/**
 * Admin Console Component: Centralized administrative control plane for
 * Gemini Enterprise AppHub.
 * Exclusively provides access to 6-Stage Skill Governance Studio,
 * Terraform Infrastructure Provisioning Studio, Catalog/Identity Sync Operations,
 * and Role & Group Access Management.
 */

import React, { useState } from 'react';
import {
  ArrowLeft,
  Clock,
  Database,
  Lock,
  RefreshCw,
  Server,
  ShieldAlert,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { ProvisioningStudio } from './ProvisioningStudio';
import { SkillsSection } from './SkillsSection';
import {
  AgentSummary,
  CatalogApplication,
  DiscoveredSkill,
  GeAppProvisionRequest,
  IdentityProvisionRequest,
  M365ConnectorProvisionRequest,
  ProvisioningJobItem,
  SkillRegistryItem,
  SyncStatusResponse,
  UserContext,
  WorkflowEmailItem,
} from '../types/catalog';

export type AdminSection =
  | 'governance'
  | 'provisioning'
  | 'sync'
  | 'access';

export interface AdminConsoleProps {
  user: UserContext | null;
  isAdmin: boolean;
  apps: CatalogApplication[];
  agents: AgentSummary[];
  skills: DiscoveredSkill[];
  registrySkills: SkillRegistryItem[];
  workflowEmails: WorkflowEmailItem[];
  provisioningJobs: ProvisioningJobItem[];
  activeWorkspaceLocks: string[];
  onApproveSkill: (
    skillId: string,
    targetEngines?: string[],
    targetAgents?: string[],
  ) => Promise<void>;
  onRejectSkill: (skillId: string) => Promise<void>;
  onProvisionGeApp: (payload: GeAppProvisionRequest) => Promise<void>;
  onProvisionIdentity: (payload: IdentityProvisionRequest) => Promise<void>;
  onProvisionM365: (payload: M365ConnectorProvisionRequest) => Promise<void>;
  onApproveJob: (jobId: string, notes?: string) => Promise<void>;
  onRejectJob: (jobId: string, notes?: string) => Promise<void>;
  onReturnToUserPortal?: () => void;
  syncStatus?: SyncStatusResponse | null;
  syncing?: boolean;
  onSyncNow?: () => void;
  loading?: boolean;
}

export function AdminConsole({
  user,
  isAdmin,
  apps,
  agents,
  skills,
  registrySkills,
  workflowEmails,
  provisioningJobs,
  activeWorkspaceLocks,
  onApproveSkill,
  onRejectSkill,
  onProvisionGeApp,
  onProvisionIdentity,
  onProvisionM365,
  onApproveJob,
  onRejectJob,
  onReturnToUserPortal,
  syncStatus,
  syncing,
  onSyncNow,
  loading = false,
}: AdminConsoleProps): React.ReactElement {
  const [activeTab, setActiveTab] = useState<AdminSection>('governance');

  // Guard: If not an admin, render Access Denied state
  if (!isAdmin) {
    return (
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
              You do not have administrative privileges to access the Gemini
              Enterprise Admin Console. This operational plane is restricted to
              authorized Platform Administrators, IT SecOps, and Cloud Architects.
            </p>
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                Active User Identity:
              </p>
              <p className="mt-1 font-mono">
                {user?.email || 'unauthenticated'}
              </p>
              <p className="mt-1">
                Assigned Roles: {user?.roles?.join(', ') || 'employee'}
              </p>
            </div>
            {onReturnToUserPortal && (
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={onReturnToUserPortal}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  Return to User Portal
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const pendingSkillsCount = skills.filter(
    (s) => s.workflow?.current_stage === 'AWAITING_INFOSEC_APPROVAL',
  ).length;

  const adminNavItems = [
    {
      id: 'governance' as AdminSection,
      label: 'Skill Governance Studio',
      description: '6-Stage Eval & InfoSec Approval',
      icon: <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />,
      badge: pendingSkillsCount > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          <Clock className="h-3 w-3" aria-hidden="true" />
          {pendingSkillsCount}
        </span>
      ),
    },
    {
      id: 'provisioning' as AdminSection,
      label: 'Infra Provisioning Studio',
      description: 'Terraform App, WIF & M365 Connectors',
      icon: <Server className="h-4 w-4 shrink-0" aria-hidden="true" />,
      badge: (
        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300">
          IaC
        </span>
      ),
    },
    {
      id: 'sync' as AdminSection,
      label: 'Catalog & Identity Sync',
      description: 'Discovery Engine & Cloud Identity Sync',
      icon: <Database className="h-4 w-4 shrink-0" aria-hidden="true" />,
    },
    {
      id: 'access' as AdminSection,
      label: 'Access & Roles Overview',
      description: 'Cloud Identity RBAC & Membership Inspection',
      icon: <Users className="h-4 w-4 shrink-0" aria-hidden="true" />,
    },
  ];

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      {/* Admin Dedicated Navigation Rail */}
      <aside
        aria-label="Admin Navigation"
        className="w-full shrink-0 transition-all duration-200 lg:w-64"
      >
        <div className="sticky top-20 overflow-hidden rounded-xl border border-indigo-200/80 bg-white shadow-xs dark:border-indigo-950 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-indigo-100 bg-indigo-50/70 px-3.5 py-3 dark:border-indigo-950 dark:bg-indigo-950/40">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-600 text-white">
                <Lock className="h-3.5 w-3.5" aria-hidden="true" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-950 dark:text-indigo-200">
                Admin Console
              </span>
            </div>
          </div>

          <div className="p-2.5">
            <nav className="space-y-1">
              {adminNavItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                      isActive
                        ? 'border-l-4 border-indigo-600 bg-indigo-50/90 font-semibold text-indigo-700 dark:border-indigo-400 dark:bg-indigo-950/60 dark:text-indigo-300'
                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800/70'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          isActive
                            ? 'bg-indigo-600 text-white'
                            : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300'
                        }`}
                      >
                        {item.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {item.label}
                        </p>
                        <p
                          className={`truncate text-[11px] ${
                            isActive
                              ? 'text-indigo-600/90 dark:text-indigo-300/80'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {item.description}
                        </p>
                      </div>
                    </div>
                    {item.badge && <div className="shrink-0">{item.badge}</div>}
                  </button>
                );
              })}
            </nav>

            {onReturnToUserPortal && (
              <div className="mt-4 border-t border-slate-200/80 pt-3 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onReturnToUserPortal}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-blue-400"
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  Return to User Portal
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Admin Content Area */}
      <div className="min-w-0 flex-1">
        {activeTab === 'governance' && (
          <SkillsSection
            mode="admin-governance"
            skills={skills}
            userApps={apps}
            availableAgents={agents}
            isAdmin={true}
            pendingReviewCount={pendingSkillsCount}
            approvedCount={registrySkills.length || skills.length}
            registrySkills={registrySkills}
            workflowEmails={workflowEmails}
            loading={loading}
            onApproveSkill={onApproveSkill}
            onRejectSkill={onRejectSkill}
          />
        )}

        {activeTab === 'provisioning' && (
          <ProvisioningStudio
            jobs={provisioningJobs}
            activeWorkspaceLocks={activeWorkspaceLocks}
            existingApps={apps}
            onProvisionGeApp={onProvisionGeApp}
            onProvisionIdentity={onProvisionIdentity}
            onProvisionM365={onProvisionM365}
            onApproveJob={onApproveJob}
            onRejectJob={onRejectJob}
          />
        )}

        {activeTab === 'sync' && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-800">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Catalog & Identity Sync Operations
                </h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Manage live Google Cloud Discovery Engine application discovery
                  and Cloud Identity group synchronization.
                </p>
              </div>
              {onSyncNow && (
                <button
                  type="button"
                  onClick={onSyncNow}
                  disabled={syncing}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`}
                    aria-hidden="true"
                  />
                  {syncing ? 'Synchronizing...' : 'Trigger Sync Now'}
                </button>
              )}
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

        {activeTab === 'access' && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              Access & Roles Overview
            </h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Preview configured Cloud Identity security groups and current RBAC
              boundaries.
            </p>

            <div className="mt-6 space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Admin Roles Matrix
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
                  Active User Context
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
  );
}
