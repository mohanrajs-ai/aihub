/**
 * User Portal Top Navigation Header.
 * Displays brand logo, portal title, inline GCP project pill, theme toggle,
 * and user profile dropdown with Sign Out.
 */

import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Cloud,
  FolderGit2,
  LogOut,
  Moon,
  Sun,
  User,
} from 'lucide-react';
import { DEFAULT_BRANDING } from '../config/branding';
import { useTheme } from '../context/ThemeContext';
import { UserContext } from '../types/catalog';

export interface HeaderProps {
  user: UserContext | null;
  activeDevRole?: string;
  onDevRoleChange?: (newRole: string) => void;
  onSignOut?: () => void;
  projectId?: string;
  brandName?: string;
  orgName?: string;
  logoUrl?: string;
  logoAlt?: string;
  subtitle?: string;
}

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
    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 via-indigo-600 to-emerald-500 text-white shadow-sm">
      <Cloud className="h-5 w-5" aria-hidden="true" />
    </div>
  );
}

export function Header({
  user,
  onSignOut,
  projectId = 'cymbal-app-514110',
  brandName = DEFAULT_BRANDING.brandName,
  logoUrl = DEFAULT_BRANDING.logoUrl,
  logoAlt = DEFAULT_BRANDING.logoAlt,
}: HeaderProps): React.ReactElement {
  const { theme, toggleTheme } = useTheme();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState<boolean>(false);
  const groupCount = user?.groups?.length ?? 0;

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95">
      <div className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        {/* Left: Brand Logo + Portal Title */}
        <div className="flex items-center gap-3">
          <BrandLogo logoUrl={logoUrl} logoAlt={logoAlt} />
          <h1 className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">
            {brandName}
          </h1>
        </div>

        {/* Right: Inline Project Pill + Theme Toggle + User Profile Dropdown */}
        <div className="flex items-center gap-2.5">
          <div
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200"
            title="Active Google Cloud Project"
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
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            {theme === 'dark' ? (
              <Sun className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
            ) : (
              <Moon className="h-3.5 w-3.5 text-slate-600" aria-hidden="true" />
            )}
          </button>

          {/* User Profile Dropdown (Sign Out only) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsUserMenuOpen((prev) => !prev)}
              aria-expanded={isUserMenuOpen}
              aria-label="Toggle user profile menu"
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 shadow-2xs transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                <User className="h-3 w-3" aria-hidden="true" />
              </div>
              <span className="font-mono text-[11px] font-semibold">
                {user?.email || 'Guest User'}
              </span>
              {isUserMenuOpen ? (
                <ChevronUp className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              )}
            </button>

            {isUserMenuOpen && (
              <div className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                <div className="border-b border-slate-100 pb-2.5 dark:border-slate-700">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Signed in as
                  </p>
                  <p className="truncate font-mono text-[11px] text-slate-600 dark:text-slate-400">
                    {user?.email}
                  </p>
                  <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                    Cloud Identity Groups: {groupCount}
                  </p>
                  {user?.license_type && (
                    <p className="mt-1 font-mono text-[10px] font-semibold uppercase text-indigo-600 dark:text-indigo-400">
                      License: Gemini Enterprise {user.license_type}
                    </p>
                  )}
                </div>

                {onSignOut && (
                  <div className="mt-2 pt-1">
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
