/**
 * Google Cloud Console view for the ADK & A2A Agent Registry (/api/v1/agents)
 * with expandable search bar and Card View / List View switcher.
 */

import React, { useMemo, useState } from 'react';
import {
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Cpu,
  Layers,
  LayoutGrid,
  List,
  Search,
  Sparkles,
  Terminal,
} from 'lucide-react';
import { AgentSummary } from '../types/catalog';

export interface AgentsViewProps {
  agents: AgentSummary[];
  loading?: boolean;
}

/**
 * Renders the Google Cloud Console-styled ADK & A2A Agent Registry with Card and List views.
 */
export function AgentsView({
  agents,
  loading = false,
}: AgentsViewProps): React.ReactElement {
  const [copiedResource, setCopiedResource] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchExpanded, setIsSearchExpanded] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  function handleCopy(text: string): void {
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(text);
    }
    setCopiedResource(text);
    setTimeout(() => setCopiedResource(null), 2000);
  }

  const filteredAgents = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    if (!needle) {
      return agents;
    }
    return agents.filter((a) =>
      [
        a.agent_id,
        a.display_name,
        a.description,
        a.resource_name,
        ...a.pinned_apps,
      ]
        .join(' ')
        .toLowerCase()
        .includes(needle),
    );
  }, [agents, searchQuery]);

  const totalPinnedApps = new Set(agents.flatMap((a) => a.pinned_apps)).size;
  const totalSubskills = agents.reduce((acc, a) => acc + a.subskills_count, 0);

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-blue-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              Vertex AI Agent Runtime
            </span>
            <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
              us-central1 • cymbal-app-514110
            </span>
          </div>
          <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Agent Registry
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Governed Vertex AI Reasoning Engine agents pinned to Cymbal Gemini
            Enterprise applications with per-user OAuth token passthrough.
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Registered ADK Agents
            </span>
            <Bot className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {agents.length}
          </p>
          <p className="mt-0.5 text-[11px] text-emerald-600 dark:text-emerald-400">
            100% Healthy on Agent Runtime
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Pinned Cymbal GE Apps
            </span>
            <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {totalPinnedApps}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            Default Pinned Assistant Enabled
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Orchestrated Sub-Skills
            </span>
            <Sparkles className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {totalSubskills}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            Dynamic SKILL.md Bundle Loader
          </p>
        </div>
      </div>

      {/* Expandable Search & Card/List View Toolbar */}
      <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setIsSearchExpanded((prev) => !prev)}
            aria-expanded={isSearchExpanded}
            aria-label="Toggle search"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <Search className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Search Agents</span>
            {isSearchExpanded ? (
              <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>

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

        <div
          className={`transition-all duration-200 ${
            isSearchExpanded || Boolean(searchQuery.trim())
              ? 'mt-3 max-h-40 border-t border-slate-100 pt-3 opacity-100 dark:border-slate-800'
              : 'max-h-0 overflow-hidden opacity-0'
          }`}
        >
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter agents by name, Reasoning Engine ID, or pinned GE app..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pr-3 pl-9 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Agents Content: List View vs Card View */}
      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
          Loading Cymbal Agent Registry...
        </div>
      ) : viewMode === 'list' ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs dark:divide-slate-800">
              <thead className="bg-slate-50 font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Agent Name</th>
                  <th className="px-4 py-3">Agent ID</th>
                  <th className="px-4 py-3">Reasoning Engine Resource</th>
                  <th className="px-4 py-3">Pinned Apps</th>
                  <th className="px-4 py-3">Sub-Skills</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredAgents.map((agent) => (
                  <tr
                    key={agent.agent_id}
                    className="transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                  >
                    <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white">
                      {agent.display_name}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-700 dark:text-slate-300">
                      {agent.agent_id}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                      {agent.resource_name}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {agent.pinned_apps.map((appId) => (
                          <span
                            key={appId}
                            className="rounded bg-blue-50 px-2 py-0.5 font-mono text-[11px] text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                          >
                            {appId}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-slate-700 dark:text-slate-300">
                      {agent.subskills_count} sub-skills
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        <CheckCircle2 className="h-3 w-3" />
                        {agent.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAgents.map((agent) => (
            <div
              key={agent.agent_id}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs transition hover:border-blue-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-800"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
                    <Bot className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        {agent.display_name}
                      </h3>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {agent.status}
                      </span>
                      <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        v{agent.version}
                      </span>
                      <span className="rounded bg-indigo-50 px-2 py-0.5 font-mono text-xs font-medium text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300">
                        {agent.deployment_target}
                      </span>
                      {agent.specialization && (
                        <span className="rounded bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700 dark:bg-purple-950/70 dark:text-purple-300">
                          {agent.specialization}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                      {agent.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Reasoning Engine Resource URI */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200/80 bg-slate-50 px-3.5 py-2 dark:border-slate-800 dark:bg-slate-800/60">
                <div className="flex min-w-0 items-center gap-2">
                  <Cpu className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Reasoning Engine:
                  </span>
                  <code className="truncate font-mono text-xs text-slate-800 dark:text-slate-200">
                    {agent.resource_name}
                  </code>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(agent.resource_name)}
                  className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  {copiedResource === agent.resource_name ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-500" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Copy ID</span>
                    </>
                  )}
                </button>
              </div>

              {/* Pinned Applications, Shared Skills & Starter Prompts */}
              <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3.5 dark:border-slate-800/80 dark:bg-slate-800/30">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Pinned Gemini Enterprise Apps ({agent.pinned_apps.length})
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {agent.pinned_apps.map((appId) => (
                      <span
                        key={appId}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200/80 bg-blue-50 px-2.5 py-1 font-mono text-xs font-medium text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/60 dark:text-blue-300"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
                        {appId}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3.5 dark:border-slate-800/80 dark:bg-slate-800/30">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Shared Skills from Registry (
                    {agent.shared_skills?.length ?? agent.subskills_count})
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {(agent.shared_skills ?? []).map((skillSlug) => (
                      <span
                        key={skillSlug}
                        className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-mono text-[11px] font-medium text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-300"
                      >
                        <Sparkles className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                        {skillSlug}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3.5 dark:border-slate-800/80 dark:bg-slate-800/30">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Synced Starter Prompts ({agent.starter_prompts.length})
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {agent.starter_prompts.map((prompt) => (
                      <li
                        key={prompt}
                        className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300"
                      >
                        <Terminal className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-500" />
                        <span>{prompt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
