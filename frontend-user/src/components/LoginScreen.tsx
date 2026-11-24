/**
 * Sign-In gate component for the Standalone User Portal.
 * Prompts exclusively for the user's email address and redirects to the
 * Google Cloud Identity / Microsoft 365 SSO login page without listing accounts.
 */

import React, { useState } from 'react';
import {
  Cloud,
  ExternalLink,
  KeyRound,
} from 'lucide-react';
import { DEFAULT_BRANDING } from '../config/branding';

export interface LoginScreenProps {
  loading: boolean;
  error: string | null;
  onLoginEmail: (email: string) => void;
  onLoginSsoPopup?: () => void;
  brandName?: string;
  orgName?: string;
  logoUrl?: string;
  logoAlt?: string;
  projectId?: string;
}

/**
 * Renders the dedicated Sign-In experience before entering the GE AI Hub User Portal.
 */
export function LoginScreen({
  loading,
  error,
  onLoginEmail,
  onLoginSsoPopup,
  brandName = DEFAULT_BRANDING.brandName,
  logoUrl = DEFAULT_BRANDING.logoUrl,
  logoAlt = DEFAULT_BRANDING.logoAlt,
  projectId = 'cymbal-app-514110',
}: LoginScreenProps): React.ReactElement {
  const [emailInput, setEmailInput] = useState<string>('');

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    const trimmed = emailInput.trim().toLowerCase();
    if (trimmed) {
      onLoginEmail(trimmed);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12 dark:bg-slate-950">
      <div className="w-full max-w-md rounded-2xl border border-slate-200/90 bg-white p-8 shadow-lg dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col items-center text-center">
          {logoUrl ? (
            <div className="flex h-12 items-center rounded-xl border border-slate-200/80 bg-white px-3 py-1.5 shadow-sm dark:border-slate-700">
              <img
                src={logoUrl}
                alt={logoAlt}
                className="h-8 w-auto object-contain"
              />
            </div>
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-emerald-500 text-white shadow-sm">
              <Cloud className="h-6 w-6" aria-hidden="true" />
            </div>
          )}
          <span className="mt-3 rounded-full bg-red-50 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-red-700 dark:bg-red-950/70 dark:text-red-300">
            {projectId}
          </span>
          <h1 className="mt-2 text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Sign in to {brandName}
          </h1>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Enter your Tech-M email address to continue to Google Sign-In.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-300"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6">
          <label
            htmlFor="workspace-email-input"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            Work Email Address
          </label>
          <div className="mt-2 flex flex-col gap-3">
            <input
              id="workspace-email-input"
              type="email"
              required
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="name@company.com"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            <button
              type="submit"
              disabled={loading || !emailInput.trim()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
            >
              <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Continue to Google Sign-In</span>
            </button>
          </div>
          {onLoginSsoPopup && (
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                const trimmed = emailInput.trim().toLowerCase();
                if (trimmed) {
                  onLoginEmail(trimmed);
                } else {
                  onLoginSsoPopup();
                }
              }}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-blue-500 hover:text-blue-600 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-blue-400"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Sign in with Google Cloud Identity & Microsoft 365 SSO</span>
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
