/**
 * Google Cloud Console view for Connectors/MCP tool servers (/api/v1/mcp-servers)
 * with expandable search bar and Card View / List View switcher.
 */

import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  LayoutGrid,
  List,
  PlugZap,
  Search,
  Server,
  Wrench,
} from 'lucide-react';
import { McpServerSummary } from '../types/catalog';

export interface McpServersViewProps {
  servers: McpServerSummary[];
  loading?: boolean;
}

/**
 * Renders the Google Cloud Console-styled Connectors/MCP view with Card and List views.
 */
export function McpServersView({
  servers,
  loading = false,
}: McpServersViewProps): React.ReactElement {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSource, setSelectedSource] = useState<string>('ALL');
  const [expandedServerId, setExpandedServerId] = useState<string | null>(null);
  const [isSearchExpanded, setIsSearchExpanded] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  const dataSources = useMemo(() => {
    const unique = Array.from(new Set(servers.map((s) => s.data_source)));
    return ['ALL', ...unique];
  }, [servers]);

  const filteredServers = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    return servers.filter((srv) => {
      if (selectedSource !== 'ALL' && srv.data_source !== selectedSource) {
        return false;
      }
      if (!needle) {
        return true;
      }
      const haystack = [
        srv.server_id,
        srv.display_name,
        srv.data_source,
        srv.endpoint_uri,
        ...srv.entities,
        ...srv.enabled_actions,
        ...srv.attached_apps,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [servers, searchQuery, selectedSource]);

  const totalTools = useMemo(
    () => servers.reduce((acc, s) => acc + s.tools_count, 0),
    [servers],
  );

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              Discovery Engine Connectors & MCP
            </span>
            <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
              global • cymbal-app-514110
            </span>
          </div>
          <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Connector/MCP
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Active Federated Search and BAP Action tool servers across
            ServiceNow, Atlassian Jira, Confluence, and Microsoft 365.
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Active Connector Servers
            </span>
            <PlugZap className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {servers.length}
          </p>
          <p className="mt-0.5 text-[11px] text-emerald-600 dark:text-emerald-400">
            All Connectors ACTIVE (FEDERATED + ACTIONS)
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Enabled Action Tools
            </span>
            <Wrench className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {totalTools}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            Read & Write BAP Tools Registered
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Enterprise Systems Bound
            </span>
            <Server className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {dataSources.length - 1}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            ServiceNow, Jira, Confluence & M365
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
            <span>Search & Filter Connectors</span>
            {isSearchExpanded ? (
              <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>

          <div
            role="group"
            aria-label="Connectors view mode switcher"
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
            isSearchExpanded ||
            Boolean(searchQuery.trim()) ||
            selectedSource !== 'ALL'
              ? 'mt-3 max-h-60 border-t border-slate-100 pt-3 opacity-100 dark:border-slate-800'
              : 'max-h-0 overflow-hidden opacity-0'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative min-w-[260px] flex-1">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter MCP servers & connectors by name, tool, or entity..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pr-3 pl-9 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {dataSources.map((src) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setSelectedSource(src)}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold uppercase transition ${
                    selectedSource === src
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {src}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Connectors/MCP Content: List View vs Card View */}
      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
          Loading Cymbal Connectors & MCP servers...
        </div>
      ) : viewMode === 'list' ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs dark:divide-slate-800">
              <thead className="bg-slate-50 font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Connector / MCP Server</th>
                  <th className="px-4 py-3">Server ID</th>
                  <th className="px-4 py-3">Endpoint URI</th>
                  <th className="px-4 py-3">Modes</th>
                  <th className="px-4 py-3">Tools</th>
                  <th className="px-4 py-3">Attached Apps</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredServers.map((srv) => (
                  <tr
                    key={srv.server_id}
                    className="transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                  >
                    <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white">
                      {srv.display_name}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-700 dark:text-slate-300">
                      {srv.server_id}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-[11px] text-blue-600 dark:text-blue-400">
                      {srv.endpoint_uri}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {srv.connector_modes.map((m) => (
                          <span
                            key={m}
                            className="rounded bg-blue-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-blue-700 dark:bg-blue-950/70 dark:text-blue-300"
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-bold text-indigo-700 dark:text-indigo-300">
                      {srv.tools_count} tools
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {srv.attached_apps.map((appId) => (
                          <span
                            key={appId}
                            className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          >
                            {appId}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        <CheckCircle2 className="h-3 w-3" />
                        {srv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredServers.map((srv) => {
            const isExpanded = expandedServerId === srv.server_id;
            return (
              <div
                key={srv.server_id}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs transition hover:border-blue-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-800"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300">
                      <PlugZap className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          {srv.display_name}
                        </h3>
                        <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {srv.server_id}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                          <CheckCircle2 className="h-3 w-3" />
                          {srv.status}
                        </span>
                        {srv.connector_modes.map((mode) => (
                          <span
                            key={mode}
                            className="rounded bg-blue-50 px-2 py-0.5 font-mono text-[10px] font-bold text-blue-700 dark:bg-blue-950/70 dark:text-blue-300"
                          >
                            {mode}
                          </span>
                        ))}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                        <a
                          href={srv.endpoint_uri}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-blue-600 hover:underline dark:text-blue-400"
                        >
                          <span>{srv.endpoint_uri}</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        <span>•</span>
                        <span>
                          Entities:{' '}
                          <strong className="font-mono text-slate-700 dark:text-slate-300">
                            {srv.entities.join(', ')}
                          </strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300">
                      <Wrench className="h-3.5 w-3.5" />
                      {srv.tools_count} tools
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedServerId(isExpanded ? null : srv.server_id)
                      }
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    >
                      <span>{isExpanded ? 'Hide Tools' : 'Inspect Tools'}</span>
                      {isExpanded ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Attached Apps */}
                <div className="mt-3 flex flex-wrap items-center gap-1.5 pt-2">
                  <span className="text-[11px] font-medium text-slate-400">
                    Attached GE Apps:
                  </span>
                  {srv.attached_apps.map((appId) => (
                    <span
                      key={appId}
                      className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[11px] text-slate-600 dark:border-slate-800 dark:bg-slate-800/70 dark:text-slate-300"
                    >
                      {appId}
                    </span>
                  ))}
                </div>

                {/* Expandable Enabled Actions Drawer */}
                {isExpanded && (
                  <div className="mt-4 border-t border-slate-100 pt-3.5 dark:border-slate-800">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Enabled BAP Action & Search Tools (
                      {srv.enabled_actions.length})
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {srv.enabled_actions.map((actionName) => (
                        <span
                          key={actionName}
                          className="rounded-md border border-emerald-200/80 bg-emerald-50/70 px-2 py-0.5 font-mono text-[11px] font-medium text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
                        >
                          {actionName}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
