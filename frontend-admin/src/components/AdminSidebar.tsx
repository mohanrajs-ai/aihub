/**
 * Admin Console Left Navigation Sidebar.
 * Displays navigation rail for 6-Stage Skill Governance Studio,
 * Terraform Infrastructure Provisioning Studio, Catalog/Identity Sync, and RBAC matrix.
 */

import React, { useState } from 'react';
import {
  Clock,
  Database,
  Lock,
  PanelLeftClose,
  PanelLeftOpen,
  Server,
  ShieldCheck,
  Users,
} from 'lucide-react';

export type AdminSection =
  | 'governance'
  | 'provisioning'
  | 'sync'
  | 'access';

export interface AdminSidebarProps {
  activeSection: AdminSection;
  onSelectSection: (section: AdminSection) => void;
  pendingSkillsCount?: number;
  skillsCount?: number;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function AdminSidebar({
  activeSection,
  onSelectSection,
  pendingSkillsCount = 0,
  skillsCount = 0,
  collapsed,
  onToggleCollapse,
}: AdminSidebarProps): React.ReactElement {
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
    id: AdminSection;
    label: string;
    description: string;
    icon: React.ReactNode;
    badge?: React.ReactNode;
  }> = [
    {
      id: 'governance',
      label: 'Skill Governance Studio',
      description: '6-Stage Eval & InfoSec Approval',
      icon: <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />,
      badge: (
        <div className="flex items-center gap-1">
          {pendingSkillsCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              <Clock className="h-3 w-3" aria-hidden="true" />
              {pendingSkillsCount}
            </span>
          )}
          <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {skillsCount}
          </span>
        </div>
      ),
    },
    {
      id: 'provisioning',
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
      id: 'sync',
      label: 'Catalog & Identity Sync',
      description: 'Discovery Engine & Cloud Identity Sync',
      icon: <Database className="h-4 w-4 shrink-0" aria-hidden="true" />,
    },
    {
      id: 'access',
      label: 'Access & Roles Overview',
      description: 'Cloud Identity RBAC & Membership Inspection',
      icon: <Users className="h-4 w-4 shrink-0" aria-hidden="true" />,
    },
  ];

  return (
    <aside
      aria-label="Admin Navigation"
      className={`shrink-0 transition-all duration-200 ${
        isCollapsed ? 'w-full lg:w-16' : 'w-full lg:w-64'
      }`}
    >
      <div className="sticky top-20 overflow-hidden rounded-xl border border-indigo-200/80 bg-white shadow-xs dark:border-indigo-950 dark:bg-slate-900">
        <div
          className={`flex items-center border-b border-indigo-100 bg-indigo-50/70 px-3.5 py-3 dark:border-indigo-950 dark:bg-indigo-950/40 ${
            isCollapsed ? 'justify-center' : 'justify-between'
          }`}
        >
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-600 text-white">
                <Lock className="h-3.5 w-3.5" aria-hidden="true" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-950 dark:text-indigo-200">
                Admin Console
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={handleToggle}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Minimize sidebar'}
            title={isCollapsed ? 'Expand sidebar' : 'Minimize sidebar'}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200/80 bg-white text-slate-600 transition hover:bg-slate-100 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
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
                  className={`flex w-full items-center text-left transition ${
                    isCollapsed
                      ? 'justify-center p-2'
                      : 'justify-between gap-3 px-3 py-2.5'
                  } ${
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
                    {!isCollapsed && (
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
                    )}
                  </div>
                  {!isCollapsed && item.badge && (
                    <div className="shrink-0">{item.badge}</div>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </aside>
  );
}
