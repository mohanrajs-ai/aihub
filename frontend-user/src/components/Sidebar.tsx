/**
 * User Portal Docked Left Navigation Sidebar (Google Cloud Console Style).
 * Displays GE App Hub and conditionally displays AntiGravity Hub when the user
 * holds a 'standard' or 'plus' Gemini Enterprise license.
 */

import React, { useState } from 'react';
import {
  LayoutGrid,
  PanelLeftClose,
  PanelLeftOpen,
  Rocket,
} from 'lucide-react';
import { PortalSection } from '../types/catalog';

export interface SidebarProps {
  activeSection: PortalSection;
  onSelectSection: (section: PortalSection) => void;
  appsCount: number;
  showAntiGravityHub?: boolean;
  userLicenseType?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({
  activeSection,
  onSelectSection,
  appsCount,
  showAntiGravityHub = false,
  userLicenseType = 'standard',
  collapsed,
  onToggleCollapse,
}: SidebarProps): React.ReactElement {
  const [internalCollapsed, setInternalCollapsed] = useState<boolean>(false);
  const isCollapsed = collapsed ?? internalCollapsed;

  function handleToggle(): void {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      setInternalCollapsed((prev) => !prev);
    }
  }

  const navItems: Array<{
    id: PortalSection;
    label: string;
    description: string;
    icon: React.ReactNode;
    badge?: React.ReactNode;
  }> = [
    {
      id: 'apps',
      label: 'GE App Hub',
      description: 'Gemini Enterprise Apps',
      icon: <LayoutGrid className="h-4 w-4 shrink-0" aria-hidden="true" />,
      badge: (
        <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          {appsCount}
        </span>
      ),
    },
    ...(showAntiGravityHub
      ? [
          {
            id: 'antigravity' as PortalSection,
            label: 'AGY Hub',
            description: 'VS Code • CLI • App',
            icon: <Rocket className="h-4 w-4 shrink-0" aria-hidden="true" />,
            badge: (
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300">
                {userLicenseType}
              </span>
            ),
          },
        ]
      : []),
  ];

  return (
    <aside
      aria-label="Primary Navigation"
      className={`shrink-0 border-b border-slate-200 bg-white transition-all duration-200 dark:border-slate-800 dark:bg-slate-900 lg:min-h-[calc(100vh-61px)] lg:border-b-0 lg:border-r ${
        isCollapsed ? 'w-full lg:w-16' : 'w-full lg:w-64'
      }`}
    >
      <div className="flex flex-col justify-between lg:sticky lg:top-[61px] lg:h-[calc(100vh-61px)]">
        <div>
          <div
            className={`flex items-center border-b border-slate-200 bg-slate-50/70 px-3.5 py-3 dark:border-slate-800 dark:bg-slate-800/50 ${
              isCollapsed ? 'justify-center' : 'justify-between'
            }`}
          >
            {!isCollapsed && (
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Gemini Enterprise
                </span>
                <span className="rounded bg-blue-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  global
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={handleToggle}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Minimize sidebar'}
              title={isCollapsed ? 'Expand sidebar' : 'Minimize sidebar'}
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-200/70 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-blue-400"
            >
              {isCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
              ) : (
                <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>

          <nav className="space-y-0.5 py-2">
            {navItems.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectSection(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={item.label}
                  className={`flex w-full items-center text-left transition ${
                    isCollapsed
                      ? 'justify-center py-2.5'
                      : 'justify-between gap-3 px-4 py-2.5'
                  } ${
                    isActive
                      ? 'border-l-4 border-blue-600 bg-blue-50/90 font-semibold text-blue-700 dark:border-blue-400 dark:bg-blue-950/60 dark:text-blue-300'
                      : 'border-l-4 border-transparent text-slate-700 hover:bg-slate-100/80 dark:text-slate-200 dark:hover:bg-slate-800/70'
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        isActive
                          ? 'bg-blue-600 text-white dark:bg-blue-500'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {item.icon}
                    </div>
                    {!isCollapsed && (
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {item.label}
                        </p>
                        <p
                          className={`truncate text-[11px] ${
                            isActive
                              ? 'text-blue-600/90 dark:text-blue-300/80'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {item.description}
                        </p>
                      </div>
                    )}
                  </div>
                  {!isCollapsed && <div className="shrink-0">{item.badge}</div>}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="hidden border-t border-slate-200 px-3.5 py-2.5 dark:border-slate-800 lg:flex lg:items-center lg:justify-between">
          {!isCollapsed && (
            <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
              Navigation Menu
            </span>
          )}
          <button
            type="button"
            onClick={handleToggle}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
          >
            {isCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}
