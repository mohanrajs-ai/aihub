/**
 * Google Cloud Console left navigation sidebar with header, minimize/expand
 * rail toggle, and navigation for Apps, Skills, Agents, Connectors/MCP,
 * and Admin Governance sections.
 */

import React, { useState } from 'react';
import {
  Bot,
  Clock,
  Cpu,
  Globe,
  LayoutGrid,
  PanelLeftClose,
  PanelLeftOpen,
  PlugZap,
  Server,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { PortalSection } from '../types/catalog';

export interface SidebarProps {
  activeSection: PortalSection;
  onSelectSection: (section: PortalSection) => void;
  appsCount: number;
  skillsCount: number;
  pendingSkillsCount: number;
  approvedSkillsCount?: number;
  agentsCount?: number;
  mcpCount?: number;
  isAdmin?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

/**
 * Renders the minimizable Google Cloud Console navigation rail with Apps, Skills,
 * Agents, and Connectors/MCP.
 */
export function Sidebar({
  activeSection,
  onSelectSection,
  appsCount,
  skillsCount,
  pendingSkillsCount,
  approvedSkillsCount,
  agentsCount = 1,
  mcpCount = 7,
  isAdmin = false,
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

  const publishedCount = approvedSkillsCount ?? skillsCount;
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
      count: publishedCount,
      badge: (
        <div className="flex items-center gap-1.5">
          {!isAdmin && pendingSkillsCount > 0 && (
            <span
              title={`${pendingSkillsCount} skill(s) pending admin review`}
              className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-950/80 dark:text-amber-300"
            >
              <Clock className="h-3 w-3" aria-hidden="true" />
              {pendingSkillsCount}
            </span>
          )}
          <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {publishedCount}
          </span>
        </div>
      ),
    },
    {
      id: 'agents',
      label: 'Agent Registry',
      description: 'ADK & A2A Agent Registry',
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
        {/* Side Panel Header with Minimize / Expand Button */}
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
                  title={`${item.label} (${item.count}) — ${item.description}`}
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
                      {isCollapsed && (
                        <span className=" -top-1 -right-1 absolute rounded-full bg-slate-900 px-1 text-[9px] font-bold text-white dark:bg-blue-500">
                          {item.count}
                        </span>
                      )}
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

          {isAdmin && (
            <div className="mt-3 border-t border-slate-200/80 pt-3 dark:border-slate-800">
              {!isCollapsed && (
                <div className="mb-1.5 px-2.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    Admin & Governance
                  </p>
                </div>
              )}
              <button
                type="button"
                onClick={() => onSelectSection('skill-governance')}
                aria-current={
                  activeSection === 'skill-governance' ? 'page' : undefined
                }
                aria-label="Skill Governance"
                title="Skill Governance — 6-Stage Eval & InfoSec"
                className={`flex w-full items-center rounded-lg text-left transition ${
                  isCollapsed
                    ? 'justify-center p-2'
                    : 'justify-between gap-3 px-3 py-2.5'
                } ${
                  activeSection === 'skill-governance'
                    ? 'border-l-4 border-indigo-600 bg-indigo-50/90 font-semibold text-indigo-700 dark:border-indigo-400 dark:bg-indigo-950/60 dark:text-indigo-300'
                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800/70'
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      activeSection === 'skill-governance'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300'
                    }`}
                  >
                    <ShieldCheck
                      className="h-4 w-4 shrink-0"
                      aria-hidden="true"
                    />
                  </div>
                  {!isCollapsed && (
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        Skill Governance
                      </p>
                      <p
                        className={`truncate text-[11px] ${
                          activeSection === 'skill-governance'
                            ? 'text-indigo-600/90 dark:text-indigo-300/80'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        6-Stage Eval & InfoSec
                      </p>
                    </div>
                  )}
                </div>
                {!isCollapsed && (
                  <div className="flex shrink-0 items-center gap-1">
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
                )}
              </button>

              <button
                type="button"
                onClick={() => onSelectSection('provisioning')}
                aria-current={
                  activeSection === 'provisioning' ? 'page' : undefined
                }
                aria-label="Infra Provisioning"
                title="Infra Provisioning — Terraform App, WIF & M365"
                className={`mt-1 flex w-full items-center rounded-lg text-left transition ${
                  isCollapsed
                    ? 'justify-center p-2'
                    : 'justify-between gap-3 px-3 py-2.5'
                } ${
                  activeSection === 'provisioning'
                    ? 'border-l-4 border-indigo-600 bg-indigo-50/90 font-semibold text-indigo-700 dark:border-indigo-400 dark:bg-indigo-950/60 dark:text-indigo-300'
                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800/70'
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      activeSection === 'provisioning'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300'
                    }`}
                  >
                    <Server className="h-4 w-4 shrink-0" aria-hidden="true" />
                  </div>
                  {!isCollapsed && (
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        Infra Provisioning
                      </p>
                      <p
                        className={`truncate text-[11px] ${
                          activeSection === 'provisioning'
                            ? 'text-indigo-600/90 dark:text-indigo-300/80'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        Terraform App, WIF & M365
                      </p>
                    </div>
                  )}
                </div>
                {!isCollapsed && (
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300">
                    IaC
                  </span>
                )}
              </button>
            </div>
          )}

          {/* GCP Environment Telemetry Footer */}
          {!isCollapsed && (
            <div className="mt-3 rounded-lg border border-slate-200/80 bg-slate-50 p-2.5 text-[11px] text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
              <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                <Cpu className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <span>GCP Project Environment</span>
              </div>
              <div className="mt-1.5 space-y-1 font-mono text-[10px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Project ID:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    cymbal-app-514110
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Project #:</span>
                  <span>457338748091</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Identity:</span>
                  <span className="inline-flex items-center gap-1">
                    <Globe className="h-2.5 w-2.5 text-emerald-500" />
                    altostrat.com
                  </span>
                </div>
              </div>
            </div>
          )}

          {!isCollapsed && pendingSkillsCount > 0 && (
            <div className="mt-3 rounded-lg border border-amber-200/80 bg-amber-50/80 p-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
              <div className="flex items-center gap-1.5 font-semibold">
                <Clock className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>Pending Skill Share Requests</span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-amber-800/90 dark:text-amber-300/90">
                {pendingSkillsCount} user-created skill
                {pendingSkillsCount === 1 ? ' is' : 's are'} awaiting Gemini
                Enterprise Admin Approval.
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
