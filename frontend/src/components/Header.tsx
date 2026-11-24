/**
 * Top navigation header displaying parameterized brand logo (Tech Mahindra),
 * GE AI Hub title on the left, and right-aligned GCP project selector pill
 * (cymbal-app-514110) with the logged-in username below it and a user dropdown
 * menu containing the role selection dropdown and Sign Out action.
 */

import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Cloud,
  FolderGit2,
  LogOut,
  Moon,
  ShieldCheck,
  Sun,
  User,
} from 'lucide-react';
import { DEFAULT_BRANDING } from '../config/branding';
import { useTheme } from '../context/ThemeContext';
import { SyncStatusResponse, UserContext } from '../types/catalog';

export interface HeaderProps {
  user: UserContext | null;
  activeDevRole: string;
  onDevRoleChange: (newRole: string) => void;
  onSignOut?: () => void;
  syncStatus?: SyncStatusResponse | null;
  syncing?: boolean;
  onSyncNow?: () => void;
  projectId?: string;
  brandName?: string;
  orgName?: string;
  logoUrl?: string;
  logoAlt?: string;
  subtitle?: string;
  isAdmin?: boolean;
  activeSystem?: 'user' | 'admin';
  onSystemChange?: (system: 'user' | 'admin') => void;
}

const AVAILABLE_DEV_ROLES = [
  { value: 'employee', label: 'Standard Employee (Active User Groups)' },
  {
    value: 'mohanraj@mohanrajs.demo.altostrat.com',
    label: 'User: mohanraj@ (Cymbal Admin & Architect)',
  },
  {
    value: 'pradeepg@mohanrajs.demo.altostrat.com',
    label: 'User: pradeepg@ (Cymbal Service Desk & Finance)',
  },
  {
    value: 'admin@mohanrajs.demo.altostrat.com',
    label: 'User: admin@ (Cymbal Platform Admin)',
  },
  { value: 'engineering', label: 'Engineering' },
  { value: 'data-analyst', label: 'Data & FinOps Analyst' },
  { value: 'security', label: 'Security Operations' },
  { value: 'admin', label: 'Platform Admin (All Apps)' },
];

/**
 * Renders a parameterized brand logo image (defaulting to Tech Mahindra) or fallback icon.
 */
function BrandLogo({
  logoUrl,
  logoAlt,
}: {
  logoUrl?: string;
  logoAlt: string;
}): React.ReactElement {
  if (logoUrl) {
    return (
      <div className="flex h-10 items-center rounded-xl border border-slate-200/80 bg-white px-2.5 py-1 shadow-sm dark:border-slate-700">
        <img
          src={logoUrl}
          alt={logoAlt}
          className="h-7 w-auto object-contain"
        />
      </div>
    );
  }
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 via-indigo-600 to-emerald-500 text-white shadow-sm">
      <Cloud className="h-5 w-5" aria-hidden="true" />
    </div>
  );
}

/**
 * Renders the GE AI Hub top bar with right-aligned project selector and user menu dropdown below it.
 */
