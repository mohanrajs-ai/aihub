/**
 * User Portal Left Navigation Sidebar.
 * Displays navigation rail for Apps, Skills, Agents, and MCP Connectors.
 * Contains ZERO administrative sections or governance approval controls.
 */

import React, { useState } from 'react';
import {
  Bot,
  LayoutGrid,
  PanelLeftClose,
  PanelLeftOpen,
  PlugZap,
  Sparkles,
} from 'lucide-react';
import { PortalSection } from '../types/catalog';

export interface SidebarProps {
  activeSection: PortalSection;
  onSelectSection: (section: PortalSection) => void;
  appsCount: number;
  skillsCount: number;
  agentsCount?: number;
  mcpCount?: number;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({
  activeSection,
  onSelectSection,
  appsCount,
  skillsCount,
  agentsCount = 1,
  mcpCount = 7,
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
    count: number;
    badge?: React.ReactNode;
  }> = [
    {
      id: 'apps',
      label: 'GE App Hub',
      description: 'Gemini Enterprise Apps',
      icon: <LayoutGrid className="h-4 w-4 shrink-0" aria-hidden="true" />,
      count: appsCount,
      badge: (
        <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          {appsCount}
        </span>
      ),
    },
    {
      id: 'skills',
      label: 'Skill Registry',
      description: 'Published AI Skill Hub',
      icon: <Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />,
      count: skillsCount,
      badge: (
        <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          {skillsCount}
        </span>
      ),
    },
    {
      id: 'agents',
      label: 'Agent Registry',
      description: 'Specialized ADK Agents',
      icon: <Bot className="h-4 w-4 shrink-0" aria-hidden="true" />,
      count: agentsCount,
      badge: (
        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/80 dark:text-blue-300">
          {agentsCount}
        </span>
      ),
    },
    {
      id: 'mcp',
      label: 'Connector/MCP',
      description: 'Data Connectors & MCP',
      icon: <PlugZap className="h-4 w-4 shrink-0" aria-hidden="true" />,
      count: mcpCount,
      badge: (
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300">
          {mcpCount}
        </span>
      ),
    },
  ];

  return (
    <aside
      aria-label="Primary Navigation"
      className={`shrink-0 transition-all duration-200 ${
        isCollapsed ? 'w-full lg:w-16' : 'w-full lg:w-64'
      }`}
    >
      <div className="sticky top-20 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div
          className={`flex items-center border-b border-slate-200 bg-slate-50/80 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-800/60 ${
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
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200/80 bg-white text-slate-600 transition hover:bg-slate-100 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            {isCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
            ) : (
              <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>

        <div className="p-2.5">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectSection(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={item.label}
                  className={`flex w-full items-center rounded-lg text-left transition ${
                    isCollapsed
                      ? 'justify-center p-2'
                      : 'justify-between gap-3 px-3 py-2.5'
                  } ${
                    isActive
                      ? 'border-l-4 border-blue-600 bg-blue-50/90 font-semibold text-blue-700 dark:border-blue-400 dark:bg-blue-950/60 dark:text-blue-300'
                      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800/70'
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
      </div>
    </aside>
  );
}
