/**
 * Individual Gemini Enterprise Application Card component.
 * Displays strictly: APP ID (engine_id), APP Name, Group, Location, and URL.
 */

import React from 'react';
import {
  BarChart3,
  Code2,
  ExternalLink,
  Globe,
  Headphones,
  Search,
  ShieldAlert,
  Sparkles,
  Users,
} from 'lucide-react';
import { CatalogApplication } from '../types/catalog';

export interface AppCardProps {
  app: CatalogApplication;
  onSelectTag?: (tag: string) => void;
}

function renderAppIcon(iconName: string): React.ReactElement {
  switch (iconName) {
    case 'Search':
      return <Search className="h-5 w-5" aria-hidden="true" />;
    case 'Code2':
      return <Code2 className="h-5 w-5" aria-hidden="true" />;
    case 'BarChart3':
      return <BarChart3 className="h-5 w-5" aria-hidden="true" />;
    case 'Headphones':
      return <Headphones className="h-5 w-5" aria-hidden="true" />;
    case 'Users':
      return <Users className="h-5 w-5" aria-hidden="true" />;
    case 'ShieldAlert':
      return <ShieldAlert className="h-5 w-5" aria-hidden="true" />;
    default:
      return <Sparkles className="h-5 w-5" aria-hidden="true" />;
  }
}

/**
 * Opens the target Gemini Enterprise application URL in a centered standalone
 * popup window so top-level Workforce Identity OIDC sign-in succeeds without
 * navigating away from the AppHub portal tab.
 */
export function launchAppPopup(app: CatalogApplication): void {
  const width = 1280;
  const height = 820;
  const screenLeft = window.screenLeft ?? window.screenX ?? 0;
  const screenTop = window.screenTop ?? window.screenY ?? 0;
  const outerWidth = window.outerWidth || 1440;
  const outerHeight = window.outerHeight || 900;
  const left = Math.max(0, Math.round(screenLeft + (outerWidth - width) / 2));
  const top = Math.max(0, Math.round(screenTop + (outerHeight - height) / 2));

  const features = [
    'popup=yes',
    `width=${width}`,
    `height=${height}`,
    `left=${left}`,
    `top=${top}`,
    'resizable=yes',
    'scrollbars=yes',
  ].join(',');

  const popupRef = window.open(
    app.launch_url,
    `ge_app_${app.engine_id}`,
    features,
  );
  if (popupRef) {
    popupRef.focus();
  }
}

/**
 * Renders a Material 3 / Cloud Console-inspired card for a GE application.
 */
export function AppCard({ app }: AppCardProps): React.ReactElement {
  const groups = app.allowed_roles
    .filter((r) => r.startsWith('group:'))
    .map((r) => r.replace(/^group:/, ''));

  return (
    <article className="group flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-500/60 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-400/60">
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/80 dark:text-blue-400">
            {renderAppIcon(app.icon_name)}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-slate-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
              {app.display_name}
            </h2>
            <p className="truncate font-mono text-xs font-medium text-slate-500 dark:text-slate-400">
              APP ID: {app.engine_id}
            </p>
          </div>
        </div>

        <dl className="mt-4 space-y-2 text-xs">
          <div className="flex items-start justify-between gap-2">
            <dt className="font-semibold text-slate-500 dark:text-slate-400">
              Group:
            </dt>
            <dd className="text-right font-mono text-[11px] font-medium text-indigo-700 dark:text-indigo-300">
              {groups.length > 0 ? groups.join(', ') : 'All Authorized'}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="font-semibold text-slate-500 dark:text-slate-400">
              Location:
            </dt>
            <dd className="inline-flex items-center gap-1 font-mono text-slate-700 dark:text-slate-300">
              <Globe className="h-3 w-3 text-slate-400" aria-hidden="true" />
              {app.location}
            </dd>
          </div>
          <div className="pt-1">
            <dt className="font-semibold text-slate-500 dark:text-slate-400">
              URL:
            </dt>
            <dd className="mt-1">
              <button
                type="button"
                onClick={() => launchAppPopup(app)}
                aria-label={`Launch App ${app.display_name}`}
                className="inline-flex w-full items-center justify-between gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono text-[11px] font-medium text-blue-600 transition hover:border-blue-500 hover:bg-blue-50/50 dark:border-slate-700 dark:bg-slate-800 dark:text-blue-400"
              >
                <span className="truncate">{app.launch_url}</span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              </button>
            </dd>
          </div>
        </dl>
      </div>
    </article>
  );
}