export function Header({
  user,
  activeDevRole,
  onDevRoleChange,
  onSignOut,
  projectId = 'cymbal-app-514110',
  brandName = DEFAULT_BRANDING.brandName,
  orgName = DEFAULT_BRANDING.orgName,
  logoUrl = DEFAULT_BRANDING.logoUrl,
  logoAlt = DEFAULT_BRANDING.logoAlt,
  subtitle = DEFAULT_BRANDING.subtitle,
  isAdmin = false,
  activeSystem = 'user',
  onSystemChange,
}: HeaderProps): React.ReactElement {
  const { theme, toggleTheme } = useTheme();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState<boolean>(false);
  const groupCount = user?.groups?.length ?? 0;

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
        {/* Left: Parameterized Brand Logo + GE AI Hub Title */}
        <div className="flex items-center gap-2.5">
          <BrandLogo logoUrl={logoUrl} logoAlt={logoAlt} />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                {orgName}
              </span>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <h1 className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">
                {brandName}
              </h1>
              {activeSystem === 'admin' && (
                <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  Admin Console
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Center/Switch: Portal Switcher for Admin Users */}
        {isAdmin && onSystemChange && (
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 dark:border-slate-700 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => onSystemChange('user')}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                activeSystem === 'user'
                  ? 'bg-white text-blue-600 shadow-xs dark:bg-slate-900 dark:text-blue-400'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              User Portal
            </button>
            <button
              type="button"
              onClick={() => onSystemChange('admin')}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                activeSystem === 'admin'
                  ? 'bg-white text-indigo-600 shadow-xs dark:bg-slate-900 dark:text-indigo-400'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Admin Console
            </button>
          </div>
        )}

        {/* Right: Project Selector Pill on top + Logged-in User Menu Dropdown below it */}
        <div className="flex flex-col items-end gap-1.5">
          {/* Top Right Row: Project Selector Pill + Theme Toggle */}
          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 shadow-2xs dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200"
              title="Active Google Cloud Project (mohanrajs.demo.altostrat.com)"
            >
              <FolderGit2
                className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400"
                aria-hidden="true"
              />
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Project:
              </span>
              <span className="font-mono font-semibold text-slate-900 dark:text-white">
                {projectId}
              </span>
              <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                Cymbal
              </span>
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle color theme"
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              {theme === 'dark' ? (
                <Sun className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
              ) : (
                <Moon
                  className="h-3.5 w-3.5 text-slate-600"
                  aria-hidden="true"
                />
              )}
            </button>
          </div>

          {/* Bottom Right Row: Logged-in Username below Project + User Dropdown (Role Selection & Sign Out) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsUserMenuOpen((prev) => !prev)}
              aria-expanded={isUserMenuOpen}
              aria-label="Toggle user profile and role menu"
              title={
                user
                  ? `Roles: ${user.roles.join(', ')}${
                      groupCount ? ` | Groups: ${user.groups?.join(', ')}` : ''
                    }`
                  : 'User Profile & Role Menu'
              }
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 shadow-2xs transition hover:border-blue-500 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-400 dark:hover:bg-slate-800"
            >
              <User
                className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400"
                aria-hidden="true"
              />
              <span className="font-medium">
                {user ? user.email : activeDevRole}
              </span>
              {groupCount > 0 && (
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-950/70 dark:text-blue-300">
                  {groupCount} {groupCount === 1 ? 'Group' : 'Groups'}
                </span>
              )}
              {isUserMenuOpen ? (
                <ChevronUp
                  className="h-3.5 w-3.5 text-slate-400"
                  aria-hidden="true"
                />
              ) : (
                <ChevronDown
                  className="h-3.5 w-3.5 text-slate-400"
                  aria-hidden="true"
                />
              )}
            </button>

            {/* User Dropdown Panel under Logged-in User */}
            <div
              className={`absolute right-0 top-full z-40 w-80 rounded-xl border border-slate-200 bg-white shadow-xl transition-all duration-150 dark:border-slate-700 dark:bg-slate-900 ${
                isUserMenuOpen
                  ? 'mt-1.5 max-h-96 p-3.5 opacity-100 pointer-events-auto'
                  : 'max-h-0 overflow-hidden border-transparent p-0 opacity-0 pointer-events-none'
              }`}
            >
              {user && (
                <div className="mb-3 border-b border-slate-100 pb-2.5 dark:border-slate-800">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Active Identity ({user.auth_source})
                  </p>
                  <p className="mt-0.5 truncate font-mono text-xs font-semibold text-slate-900 dark:text-white">
                    Roles: {user.roles.join(', ')}
                  </p>
                </div>
              )}

              {/* User Role Selection Dropdown under User */}
              <div className="space-y-1.5">
                <label
                  htmlFor="dev-role-select"
                  className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                >
                  <ShieldCheck
                    className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400"
                    aria-hidden="true"
                  />
                  <span>Preview Role</span>
                </label>
                <select
                  id="dev-role-select"
                  aria-label="Preview Role"
                  value={activeDevRole}
                  onChange={(e) => onDevRoleChange(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {AVAILABLE_DEV_ROLES.map((roleOpt) => (
                    <option
                      key={roleOpt.value}
                      value={roleOpt.value}
                      className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white"
                    >
                      {roleOpt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sign Out inside User Dropdown */}
              {onSignOut && (
                <div className="mt-3 border-t border-slate-100 pt-2.5 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onSignOut();
                    }}
                    aria-label="Sign Out"
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50/70 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/70"
                  >
                    <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
