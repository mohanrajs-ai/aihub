/**
 * AGY Hub View Component (`frontend-user`).
 * Displayed exclusively when the authenticated user holds a Gemini Enterprise
 * 'standard' or 'plus' license. Provides three selectable quick-start guides:
 * 1. Antigravity on VS Code
 * 2. Antigravity CLI
 * 3. Antigravity App
 */

import React, { useState } from 'react';
import {
  Check,
  Code2,
  Command,
  Copy,
  Cpu,
  KeyRound,
  Layout,
  Rocket,
  Sparkles,
  Terminal,
  Wand2,
} from 'lucide-react';
import { UserContext } from '../types/catalog';

export interface AntiGravityHubViewProps {
  user: UserContext | null;
}

type AgySurfaceTab = 'vscode' | 'cli' | 'app';

export function AntiGravityHubView({
  user,
}: AntiGravityHubViewProps): React.ReactElement {
  const [activeSurface, setActiveSurface] = useState<AgySurfaceTab>('vscode');
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const licenseTier = (user?.license_type || 'standard').toUpperCase();

  function handleCopy(text: string): void {
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(text);
    }
    setCopiedCmd(text);
    window.setTimeout(() => setCopiedCmd(null), 1500);
  }

  const vscodeSetupSteps = [
    {
      stepNumber: '1',
      step: 'Step 1',
      title: 'Install Google Antigravity Extension in VS Code',
      description:
        'Open VS Code, click the Extensions icon in the left Activity Bar (⇧⌘X on macOS / Ctrl+Shift+X on Windows & Linux), search for "Google Antigravity", and click Install.',
    },
    {
      stepNumber: '2',
      step: 'Step 2',
      title: 'Sign In with Your Tech-M Google Cloud Identity Account',
      description: `Open the VS Code Command Palette (⇧⌘P / Ctrl+Shift+P), select "Antigravity: Sign In with Google", and sign in in your browser using ${
        user?.email || 'your licensed Tech-M account'
      } (${licenseTier} license).`,
    },
    {
      stepNumber: '3',
      step: 'Step 3',
      title: 'Select Your Google Cloud Project in VS Code',
      description:
        'Click the Antigravity status item in the bottom VS Code Status Bar (or open the Command Palette -> "Antigravity: Select Cloud Project") and choose cymbal-app-514110.',
    },
    {
      stepNumber: '4',
      step: 'Step 4',
      title: 'Open the Antigravity Sidebar & Start Coding',
      description:
        'Click the Google Antigravity icon in the VS Code Activity Bar to open the Agent Chat panel, or highlight code in any editor tab and press ⌘+I (macOS) / Ctrl+I (Windows & Linux).',
    },
  ];

  const cliSetupSteps = [
    {
      stepNumber: '1',
      step: 'Step 1',
      title: 'Launch Antigravity CLI (agy) in Your Terminal',
      description:
        'Open your terminal inside any project repository and run the agy command to launch the interactive terminal agent interface.',
      command: 'agy',
    },
    {
      stepNumber: '2',
      step: 'Step 2',
      title: 'Authenticate with Your Tech-M Google Cloud Account',
      description: `On first launch, follow the interactive browser sign-in prompt using ${
        user?.email || 'your licensed Tech-M account'
      } (${licenseTier} license).`,
      command: 'agy --help',
    },
    {
      stepNumber: '3',
      step: 'Step 3',
      title: 'Configure CLI Preferences & Project Customizations',
      description:
        'Antigravity CLI loads global settings from ~/.gemini/antigravity-cli/settings.json and automatically discovers workspace skills (.agents/skills/) and rules.',
      command: '/help',
    },
    {
      stepNumber: '4',
      step: 'Step 4',
      title: 'Run Slash Commands or Exit Cleanly',
      description:
        'Type /plan, /goal, or /boost inside the TUI to orchestrate multi-step tasks, and press Ctrl+D twice (or type /exit) when finished.',
      command: '/exit',
    },
  ];

  const appSetupSteps = [
    {
      stepNumber: '1',
      step: 'Step 1',
      title: 'Launch the Antigravity Desktop App (Antigravity 2.0)',
      description:
        'Open the standalone Antigravity desktop application on your workstation to orchestrate and monitor multiple autonomous agents in parallel.',
    },
    {
      stepNumber: '2',
      step: 'Step 2',
      title: 'Sign In & Select Your Workspace in the Left Sidebar',
      description: `Authenticate with ${
        user?.email || 'your licensed Tech-M account'
      } (${licenseTier} license) and select your local repository under "Projects" in the left-hand sidebar.`,
    },
    {
      stepNumber: '3',
      step: 'Step 3',
      title: 'Use the Chat Canvas with @ Mentions, / Commands & Media',
      description:
        'Type @ in the Chat Canvas to attach files, folders, terminal sessions, rules, or MCP tools; type / to trigger workflows; or drag-and-drop screenshots and diagrams directly into chat.',
    },
    {
      stepNumber: '4',
      step: 'Step 4',
      title: 'Monitor Subagents, Artifacts & Scheduled Tasks',
      description:
        'Use the right-hand Auxiliary Pane to inspect live Subagents, Background Tasks, Markdown Artifacts, Files Changed diffs, and Scheduled Tasks (cron/timers).',
    },
  ];

  const slashCommands = [
    {
      command: '/help',
      purpose:
        'Display all available interactive slash commands, keyboard shortcuts, and active agent capabilities.',
    },
    {
      command: '/plan',
      purpose:
        'Generate and review a structured step-by-step implementation plan before executing code changes.',
    },
    {
      command: '/goal',
      purpose:
        'Run an autonomous, thorough multi-step engineering workflow until the goal and all verification checks are complete.',
    },
    {
      command: '/boost',
      purpose:
        'Activate deep architectural thinking, strategic planning, multi-perspective analysis, and rigorous verification.',
    },
    {
      command: '/grill-me',
      purpose:
        'Start an interactive design interview in chat to resolve architecture and requirements decisions before coding.',
    },
    {
      command: '/teamwork',
      purpose:
        'Coordinate a team of autonomous subagents working in parallel across modules and test suites.',
    },
    {
      command: '/schedule',
      purpose:
        'Schedule recurring cron jobs or one-time timers for automated monitoring and background agent tasks.',
    },
    {
      command: '/browser',
      purpose:
        'Use browser automation and inspection to test and verify live web UI flows.',
    },
    {
      command: '/learn',
      purpose:
        'Persist project-specific conventions, fixes, or setup instructions as reusable workspace skills.',
    },
    {
      command: '/compact',
      purpose:
        'Summarize and compact long conversation histories to free up the context window.',
    },
  ];

  const shortcutsBySurface: Record<
    AgySurfaceTab,
    Array<{ command: string; purpose: string }>
  > = {
    vscode: [
      {
        command: '⌘+I / Ctrl+I',
        purpose:
          'Trigger Inline Command in the VS Code editor to refactor, document, or generate code at your cursor.',
      },
      {
        command: 'Tab',
        purpose:
          'Accept Antigravity Tab Supercomplete multi-line code suggestions, Tab-to-Jump, and auto-imports.',
      },
      {
        command: '⌘+→ / Ctrl+→',
        purpose:
          'Accept an inline autocomplete suggestion word-by-word inside the VS Code editor.',
      },
      {
        command: '⇧⌘P / Ctrl+Shift+P',
        purpose:
          'Open the VS Code Command Palette to access all "Antigravity: ..." editor commands and settings.',
      },
    ],
    cli: [
      {
        command: 'agy',
        purpose: 'Start the interactive Antigravity CLI session in your current working directory.',
      },
      {
        command: 'agy --help',
        purpose: 'List all CLI flags, non-interactive options, and subcommands.',
      },
      {
        command: 'Ctrl+D Ctrl+D / /exit',
        purpose: 'Cleanly exit the Antigravity CLI terminal session.',
      },
      {
        command: '~/.gemini/antigravity-cli/settings.json',
        purpose: 'Configuration file for CLI model preferences, permissions, and MCP servers.',
      },
    ],
    app: [
      {
        command: '@file / @folder',
        purpose: 'Attach specific workspace files or directories as grounded context in the Chat Canvas.',
      },
      {
        command: '@mcp / @rule',
        purpose: 'Reference connected Model Context Protocol tools or workspace rules directly in your prompt.',
      },
      {
        command: 'Auxiliary Pane',
        purpose: 'Inspect live Subagents, Background Tasks, Artifacts, Files Changed diffs, and Terminals.',
      },
      {
        command: 'Settings -> Sandbox Mode',
        purpose: 'Configure global or project-level terminal sandboxing, tool auto-execution, and network policies.',
      },
    ],
  };

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
                  AGY Hub
                </h2>
                <span className="rounded-full bg-indigo-600 px-2.5 py-0.5 font-mono text-xs font-bold uppercase text-white">
                  {licenseTier} LICENSE ACTIVE
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Quick-start guides and command references for{' '}
                <strong>Antigravity on VS Code</strong>,{' '}
                <strong>Antigravity CLI</strong>, and{' '}
                <strong>Antigravity App</strong>.
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

        {/* 3 Surface Selector Tabs: 1. Antigravity on VS Code | 2. Antigravity CLI | 3. Antigravity App */}
        <div
          role="tablist"
          aria-label="AGY Hub Quickstart Options"
          className="mt-5 flex flex-wrap gap-2.5 border-t border-indigo-200/60 pt-4 dark:border-indigo-900/50"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeSurface === 'vscode'}
            onClick={() => setActiveSurface('vscode')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeSurface === 'vscode'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <Code2 className="h-4 w-4" aria-hidden="true" />
            <span>Antigravity on VS Code</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeSurface === 'cli'}
            onClick={() => setActiveSurface('cli')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeSurface === 'cli'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <Terminal className="h-4 w-4" aria-hidden="true" />
            <span>Antigravity CLI</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeSurface === 'app'}
            onClick={() => setActiveSurface('app')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeSurface === 'app'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <Layout className="h-4 w-4" aria-hidden="true" />
            <span>Antigravity App</span>
          </button>
        </div>
      </div>

      {/* OPTION 1: Antigravity on VS Code */}
      {activeSurface === 'vscode' && (
        <>
          <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Quick Start: Setting Up Antigravity on VS Code
              </h3>
            </div>

            <div className="mt-5 space-y-3.5">
              {vscodeSetupSteps.map((item) => (
                <div
                  key={item.step}
                  className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 font-mono text-xs font-bold text-white">
                      {item.stepNumber}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded bg-blue-100 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                          {item.step}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {item.title}
                        </h4>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Using Antigravity Inside VS Code
            </h3>
            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                <div className="flex items-center gap-2.5">
                  <Wand2 className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    1. Antigravity Tab (Autocomplete)
                  </h4>
                  <span className="rounded bg-blue-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    Tab / ⌘+→ (Ctrl+→)
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300">
                  Proposes context-aware multi-line completions (Supercomplete),
                  Tab-to-Jump navigation, and automatic missing imports. Press{' '}
                  <code className="font-mono font-semibold">Tab</code> to accept
                  or <code className="font-mono font-semibold">⌘+→ / Ctrl+→</code>{' '}
                  to accept word-by-word.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                <div className="flex items-center gap-2.5">
                  <Command className="h-4 w-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    2. Inline Command (Targeted Edit)
                  </h4>
                  <span className="rounded bg-indigo-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                    ⌘+I / Ctrl+I
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300">
                  Highlight any code block and press{' '}
                  <code className="font-mono font-semibold">⌘+I</code> (or{' '}
                  <code className="font-mono font-semibold">Ctrl+I</code>) to
                  refactor, add docstrings, or generate code with inline
                  red/green Visual Diff Overlays and Code Lenses (
                  <em>Refactor</em>, <em>Write Tests</em>, <em>Explain Code</em>
                  ).
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                <div className="flex items-center gap-2.5">
                  <Cpu className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    3. Sidebar Chat & Agent Mode
                  </h4>
                  <span className="rounded bg-emerald-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    Autonomous Pair Programmer
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300">
                  Open the Antigravity sidebar to plan features, edit multiple
                  files, auto-fix compiler/lint errors from the VS Code Problems
                  pane, and invoke workspace skills and MCP tools.
                </p>
              </div>
            </div>
          </section>
        </>
      )}

      {/* OPTION 2: Antigravity CLI */}
      {activeSurface === 'cli' && (
        <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Quick Start: Antigravity CLI (agy)
            </h3>
          </div>

          <div className="mt-5 space-y-3.5">
            {cliSetupSteps.map((item) => (
              <div
                key={item.step}
                className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40"
              >
                <div className="flex items-start gap-3.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 font-mono text-xs font-bold text-white">
                    {item.stepNumber}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-blue-100 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        {item.step}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {item.title}
                      </h4>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                      {item.description}
                    </p>
                    <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-900 px-3.5 py-2 font-mono text-xs text-slate-100 dark:border-slate-700">
                      <code className="truncate">{item.command}</code>
                      <button
                        type="button"
                        onClick={() => handleCopy(item.command)}
                        aria-label={`Copy command ${item.command}`}
                        className="inline-flex shrink-0 items-center gap-1 rounded bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-200 hover:bg-slate-700"
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
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* OPTION 3: Antigravity App */}
      {activeSurface === 'app' && (
        <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <Layout className="h-5 w-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Quick Start: Antigravity App (Desktop 2.0)
            </h3>
          </div>

          <div className="mt-5 space-y-3.5">
            {appSetupSteps.map((item) => (
              <div
                key={item.step}
                className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40"
              >
                <div className="flex items-start gap-3.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 font-mono text-xs font-bold text-white">
                    {item.stepNumber}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-blue-100 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        {item.step}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {item.title}
                      </h4>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                      {item.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Help Commands, Shortcuts & Slash Commands Reference Below */}
      <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Help Commands, Shortcuts & Slash Commands Reference
            </h3>
          </div>
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 font-mono text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <Code2 className="h-3.5 w-3.5" aria-hidden="true" />
            {activeSurface === 'vscode'
              ? 'Antigravity on VS Code'
              : activeSurface === 'cli'
                ? 'Antigravity CLI'
                : 'Antigravity App'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs dark:divide-slate-800">
            <thead className="bg-slate-50 font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                <th className="px-6 py-3">Slash Command / Shortcut</th>
                <th className="px-6 py-3">Description & Usage</th>
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
              {shortcutsBySurface[activeSurface].map((item) => (
                <tr
                  key={item.command}
                  className="transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                >
                  <td className="px-6 py-3.5">
                    <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-100 px-2.5 py-0.5 font-mono text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
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
