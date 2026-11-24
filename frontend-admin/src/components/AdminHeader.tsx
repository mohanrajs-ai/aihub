/**
 * Admin Console Top Navigation Header.
 * Displays brand logo, Admin Console badge, GCP project selector,
 * theme toggle, and administrator profile menu.
 */

import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Cloud,
  FolderGit2,
  Lock,
  LogOut,
  Moon,
  Sun,
  User,
} from 'lucide-react';
import { DEFAULT_BRANDING } from '../config/branding';
import { useTheme } from '../context/ThemeContext';
import { UserContext } from '../types/catalog';

export interface AdminHeaderProps {
  user: UserContext | null;
  activeDevRole: string;
  onDevRoleChange: (newRole: string) => void;
  onSignOut?: () => void;
  projectId?: string;
  brandName?: string;
  orgName?: string;
  logoUrl?: string;
  logoAlt?: string;
}

const AVAILABLE_ADMIN_ROLES = [
  { value: 'admin', label: 'Platform Administrator (Full Access)' },
  {
    value: 'admin@mohanrajs.demo.altostrat.com',
    label: 'User: admin@ (Cymbal Platform Admin)',
  },
  {
    value: 'mohanraj@mohanrajs.demo.altostrat.com',
    label: 'User: mohanraj@ (Lead Cloud Architect)',
  },
  { value: 'it-admin', label: 'IT Administrator' },
  { value: 'security-reviewer', label: 'InfoSec Security Reviewer' },
  { value: 'platform-lead', label: 'Platform Operations Lead' },
  { value: 'employee', label: 'Demote to Employee (Test Access Guard)' },
];

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
        <img src={logoUrl} alt={logoAlt} className="h-7 w-auto object-contain" />
      </div>
    );
  }
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-600 text-white shadow-sm">
      <Cloud className="h-5 w-5" aria-hidden="true" />
    </div>
  );
}

export function AdminHeader({
  user,
  activeDevRole,
  onDevRoleChange,
  onSignOut,
  projectId = 'cymbal-app-514110',
  brandName = DEFAULT_BRANDING.brandName,
  orgName = DEFAULT_BRANDING.orgName,
  logoUrl = DEFAULT_BRANDING.logoUrl,
  logoAlt = DEFAULT_BRANDING.logoAlt,
}: AdminHeaderProps): React.ReactElement {
  const { theme, toggleTheme } = useTheme();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState<boolean>(false);

  return (
    <header className="sticky top-0 z-30 border-b border-indigo-200/80 bg-white/95 backdrop-blur-md dark:border-indigo-950 dark:bg-slate-900/95">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
        {/* Left: Brand Logo + Admin Console Title */}
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
              <span className="inline-flex items-center gap-1 rounded-md bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                <Lock className="h-2.5 w-2.5" aria-hidden="true" />
                Admin Console
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Enterprise Governance, Infrastructure Provisioning & RBAC Control Plane
            </p>
          </div>
        </div>

        {/* Right: Project Pill + Admin Profile Menu */}
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50/60 px-3 py-1 text-xs font-medium text-indigo-900 shadow-2xs dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-200"
              title="Target Google Cloud Project"
            >
              <FolderGit2
                className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400"
                aria-hidden="true"
              />
              <span className="text-[11px] text-indigo-500 dark:text-indigo-400">
                Project:
              </span>
              <span className="font-mono font-semibold text-slate-900 dark:text-white">
                {projectId}
              </span>
              <span className="rounded bg-indigo-200/80 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                Admin Plane
              </span>
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle color theme"
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              {theme === 'dark' ? (
                <Sun className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
              ) : (
                <Moon className="h-3.5 w-3.5 text-slate-600" aria-hidden="true" />
              )}
            </button>
          </div>

          {/* Admin Profile & Role Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsUserMenuOpen((prev) => !prev)}
              aria-expanded={isUserMenuOpen}
              aria-label="Toggle administrator profile menu"
              className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            >
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                <User className="h-3 w-3" aria-hidden="true" />
              </div>
              <span className="font-mono text-[11px] font-semibold">
                {user?.email || 'Administrator'}
              </span>
              {isUserMenuOpen ? (
                <ChevronUp className="h-3 w-3" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-3 w-3" aria-hidden="true" />
              )}
            </button>

            {isUserMenuOpen && (
              <div className="absolute right-0 z-50 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                <div className="border-b border-slate-100 pb-2.5 dark:border-slate-700">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Administrator Profile
                  </p>
                  <p className="truncate font-mono text-[11px] text-slate-600 dark:text-slate-400">
                    {user?.email}
                  </p>
                  <p className="mt-1 text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                    Roles: {user?.roles?.join(', ') || 'admin'}
                  </p>
                </div>

                <div className="mt-2.5">
                  <label
                    htmlFor="admin-role-select"
                    className="block text-[11px] font-medium text-slate-600 dark:text-slate-300"
                  >
                    Switch Admin Persona:
                  </label>
                  <select
                    id="admin-role-select"
                    value={activeDevRole}
                    onChange={(e) => {
                      onDevRoleChange(e.target.value);
                      setIsUserMenuOpen(false);
                    }}
                    className="mt-1 block w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    {AVAILABLE_ADMIN_ROLES.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </div>

                {onSignOut && (
                  <div className="mt-3 border-t border-slate-100 pt-2.5 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onSignOut();
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                    >
                      <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
