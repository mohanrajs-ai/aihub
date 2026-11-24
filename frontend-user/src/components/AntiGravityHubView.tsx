/**
 * AntiGravity Hub View Component (`frontend-user`).
 * Displayed exclusively when the authenticated user holds a Gemini Enterprise
 * 'standard' or 'plus' license. Provides a comprehensive guide on installing,
 * authenticating, and using Google Antigravity on VS Code.
 */

import React, { useState } from 'react';
import {
  Check,
  Code2,
  Command,
  Copy,
  Cpu,
  KeyRound,
  Rocket,
  Sparkles,
  Terminal,
  Wand2,
} from 'lucide-react';
import { UserContext } from '../types/catalog';

export interface AntiGravityHubViewProps {
  user: UserContext | null;
}

export function AntiGravityHubView({
  user,
}: AntiGravityHubViewProps): React.ReactElement {
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const licenseTier = (user?.license_type || 'standard').toUpperCase();

  function handleCopy(text: string): void {
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(text);
    }
    setCopiedCmd(text);
    window.setTimeout(() => setCopiedCmd(null), 1500);
  }

  const setupSteps = [
    {
      step: 'Step 1',
      title: 'Install Google Antigravity Extension in VS Code',
      description:
        'Open VS Code Extensions (⇧⌘X / Ctrl+Shift+X), search for "Google Antigravity", or run the CLI command below to install the extension.',
      command: 'code --install-extension google.antigravity',
    },
    {
      step: 'Step 2',
      title: 'Sign In with Your Tech-M Google Cloud Identity Account',
      description: `Open the VS Code Command Palette (⇧⌘P / Ctrl+Shift+P), run "Antigravity: Sign In with Google", and authenticate using ${
        user?.email || 'your licensed Tech-M account'
      } (${licenseTier} license).`,
      command: 'agy auth login --project cymbal-app-514110',
    },
    {
      step: 'Step 3',
      title: 'Enable Workspace Customizations (.agents / .gemini)',
      description:
        'Antigravity automatically discovers project-scoped skills, rules, and MCP servers in your repository (.agents/skills/ and .gemini/rules/).',
      command: 'agy --workspace .',
    },
  ];

  const slashCommands = [
    {
      command: '/plan',
      purpose: 'Generate and review a step-by-step implementation plan before writing code.',
    },
    {
      command: '/goal',
      purpose: 'Run an autonomous multi-step engineering task until all tests and checks pass.',
    },
    {
      command: '/boost',
      purpose: 'Activate deep architectural reasoning, multi-perspective design, and verification.',
    },
    {
      command: '/learn',
      purpose: 'Persist project-specific conventions or setup workflows as reusable workspace skills.',
    },
    {
      command: '/compact',
      purpose: 'Summarize and compact long conversation histories to free up context window.',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header & License Entitlement Banner */}
      <div className="rounded-2xl border border-indigo-200/90 bg-gradient-to-r from-indigo-50/90 via-blue-50/70 to-emerald-50/70 p-6 shadow-2xs dark:border-indigo-900/60 dark:from-indigo-950/50 dark:via-slate-900 dark:to-emerald-950/30">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
              <Rocket className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  AntiGravity Hub
                </h2>
                <span className="rounded-full bg-indigo-600 px-2.5 py-0.5 font-mono text-xs font-bold uppercase text-white">
                  {licenseTier} LICENSE ACTIVE
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                How to install, configure, and use{' '}
                <strong>Google Antigravity on VS Code</strong> with your Gemini
                Enterprise {licenseTier} license.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-indigo-200 bg-white/90 px-4 py-2.5 text-xs dark:border-indigo-900/60 dark:bg-slate-900/90">
            <p className="font-semibold text-slate-500 dark:text-slate-400">
              Licensed Developer Account
            </p>
            <p className="mt-0.5 font-mono font-bold text-indigo-700 dark:text-indigo-300">
              {user?.email || 'employee@mohanrajs.demo.altostrat.com'}
            </p>
          </div>
        </div>
      </div>

      {/* Step-by-Step Setup on VS Code */}
      <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Quick Start: Setting Up Antigravity on VS Code
          </h3>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {setupSteps.map((item) => (
            <div
              key={item.step}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40"
            >
              <div>
                <span className="inline-block rounded-md bg-blue-100 px-2 py-0.5 font-mono text-[11px] font-bold uppercase text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  {item.step}
                </span>
                <h4 className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
                  {item.title}
                </h4>
                <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  {item.description}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-900 px-3 py-2 font-mono text-xs text-slate-100 dark:border-slate-700">
                <code className="truncate">{item.command}</code>
                <button
                  type="button"
                  onClick={() => handleCopy(item.command)}
                  aria-label={`Copy command ${item.command}`}
                  className="inline-flex shrink-0 items-center gap-1 rounded bg-slate-800 px-2 py-1 text-[11px] font-medium text-slate-200 hover:bg-slate-700"
                >
                  {copiedCmd === item.command ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-400" aria-hidden="true" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" aria-hidden="true" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3 Core AI Modalities in VS Code */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
              <Wand2 className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                1. Antigravity Tab (Autocomplete)
              </h3>
              <p className="font-mono text-[11px] text-blue-600 dark:text-blue-400">
                Keybinding: Tab / ⌘+→ (Ctrl+→)
              </p>
            </div>
          </div>
          <ul className="mt-3 space-y-2 text-xs text-slate-600 dark:text-slate-300">
            <li>
              • <strong>Supercomplete</strong>: Context-aware multi-line code
              completions and diff predictions at your cursor.
            </li>
            <li>
              • <strong>Tab to Jump & Import</strong>: Press{' '}
              <code className="rounded bg-slate-100 px-1 py-0.5 font-mono dark:bg-slate-800">
                Tab
              </code>{' '}
              to jump to the next edit location and auto-insert missing imports.
            </li>
            <li>
              • Accept word-by-word with{' '}
              <code className="rounded bg-slate-100 px-1 py-0.5 font-mono dark:bg-slate-800">
                ⌘+→
              </code>{' '}
              (macOS) or{' '}
              <code className="rounded bg-slate-100 px-1 py-0.5 font-mono dark:bg-slate-800">
                Ctrl+→
              </code>{' '}
              (Windows/Linux).
            </li>
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              <Command className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                2. Inline Command (Targeted Edit)
              </h3>
              <p className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400">
                Keybinding: ⌘+I / Ctrl+I
              </p>
            </div>
          </div>
          <ul className="mt-3 space-y-2 text-xs text-slate-600 dark:text-slate-300">
            <li>
              • <strong>In-Editor Refactoring</strong>: Highlight any block of
              code and press{' '}
              <code className="rounded bg-slate-100 px-1 py-0.5 font-mono dark:bg-slate-800">
                ⌘+I
              </code>{' '}
              or{' '}
              <code className="rounded bg-slate-100 px-1 py-0.5 font-mono dark:bg-slate-800">
                Ctrl+I
              </code>{' '}
              to refactor, add types, or optimize in place.
            </li>
            <li>
              • <strong>Visual Diff Overlays</strong>: Inspect red/green inline
              diffs directly inside the VS Code editor before accepting changes.
            </li>
            <li>
              • <strong>Inline Code Lenses</strong>: Click{' '}
              <em>Refactor</em>, <em>Write Tests</em>, or <em>Explain Code</em>{' '}
              above functions and classes.
            </li>
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <Cpu className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                3. Sidebar Chat & Agent Mode
              </h3>
              <p className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                Autonomous Multi-Step Agent
              </p>
            </div>
          </div>
          <ul className="mt-3 space-y-2 text-xs text-slate-600 dark:text-slate-300">
            <li>
              • <strong>Collaborative Agent Mode</strong>: Reads/writes files
              across your workspace, runs terminal test suites, and fixes lint
              or compiler errors from the VS Code Problems pane.
            </li>
            <li>
              • <strong>MCP & Enterprise Skills</strong>: Connects to your
              authorized MCP servers and `.agents/skills/` bundles.
            </li>
            <li>
              • <strong>Subagents & Parallel Tasks</strong>: Delegates research
              and test verification in background subagents.
            </li>
          </ul>
        </div>
      </section>

      {/* Slash Commands Reference Table */}
      <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              VS Code Agent Chat & CLI Slash Commands
            </h3>
          </div>
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 font-mono text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <Code2 className="h-3.5 w-3.5" aria-hidden="true" />
            VS Code Sidebar & agy CLI
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs dark:divide-slate-800">
            <thead className="bg-slate-50 font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                <th className="px-6 py-3">Slash Command</th>
                <th className="px-6 py-3">How to Use in VS Code</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {slashCommands.map((item) => (
                <tr
                  key={item.command}
                  className="transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                >
                  <td className="px-6 py-3.5">
                    <span className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 font-mono text-xs font-bold text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/60 dark:text-indigo-300">
                      <Sparkles className="h-3 w-3" aria-hidden="true" />
                      {item.command}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-slate-700 dark:text-slate-300">
                    {item.purpose}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
