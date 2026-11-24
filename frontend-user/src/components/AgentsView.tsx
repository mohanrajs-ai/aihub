/**
 * User Portal Agent Registry Component (`frontend-user`).
 * Displays an Application selector restricted to the user's authorized applications (`userApps`),
 * filters agents to those pinned to the selected authorized app, and provides a clean
 * List/Card view with a View Agent modal matching the Skill Registry UX.
 */

import React, { useMemo, useState } from 'react';
import {
  Bot,
  FileText,
  FolderGit2,
  LayoutGrid,
  List,
  Search,
  Sparkles,
  Terminal,
  X,
} from 'lucide-react';
import { AgentSummary, CatalogApplication } from '../types/catalog';

export interface AgentsViewProps {
  agents: AgentSummary[];
  userApps?: CatalogApplication[];
  loading?: boolean;
}

export function AgentsView({
  agents,
  userApps = [],
  loading = false,
}: AgentsViewProps): React.ReactElement {
  const [selectedEngineId, setSelectedEngineId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedAgent, setSelectedAgent] = useState<AgentSummary | null>(null);

  const authorizedEngineIds = useMemo(
    () => new Set(userApps.map((app) => app.engine_id)),
    [userApps],
  );

  // Restrict agents strictly to those pinned to apps the user has access to
  const authorizedAgents = useMemo(() => {
    return agents
      .map((agent) => {
        const allowedApps = (agent.pinned_apps ?? []).filter((appId) =>
          authorizedEngineIds.has(appId),
        );
        return {
          ...agent,
          pinned_apps: allowedApps,
        };
      })
      .filter((agent) => agent.pinned_apps.length > 0);
  }, [agents, authorizedEngineIds]);

  const filteredAgents = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    return authorizedAgents.filter((agent) => {
      if (
        selectedEngineId &&
        !agent.pinned_apps.includes(selectedEngineId)
      ) {
        return false;
      }
      if (!needle) {
        return true;
      }
      const searchable = [
        agent.agent_id,
        agent.display_name,
        agent.description,
        ...(agent.shared_skills ?? []),
        ...(agent.supported_connectors ?? []),
      ]
        .join(' ')
        .toLowerCase();
      return searchable.includes(needle);
    });
  }, [authorizedAgents, selectedEngineId, searchQuery]);

  if (loading) {
    return (
      <div aria-label="Loading agents" className="mt-4 space-y-3">
        {[1, 2].map((item) => (
          <div
            key={item}
            className="h-16 animate-pulse rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
          />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Agent Registry
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Select an authorized application to view its pinned ADK agents,
            shared skills, and starter prompts.
          </p>
        </div>
      </div>

      {/* Top Toolbar: Authorized App Selector + Search + View Switcher */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800">
            <FolderGit2
              className="h-4 w-4 text-blue-600 dark:text-blue-400"
              aria-hidden="true"
            />
            <label
              htmlFor="agent-app-select"
              className="font-semibold text-slate-600 dark:text-slate-300"
            >
              Application:
            </label>
            <select
              id="agent-app-select"
              aria-label="Choose application for agents"
              value={selectedEngineId}
              onChange={(e) => setSelectedEngineId(e.target.value)}
              className="bg-transparent font-mono text-xs font-semibold text-slate-900 focus:outline-none dark:text-white"
            >
              <option
                value=""
                className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white"
              >
                All Authorized Apps ({userApps.length})
              </option>
              {userApps.map((app) => (
                <option
                  key={app.engine_id}
                  value={app.engine_id}
                  className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white"
                >
                  {app.display_name} ({app.engine_id})
                </option>
              ))}
            </select>
          </div>

          <div className="relative min-w-[220px]">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter agents..."
              aria-label="Search agents"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pr-3 pl-8 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
        </div>

        <div
          role="group"
          aria-label="Agent view mode switcher"
          className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-100/80 p-0.5 dark:border-slate-700 dark:bg-slate-800"
        >
          <button
            type="button"
            aria-label="Card view"
            onClick={() => setViewMode('grid')}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
              viewMode === 'grid'
                ? 'bg-white text-blue-600 shadow-2xs dark:bg-slate-900 dark:text-blue-400'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Card View</span>
          </button>
          <button
            type="button"
            aria-label="List view"
            onClick={() => setViewMode('list')}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
              viewMode === 'list'
                ? 'bg-white text-blue-600 shadow-2xs dark:bg-slate-900 dark:text-blue-400'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <List className="h-3.5 w-3.5" aria-hidden="true" />
            <span>List View</span>
          </button>
        </div>
      </div>

      {filteredAgents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <Bot className="mx-auto h-10 w-10 text-slate-400" />
          <h3 className="mt-3 text-base font-semibold text-slate-900 dark:text-white">
            No agents found for the selected application
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Choose another authorized application or clear the search filter.
          </p>
        </div>
      ) : viewMode === 'list' ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs dark:divide-slate-800">
              <thead className="bg-slate-50 font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Agent ID</th>
                  <th className="px-4 py-3">Agent Name</th>
                  <th className="px-4 py-3">Shared Skills</th>
                  <th className="px-4 py-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredAgents.map((agent) => (
                  <tr
                    key={agent.agent_id}
                    className="transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                  >
                    <td className="px-4 py-3.5 font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {agent.agent_id}
                    </td>
                    <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white">
                      {agent.display_name}
                    </td>
                    <td className="px-4 py-3.5">
                      {(agent.shared_skills ?? []).length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {(agent.shared_skills ?? []).map((skillSlug) => (
                            <span
                              key={skillSlug}
                              className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 font-mono text-[11px] font-medium text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                            >
                              <Sparkles className="h-3 w-3 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                              {skillSlug}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="font-mono text-slate-500 dark:text-slate-400">
                          {agent.subskills_count} sub-skills
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedAgent(agent)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-blue-500 hover:bg-blue-50/50 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-blue-400"
                      >
                        <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>View Agent</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAgents.map((agent) => (
            <article
              key={agent.agent_id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition hover:border-blue-500/60 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="space-y-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Agent ID
                  </p>
                  <p className="mt-0.5 truncate font-mono text-xs font-bold text-slate-900 dark:text-white">
                    {agent.agent_id}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Agent Name
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white">
                    {agent.display_name}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Shared Skills
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {(agent.shared_skills ?? []).length > 0 ? (
                      (agent.shared_skills ?? []).map((skillSlug) => (
                        <span
                          key={skillSlug}
                          className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 font-mono text-[11px] font-medium text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                        >
                          <Sparkles className="h-3 w-3 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                          {skillSlug}
                        </span>
                      ))
                    ) : (
                      <span className="font-mono text-xs text-slate-500">
                        {agent.subskills_count} sub-skills
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 border-t border-slate-100 pt-3.5 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedAgent(agent)}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs transition hover:bg-blue-700"
                >
                  <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>View Agent</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {selectedAgent && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Agent details for ${selectedAgent.agent_id}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
        >
          <div className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {selectedAgent.display_name}
                </h3>
                <p className="mt-0.5 font-mono text-xs text-blue-600 dark:text-blue-400">
                  {selectedAgent.agent_id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAgent(null)}
                aria-label="Close agent details"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 overflow-y-auto p-6 text-xs">
              <div>
                <p className="font-semibold uppercase tracking-wider text-slate-400">
                  Description
                </p>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                  {selectedAgent.description}
                </p>
              </div>
              <div>
                <p className="font-semibold uppercase tracking-wider text-slate-400">
                  Reasoning Engine Resource
                </p>
                <code className="mt-1 block rounded-xl border border-slate-200 bg-slate-950 p-3 font-mono text-xs text-slate-100 dark:border-slate-800">
                  {selectedAgent.resource_name}
                </code>
              </div>
              {selectedAgent.starter_prompts.length > 0 && (
                <div>
                  <p className="font-semibold uppercase tracking-wider text-slate-400">
                    Starter Prompts
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {selectedAgent.starter_prompts.map((prompt) => (
                      <li
                        key={prompt}
                        className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300"
                      >
                        <Terminal className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-500" />
                        <span>{prompt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
