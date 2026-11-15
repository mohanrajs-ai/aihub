/**
 * Responsive application catalog supporting both Card View (current grid view)
 * and Google Cloud Console List View (table view).
 */

import React from 'react';
import {
  ExternalLink,
  FolderSearch,
  Globe,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { CatalogApplication } from '../types/catalog';
import { AppCard, launchAppPopup } from './AppCard';

export interface CatalogGridProps {
  apps: CatalogApplication[];
  loading: boolean;
  onResetFilters: () => void;
  onSelectTag?: (tag: string) => void;
  viewMode?: 'grid' | 'list';
}

/**
 * Renders the application card grid or list table, plus loading/empty states.
 */
export function CatalogGrid({
  apps,
  loading,
  onResetFilters,
  onSelectTag,
  viewMode = 'list',
}: CatalogGridProps): React.ReactElement {
  if (loading) {
    return (
      <div
        aria-label="Loading applications"
        className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
      >
        {[1, 2, 3, 4, 5, 6].map((item) => (
          <div
            key={item}
            className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="h-11 w-11 rounded-xl bg-slate-200 dark:bg-slate-800" />
            <div className="mt-4 h-5 w-3/4 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="mt-3 h-3 w-full rounded bg-slate-100 dark:bg-slate-800/70" />
            <div className="mt-2 h-3 w-5/6 rounded bg-slate-100 dark:bg-slate-800/70" />
          </div>
        ))}
      </div>
    );
  }

  if (apps.length === 0) {
    return (
      <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center dark:border-slate-800 dark:bg-slate-900">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          <FolderSearch className="h-6 w-6" aria-hidden="true" />
        </div>
        <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">
          No matching applications found
        </h3>
        <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
          No Gemini Enterprise applications matched your current search or
          category filters. Try broadening your query or resetting filters.
        </p>
        <button
          type="button"
          onClick={onResetFilters}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Reset all filters
        </button>
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs dark:divide-slate-800">
            <thead className="bg-slate-50 font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Application</th>
                <th className="px-4 py-3">Engine ID</th>
                <th className="px-4 py-3">Category & Department</th>
                <th className="px-4 py-3">Authorized Group</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {apps.map((app) => {
                const groups = app.allowed_roles
                  .filter((r) => r.startsWith('group:'))
                  .map((r) => r.replace(/^group:/, ''));
                return (
                  <tr
                    key={app.engine_id}
                    className="transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                          <Sparkles className="h-4 w-4" aria-hidden="true" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {app.display_name}
                            </span>
                            {app.featured && (
                              <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                                Featured
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 line-clamp-1 max-w-md text-[11px] text-slate-500 dark:text-slate-400">
                            {app.description}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-mono font-medium text-slate-700 dark:text-slate-300">
                      {app.engine_id}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="rounded bg-slate-100 px-2 py-0.5 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {app.category}
                      </span>
                      <span className="ml-1.5 text-slate-500 dark:text-slate-400">
                        • {app.department}
                      </span>
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
                      <button
                        type="button"
                        onClick={() => launchAppPopup(app)}
                        aria-label={`Launch App ${app.display_name}`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-blue-700"
                      >
                        <span>Launch App</span>
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {apps.map((app) => (
        <AppCard key={app.engine_id} app={app} onSelectTag={onSelectTag} />
      ))}
    </div>
  );
}
