/**
 * User Portal Connector/MCP Component (`frontend-user`).
 * Displays an Application selector restricted to the user's authorized applications (`userApps`),
 * filters MCP servers/connectors to those attached to the selected authorized app, and provides
 * a clean List/Card view with a View Tools modal matching the Skill Registry UX.
 */

import React, { useMemo, useState } from 'react';
import {
  FileText,
  FolderGit2,
  LayoutGrid,
  List,
  PlugZap,
  Search,
  Wrench,
  X,
} from 'lucide-react';
import { CatalogApplication, McpServerSummary } from '../types/catalog';

export interface McpServersViewProps {
  servers: McpServerSummary[];
  userApps?: CatalogApplication[];
  loading?: boolean;
}

export function McpServersView({
  servers,
  userApps = [],
  loading = false,
}: McpServersViewProps): React.ReactElement {
  const [selectedEngineId, setSelectedEngineId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedServer, setSelectedServer] =
    useState<McpServerSummary | null>(null);

  const authorizedEngineIds = useMemo(
    () => new Set(userApps.map((app) => app.engine_id)),
    [userApps],
  );

  // Restrict connectors strictly to those attached to apps the user has access to
  const authorizedServers = useMemo(() => {
    return servers
      .map((srv) => {
        const allowedApps = (srv.attached_apps ?? []).filter((appId) =>
          authorizedEngineIds.has(appId),
        );
        return {
          ...srv,
          attached_apps: allowedApps,
        };
      })
      .filter((srv) => srv.attached_apps.length > 0);
  }, [servers, authorizedEngineIds]);

  const filteredServers = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    return authorizedServers.filter((srv) => {
      if (
        selectedEngineId &&
        !srv.attached_apps.includes(selectedEngineId)
      ) {
        return false;
      }
      if (!needle) {
        return true;
      }
      const searchable = [
        srv.server_id,
        srv.display_name,
        srv.data_source,
        srv.endpoint_uri,
        ...srv.entities,
        ...srv.enabled_actions,
      ]
        .join(' ')
        .toLowerCase();
      return searchable.includes(needle);
    });
  }, [authorizedServers, selectedEngineId, searchQuery]);

  if (loading) {
    return (
      <div aria-label="Loading connectors" className="mt-4 space-y-3">
        {[1, 2, 3].map((item) => (
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
            Connector/MCP
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Select an authorized application to view its attached data
            connectors, MCP servers, and enabled action tools.
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
              htmlFor="mcp-app-select"
              className="font-semibold text-slate-600 dark:text-slate-300"
            >
              Application:
            </label>
            <select
              id="mcp-app-select"
              aria-label="Choose application for connectors"
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
              placeholder="Filter connectors..."
              aria-label="Search connectors"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pr-3 pl-8 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
        </div>

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

      {filteredServers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <PlugZap className="mx-auto h-10 w-10 text-slate-400" />
          <h3 className="mt-3 text-base font-semibold text-slate-900 dark:text-white">
            No connectors found for the selected application
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
                  <th className="px-4 py-3">Connector ID</th>
                  <th className="px-4 py-3">Connector Name</th>
                  <th className="px-4 py-3">Data Source & Modes</th>
                  <th className="px-4 py-3 text-right">Tools</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredServers.map((srv) => (
                  <tr
                    key={srv.server_id}
                    className="transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                  >
                    <td className="px-4 py-3.5 font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {srv.server_id}
                    </td>
                    <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white">
                      {srv.display_name}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {srv.data_source}
                        </span>
                        {srv.connector_modes.map((mode) => (
                          <span
                            key={mode}
                            className="rounded bg-blue-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-blue-700 dark:bg-blue-950/70 dark:text-blue-300"
                          >
                            {mode}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedServer(srv)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-blue-500 hover:bg-blue-50/50 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-blue-400"
                      >
                        <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>View Tools ({srv.tools_count})</span>
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
          {filteredServers.map((srv) => (
            <article
              key={srv.server_id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition hover:border-blue-500/60 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="space-y-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Connector ID
                  </p>
                  <p className="mt-0.5 truncate font-mono text-xs font-bold text-slate-900 dark:text-white">
                    {srv.server_id}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Connector Name
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white">
                    {srv.display_name}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Data Source & Modes
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {srv.data_source}
                    </span>
                    {srv.connector_modes.map((mode) => (
                      <span
                        key={mode}
                        className="rounded bg-blue-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-blue-700 dark:bg-blue-950/70 dark:text-blue-300"
                      >
                        {mode}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 border-t border-slate-100 pt-3.5 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedServer(srv)}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs transition hover:bg-blue-700"
                >
                  <Wrench className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>View Tools ({srv.tools_count})</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {selectedServer && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Connector details for ${selectedServer.server_id}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
        >
          <div className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {selectedServer.display_name}
                </h3>
                <p className="mt-0.5 font-mono text-xs text-emerald-600 dark:text-emerald-400">
                  {selectedServer.server_id} • {selectedServer.data_source}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedServer(null)}
                aria-label="Close connector details"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 overflow-y-auto p-6 text-xs">
              <div>
                <p className="font-semibold uppercase tracking-wider text-slate-400">
                  Endpoint URI
                </p>
                <code className="mt-1 block rounded-xl border border-slate-200 bg-slate-950 p-3 font-mono text-xs text-slate-100 dark:border-slate-800">
                  {selectedServer.endpoint_uri}
                </code>
              </div>
              <div>
                <p className="font-semibold uppercase tracking-wider text-slate-400">
                  Entities
                </p>
                <p className="mt-1 font-mono text-slate-700 dark:text-slate-300">
                  {selectedServer.entities.join(', ')}
                </p>
              </div>
              <div>
                <p className="font-semibold uppercase tracking-wider text-slate-400">
                  Enabled Tools ({selectedServer.enabled_actions.length})
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selectedServer.enabled_actions.map((actionName) => (
                    <span
                      key={actionName}
                      className="rounded-md border border-emerald-200/80 bg-emerald-50/70 px-2.5 py-1 font-mono text-[11px] font-medium text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
                    >
                      {actionName}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
