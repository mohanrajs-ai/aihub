/**
 * Request Access View Component (`frontend-user`).
 * Allows users to:
 * 1. View all enterprise Gemini Enterprise applications and request access to apps
 *    they do not currently have access to.
 * 2. Request an AGY License (Gemini Enterprise Standard or Gemini Enterprise Plus).
 */

import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Globe,
  KeyRound,
  Lock,
  Rocket,
  Sparkles,
} from 'lucide-react';
import {
  AccessRequestCreatePayload,
  AccessRequestItem,
  CatalogApplication,
  UserContext,
} from '../types/catalog';

export interface RequestAccessViewProps {
  user: UserContext | null;
  authorizedApps: CatalogApplication[];
  allApps: CatalogApplication[];
  accessRequests: AccessRequestItem[];
  onSubmitRequest: (payload: AccessRequestCreatePayload) => Promise<void>;
}

const AGY_LICENSE_TIERS = [
  {
    id: 'agy-standard',
    tier: 'standard',
    name: 'Gemini Enterprise Standard (AGY)',
    description:
      'Unlocks AGY Hub access, Antigravity on VS Code (Tab Supercomplete, Inline Edit ⌘+I, Agent Chat), Antigravity CLI, and Antigravity Desktop App.',
  },
  {
    id: 'agy-plus',
    tier: 'plus',
    name: 'Gemini Enterprise Plus (AGY)',
    description:
      'Includes all Standard capabilities plus higher agent quota, multi-agent /teamwork & /boost orchestration, and priority Vertex AI model capacity.',
  },
];

export function RequestAccessView({
  user,
  authorizedApps,
  allApps,
  accessRequests,
  onSubmitRequest,
}: RequestAccessViewProps): React.ReactElement {
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const authorizedEngineIds = useMemo(
    () => new Set(authorizedApps.map((app) => app.engine_id)),
    [authorizedApps],
  );

  const requestedTargetIds = useMemo(
    () => new Set(accessRequests.map((req) => req.target_id)),
    [accessRequests],
  );

  // Show apps the user can request access to (or all enterprise apps if allApps is populated)
  const requestableApps = useMemo(() => {
    const source = allApps.length > 0 ? allApps : authorizedApps;
    const ungranted = source.filter(
      (app) => !authorizedEngineIds.has(app.engine_id),
    );
    return ungranted.length > 0 ? ungranted : source;
  }, [allApps, authorizedApps, authorizedEngineIds]);

  const currentLicense = (user?.license_type || 'none').toLowerCase();

  async function handleRequest(payload: AccessRequestCreatePayload): Promise<void> {
    setSubmittingId(payload.target_id);
    try {
      await onSubmitRequest(payload);
    } finally {
      setSubmittingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Request Access
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Request access to Gemini Enterprise applications and request or
          upgrade your Google Antigravity (AGY) developer license.
        </p>
      </div>

      {/* Section 1: Request for AGY License */}
      <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              <Rocket className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Request AGY License
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Request a Gemini Enterprise Standard or Plus license to unlock
                AGY Hub (VS Code, CLI, and Desktop App).
              </p>
            </div>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 font-mono text-xs font-semibold uppercase text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            Current License: {currentLicense}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {AGY_LICENSE_TIERS.map((lic) => {
            const isRequested = requestedTargetIds.has(lic.id);
            const isAlreadyActive =
              currentLicense === lic.tier ||
              (currentLicense === 'plus' && lic.tier === 'standard');
            return (
              <div
                key={lic.id}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {lic.name}
                    </h4>
                    <span className="rounded bg-indigo-100 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                      {lic.tier}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                    {lic.description}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-end">
                  {isRequested ? (
                    <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-300">
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>License Requested (Pending Approval)</span>
                    </span>
                  ) : isAlreadyActive ? (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Active</span>
                      </span>
                      <button
                        type="button"
                        disabled={submittingId === lic.id}
                        onClick={() =>
                          void handleRequest({
                            request_type: 'AGY_LICENSE',
                            target_id: lic.id,
                            target_name: lic.name,
                            justification: `Requesting ${lic.name}`,
                          })
                        }
                        className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50 disabled:opacity-50 dark:border-indigo-900 dark:bg-slate-900 dark:text-indigo-300"
                      >
                        <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Request {lic.name}</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={submittingId === lic.id}
                      onClick={() =>
                        void handleRequest({
                          request_type: 'AGY_LICENSE',
                          target_id: lic.id,
                          target_name: lic.name,
                          justification: `Requesting ${lic.name}`,
                        })
                      }
                      className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
                    >
                      <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Request {lic.name}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Section 2: Request Application Access */}
      <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
              <Lock className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Request Application Access
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Request Cloud Identity group membership for Gemini Enterprise
                applications.
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs dark:divide-slate-800">
            <thead className="bg-slate-50 font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">APP ID</th>
                <th className="px-4 py-3">APP Name</th>
                <th className="px-4 py-3">Group</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {requestableApps.map((app) => {
                const groups = app.allowed_roles
                  .filter((r) => r.startsWith('group:'))
                  .map((r) => r.replace(/^group:/, ''));
                const targetGroup = groups[0] || 'all-users';
                const isRequested = requestedTargetIds.has(app.engine_id);
                return (
                  <tr
                    key={app.engine_id}
                    className="transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                  >
                    <td className="px-4 py-3.5 font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {app.engine_id}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                        </div>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {app.display_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-[11px] text-indigo-700 dark:text-indigo-300">
                      {groups.length > 0 ? groups.join(', ') : 'All Authorized'}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1 font-mono text-slate-600 dark:text-slate-400">
                        <Globe className="h-3 w-3" aria-hidden="true" />
                        {app.location}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {isRequested ? (
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-300">
                          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Access Requested</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={submittingId === app.engine_id}
                          aria-label={`Request Access to ${app.display_name}`}
                          onClick={() =>
                            void handleRequest({
                              request_type: 'APP_ACCESS',
                              target_id: app.engine_id,
                              target_name: app.display_name,
                              requested_group: targetGroup,
                              justification: `Requesting access to ${app.display_name}`,
                            })
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-blue-700 disabled:opacity-50"
                        >
                          <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Request Access</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
