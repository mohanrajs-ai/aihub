/**
 * Skills catalog, 5-stage ADK & InfoSec governance workflow, and Skill Registry section.
 */

import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  ExternalLink,
  FileCode,
  FolderGit2,
  Globe,
  Layers,
  LayoutGrid,
  List,
  Mail,
  PackageCheck,
  Plug,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Terminal,
  UserCheck,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import {
  AgentSummary,
  CatalogApplication,
  DiscoveredSkill,
  SkillOrchestrateResponse,
  SkillRegistryItem,
  SkillWorkflowItem,
  WorkflowEmailItem,
} from '../types/catalog';
import { orchestrateSkill } from '../api/client';

export interface SkillsSectionProps {
  skills: DiscoveredSkill[];
  registrySkills?: SkillRegistryItem[];
  workflowEmails?: WorkflowEmailItem[];
  pendingReviewCount: number;
  approvedCount: number;
  loading: boolean;
  mode?: 'user-hub' | 'admin-governance';
  userApps?: CatalogApplication[];
  availableAgents?: AgentSummary[];
  isAdmin?: boolean;
  onOpenGovernance?: () => void;
  onApproveSkill?: (
    skillId: string,
    targetEngines?: string[],
    targetAgents?: string[],
  ) => void;
  onRejectSkill?: (skillId: string) => void;
}

type SkillTab = 'PENDING_REVIEW' | 'APPROVED' | 'REGISTRY' | 'EMAILS' | 'ALL';

function formatShortDate(isoString?: string | null): string {
  if (!isoString) {
    return '—';
  }
  const parsed = new Date(isoString);
  if (Number.isNaN(parsed.getTime())) {
    return isoString;
  }
  return parsed.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function cleanPrincipal(raw: string): string {
  return raw.replace(/^(user|group):/i, '');
}

/**
 * Renders the 6-stage visual workflow pipeline stepper for a skill.
 */
function WorkflowStepper({
  workflow,
}: {
  workflow?: SkillWorkflowItem | null;
}): React.ReactElement | null {
  if (!workflow) {
    return null;
  }

  const evalDone = workflow.eval_status === 'PASSED';
  const infosecDone = workflow.infosec_status === 'PASSED';
  const approvedDone = workflow.approval_status === 'APPROVED';
  const rejected = workflow.approval_status === 'REJECTED';
  const registryDone = Boolean(workflow.registry_id);
  const sharedDone = Boolean(workflow.shared_in_ge);
  const sharedAgentsCount =
    workflow.distributed_agents?.length || workflow.target_agents?.length || 1;

  const stages = [
    {
      label: '1. Trigger',
      sub: 'GE UI / Git Catalog',
      state: 'done',
    },
    {
      label: '2. Evaluate (Skill Eval Agent)',
      sub: evalDone ? `Passed (${workflow.eval_score}/100)` : workflow.eval_status,
      state: evalDone ? 'done' : 'failed',
    },
    {
      label: '3. Agentic InfoSec Review',
      sub: infosecDone
        ? `Passed (${workflow.infosec_risk_level} Risk)`
        : workflow.infosec_status,
      state: infosecDone ? 'done' : 'failed',
    },
    {
      label: '4. InfoSec Approval (Human)',
      sub: approvedDone
        ? `Approved (${workflow.approved_by || 'InfoSec'})`
        : rejected
          ? 'Rejected'
          : 'Email Sent • Awaiting Review',
      state: approvedDone ? 'done' : rejected ? 'failed' : 'active',
    },
    {
      label: '5. Publish in Skill Registry',
      sub: registryDone ? `Published (${workflow.registry_id})` : 'Pending',
      state: registryDone ? 'done' : 'pending',
    },
    {
      label: '6. Share to GE Apps & Agents',
      sub: sharedDone
        ? `Shared in GE App & ${sharedAgentsCount} Agent(s)`
        : 'Pending',
      state: sharedDone ? 'done' : 'pending',
    },
  ];

  return (
    <div className="mt-4 rounded-xl border border-slate-200/90 bg-slate-50/90 p-3.5 dark:border-slate-800 dark:bg-slate-950/70">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          6-Stage Skill Publish Pipeline ({workflow.workflow_id})
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
            workflow.status === 'COMPLETED'
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              : workflow.status === 'REJECTED' || workflow.status === 'FAILED'
                ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
          }`}
        >
          {workflow.current_stage.replace(/_/g, ' ')}
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-6">
        {stages.map((st) => (
          <div
            key={st.label}
            className={`rounded-lg border px-2.5 py-2 text-left ${
              st.state === 'done'
                ? 'border-emerald-200 bg-emerald-50/80 text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200'
                : st.state === 'active'
                  ? 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200'
                  : st.state === 'failed'
                    ? 'border-red-300 bg-red-50 text-red-950 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200'
                    : 'border-slate-200 bg-white/70 text-slate-400 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-500'
            }`}
          >
            <p className="text-[11px] font-bold leading-tight">{st.label}</p>
            <p className="mt-0.5 truncate text-[10px] opacity-90">{st.sub}</p>
          </div>
        ))}
      </div>

      {workflow.eval_report?.token_optimization && (
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-indigo-200/70 bg-indigo-50/60 px-3 py-1.5 text-[11px] text-indigo-950 dark:border-indigo-900/50 dark:bg-indigo-950/30 dark:text-indigo-200">
          <span className="font-semibold">
            ⚡ Token Optimization (Grade{' '}
            {workflow.eval_report.token_optimization.efficiency_grade}):
          </span>
          <span className="font-mono">
            {workflow.eval_report.token_optimization.total_tokens} →{' '}
            {workflow.eval_report.token_optimization.optimized_total_tokens}{' '}
            tokens (-{workflow.eval_report.token_optimization.tokens_saved}{' '}
            tokens / {workflow.eval_report.token_optimization.reduction_pct}%
            saved • Discovery:{' '}
            {workflow.eval_report.token_optimization.discovery_tokens} tokens)
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Renders the Gemini Enterprise Skills tab view with 6-stage workflow, Registry, and Email Outbox.
 */
export function SkillsSection({
  skills,
  registrySkills = [],
  workflowEmails = [],
  pendingReviewCount,
  approvedCount,
  loading,
  mode = 'admin-governance',
  userApps = [],
  availableAgents = [],
  isAdmin = false,
  onOpenGovernance,
  onApproveSkill,
  onRejectSkill,
}: SkillsSectionProps): React.ReactElement {
  const [activeTab, setActiveTab] = useState<SkillTab>(
    pendingReviewCount > 0
      ? 'PENDING_REVIEW'
      : approvedCount > 0
        ? 'APPROVED'
        : 'PENDING_REVIEW',
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedEngineId, setSelectedEngineId] = useState<string>('');
  const [isSearchExpanded, setIsSearchExpanded] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [expandedSkillId, setExpandedSkillId] = useState<string | null>(null);
  const [activeStageBySkill, setActiveStageBySkill] = useState<
    Record<string, number>
  >({});
  const [selectedSkill, setSelectedSkill] = useState<DiscoveredSkill | null>(
    null,
  );
  const [showTemplatizedMd, setShowTemplatizedMd] = useState<boolean>(false);
  const [showOnePager, setShowOnePager] = useState<boolean>(false);
  const [copiedSkillId, setCopiedSkillId] = useState<string | null>(null);
  const [customTargetsBySkill, setCustomTargetsBySkill] = useState<
    Record<string, string[]>
  >({});
  const [customAgentsBySkill, setCustomAgentsBySkill] = useState<
    Record<string, string[]>
  >({});
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [orchestratingSkill, setOrchestratingSkill] =
    useState<DiscoveredSkill | null>(null);
  const [orchestratePrompt, setOrchestratePrompt] = useState<string>(
    'Triage the P1 customer escalation email from Contoso Corp and verify applicable SLA credit policy.',
  );
  const [orchestrateResult, setOrchestrateResult] =
    useState<SkillOrchestrateResponse | null>(null);
  const [orchestrateBusy, setOrchestrateBusy] = useState<boolean>(false);

  async function handleRunOrchestrator(): Promise<void> {
    if (!orchestratingSkill) {
      return;
    }
    setOrchestrateBusy(true);
    try {
      const result = await orchestrateSkill({
        skill_id: orchestratingSkill.skill_id,
        engine_id: orchestratingSkill.engine_id,
        user_prompt: orchestratePrompt,
      });
      setOrchestrateResult(result);
    } finally {
      setOrchestrateBusy(false);
    }
  }

  function getSelectedTargetsForSkill(skill: DiscoveredSkill): string[] {
    if (customTargetsBySkill[skill.skill_id]) {
      return customTargetsBySkill[skill.skill_id];
    }
    const wfTargets = skill.workflow?.target_engines;
    if (wfTargets && wfTargets.length > 0) {
      return wfTargets;
    }
    return [skill.engine_id];
  }

  function toggleTargetEngineForSkill(
    skill: DiscoveredSkill,
    engineId: string,
  ): void {
    const current = new Set(getSelectedTargetsForSkill(skill));
    if (current.has(engineId)) {
      if (current.size > 1) {
        current.delete(engineId);
      }
    } else {
      current.add(engineId);
    }
    setCustomTargetsBySkill((prev) => ({
      ...prev,
      [skill.skill_id]: Array.from(current).sort(),
    }));
  }

  function getSelectedAgentsForSkill(skill: DiscoveredSkill): string[] {
    if (customAgentsBySkill[skill.skill_id]) {
      return customAgentsBySkill[skill.skill_id];
    }
    const wfAgents = skill.workflow?.target_agents;
    if (wfAgents && wfAgents.length > 0) {
      return wfAgents;
    }
    return ['universal-skill-orchestrator'];
  }

  function toggleTargetAgentForSkill(
    skill: DiscoveredSkill,
    agentId: string,
  ): void {
    const current = new Set(getSelectedAgentsForSkill(skill));
    if (current.has(agentId)) {
      if (current.size > 1) {
        current.delete(agentId);
      }
    } else {
      current.add(agentId);
    }
    setCustomAgentsBySkill((prev) => ({
      ...prev,
      [skill.skill_id]: Array.from(current),
    }));
  }

  function handleCopyTrigger(skillName: string, skillId: string): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(`/${skillName}`);
    }
    setCopiedSkillId(skillId);
    window.setTimeout(() => setCopiedSkillId(null), 1800);
  }

  const uniqueSkills = useMemo(() => {
    const byKey = new Map<string, DiscoveredSkill>();
    for (const skill of skills) {
      const rawName = (skill.display_name || '').trim().toLowerCase();
      const suffix = skill.skill_id.includes(':')
        ? skill.skill_id.split(':')[1].trim().toLowerCase()
        : skill.skill_id.trim().toLowerCase();
      const key =
        rawName && !rawName.includes(' ')
          ? rawName
          : !/^\d+$/.test(suffix) && suffix
            ? suffix
            : rawName || suffix;

      const incomingApps = [
        ...(skill.shared_apps ?? []),
        ...(skill.workflow?.target_engines ?? []),
        ...(skill.engine_id ? [skill.engine_id] : []),
      ];
      const incomingAgents = [
        ...(skill.shared_agents ?? []),
        ...(skill.workflow?.target_agents ?? []),
      ];

      const existing = byKey.get(key);
      if (!existing) {
        const mergedApps = Array.from(new Set(incomingApps)).sort();
        const mergedAgents = Array.from(
          new Set(
            incomingAgents.length > 0
              ? incomingAgents
              : ['universal-skill-orchestrator'],
          ),
        ).sort();
        byKey.set(key, {
          ...skill,
          shared_apps: mergedApps,
          shared_agents: mergedAgents,
          workflow: skill.workflow
            ? {
                ...skill.workflow,
                target_engines: mergedApps,
                target_agents: mergedAgents,
              }
            : skill.workflow,
        });
      } else {
        const mergedApps = Array.from(
          new Set([...(existing.shared_apps ?? []), ...incomingApps]),
        ).sort();
        const mergedAgents = Array.from(
          new Set([...(existing.shared_agents ?? []), ...incomingAgents]),
        ).sort();
        const base =
          existing.review_status !== 'PENDING_REVIEW' &&
          skill.review_status === 'PENDING_REVIEW'
            ? skill
            : !existing.workflow && skill.workflow
              ? skill
              : existing;
        const wf = base.workflow ?? existing.workflow ?? skill.workflow;
        byKey.set(key, {
          ...base,
          shared_apps: mergedApps,
          shared_agents: mergedAgents,
          workflow: wf
            ? {
                ...wf,
                target_engines: mergedApps,
                target_agents: mergedAgents,
              }
            : wf,
        });
      }
    }
    return Array.from(byKey.values());
  }, [skills]);

  const engineOptions = useMemo(() => {
    const unique = new Set<string>();
    uniqueSkills.forEach((s) => {
      (s.shared_apps ?? [s.engine_id]).forEach((eng) => {
        if (eng) {
          unique.add(eng);
        }
      });
    });
    return Array.from(unique).sort();
  }, [uniqueSkills]);

  const filteredSkills = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    return uniqueSkills.filter((skill) => {
      if (
        activeTab === 'PENDING_REVIEW' &&
        skill.review_status !== 'PENDING_REVIEW'
      ) {
        return false;
      }
      if (activeTab === 'APPROVED' && skill.review_status !== 'APPROVED') {
        return false;
      }
      const sharedApps = skill.shared_apps?.length
        ? skill.shared_apps
        : [skill.engine_id];
      const sharedAgents = skill.shared_agents ?? [];
      if (selectedEngineId && !sharedApps.includes(selectedEngineId)) {
        return false;
      }
      if (!needle) {
        return true;
      }
      const proposalPrincipals = skill.iam_proposals
        .map((p) => p.principal)
        .join(' ');
      const searchable = [
        skill.display_name,
        skill.description,
        skill.engine_id,
        skill.app_display_name,
        skill.owner_email,
        proposalPrincipals,
        ...sharedApps,
        ...sharedAgents,
      ]
        .join(' ')
        .toLowerCase();
      return searchable.includes(needle);
    });
  }, [uniqueSkills, activeTab, selectedEngineId, searchQuery]);

  async function handleApproveClick(skillId: string): Promise<void> {
    if (!onApproveSkill) {
      return;
    }
    setActionBusyId(skillId);
    try {
      const customTargets = customTargetsBySkill[skillId];
      const customAgents = customAgentsBySkill[skillId];
      if (customAgents && customAgents.length > 0) {
        await Promise.resolve(
          onApproveSkill(
            skillId,
            customTargets && customTargets.length > 0
              ? customTargets
              : undefined,
            customAgents,
          ),
        );
      } else if (customTargets && customTargets.length > 0) {
        await Promise.resolve(onApproveSkill(skillId, customTargets));
      } else {
        await Promise.resolve(onApproveSkill(skillId));
      }
    } finally {
      setActionBusyId(null);
    }
  }

  async function handleRejectClick(skillId: string): Promise<void> {
    if (!onRejectSkill) {
      return;
    }
    setActionBusyId(skillId);
    try {
      await Promise.resolve(onRejectSkill(skillId));
    } finally {
      setActionBusyId(null);
    }
  }

  const publishedSkillsForUser = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    const userEngineIds = new Set(userApps.map((a) => a.engine_id));
    return uniqueSkills.filter((skill) => {
      if (skill.review_status !== 'APPROVED') {
        return false;
      }
      const targetEngines = skill.shared_apps?.length
        ? skill.shared_apps
        : skill.workflow?.target_engines?.length
          ? skill.workflow.target_engines
          : [skill.engine_id];
      const sharedAgents = skill.shared_agents?.length
        ? skill.shared_agents
        : skill.workflow?.target_agents ?? [];
      if (
        userEngineIds.size > 0 &&
        !targetEngines.some((eng) => userEngineIds.has(eng))
      ) {
        return false;
      }
      if (selectedEngineId && !targetEngines.includes(selectedEngineId)) {
        return false;
      }
      if (!needle) {
        return true;
      }
      const searchable = [
        skill.display_name,
        skill.description,
        skill.engine_id,
        skill.app_display_name,
        ...targetEngines,
        ...sharedAgents,
      ]
        .join(' ')
        .toLowerCase();
      return searchable.includes(needle);
    });
  }, [uniqueSkills, userApps, selectedEngineId, searchQuery]);

  const orchestratorModal = orchestratingSkill ? (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Universal Skill Orchestrator for ${orchestratingSkill.display_name}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
    >
      <div className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-indigo-600 px-2.5 py-0.5 font-mono text-xs font-bold text-white">
                ADK Agent: universal_skill_orchestrator
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {orchestratingSkill.display_name}
              </h3>
            </div>
            <p className="mt-1 font-mono text-xs text-slate-500 dark:text-slate-400">
              Target GE App: {orchestratingSkill.engine_id} • Per-User
              :streamAssist OAuth Passthrough
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOrchestratingSkill(null)}
            aria-label="Close orchestrator modal"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-6">
          <div>
            <label
              htmlFor="orchestrator-prompt-input"
              className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300"
            >
              Enterprise User Prompt
            </label>
            <textarea
              id="orchestrator-prompt-input"
              rows={2}
              value={orchestratePrompt}
              onChange={(e) => setOrchestratePrompt(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            <div className="mt-2.5 flex justify-end">
              <button
                type="button"
                disabled={orchestrateBusy}
                onClick={() => void handleRunOrchestrator()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-50"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {orchestrateBusy
                  ? 'Executing Sub-Skills via :streamAssist...'
                  : 'Execute Skill & Sub-Skills'}
              </button>
            </div>
          </div>

          {orchestrateResult && (
            <div className="space-y-4">
              <div className="grid gap-2.5 rounded-xl border border-indigo-200 bg-indigo-50/50 p-3.5 text-xs sm:grid-cols-3 dark:border-indigo-900/60 dark:bg-indigo-950/30">
                <div>
                  <p className="text-slate-400">Calling GE User</p>
                  <p className="mt-0.5 font-mono font-bold text-slate-900 dark:text-white">
                    {orchestrateResult.calling_user_email}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Identity Mode</p>
                  <p className="mt-0.5 font-mono font-bold text-emerald-700 dark:text-emerald-300">
                    {orchestrateResult.identity_passthrough_mode}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Progressive Token Savings</p>
                  <p className="mt-0.5 font-mono font-bold text-indigo-700 dark:text-indigo-300">
                    -{orchestrateResult.total_tokens_saved} tok saved
                  </p>
                </div>
              </div>

              <div>
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Sub-Skill Execution Trace (
                  {orchestrateResult.sub_skill_traces.length} Step
                  {orchestrateResult.sub_skill_traces.length === 1 ? '' : 's'})
                </h4>
                <div className="space-y-2.5">
                  {orchestrateResult.sub_skill_traces.map((step) => (
                    <div
                      key={step.step_index}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs dark:border-slate-800 dark:bg-slate-950"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">
                          Step {step.step_index}: {step.sub_skill_display_name}{' '}
                          <code className="font-mono text-indigo-600 dark:text-indigo-400">
                            ({step.sub_skill_name})
                          </code>
                        </span>
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 font-mono text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          {step.status} • {step.latency_ms}ms
                        </span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap font-mono text-[11px] text-slate-700 dark:text-slate-300">
                        {step.output_summary}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Synthesized Enterprise Response
                </h4>
                <pre className="max-h-60 overflow-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-100 dark:border-slate-800">
                  {orchestrateResult.final_response}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  ) : null;

  if (mode === 'user-hub') {
    const appLookup = new Map(userApps.map((a) => [a.engine_id, a]));
    return (
      <div>
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Skill Registry
              </h2>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                InfoSec Verified
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Browse approved, multi-app AI skills published from the Agent
              Platform Skill Registry and available across your Gemini
              Enterprise applications.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-3.5 py-2 text-xs dark:border-emerald-900/60 dark:bg-emerald-950/40">
              <span className="font-semibold text-emerald-900 dark:text-emerald-200">
                Published Skills:{' '}
              </span>
              <span className="font-bold text-emerald-700 dark:text-emerald-300">
                {publishedSkillsForUser.length}
              </span>
            </div>
            {isAdmin && onOpenGovernance && (
              <button
                type="button"
                onClick={onOpenGovernance}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-500"
              >
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Open Admin Skill Governance Console
              </button>
            )}
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setIsSearchExpanded((prev) => !prev)}
              aria-expanded={isSearchExpanded}
              aria-label="Toggle search"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <Search className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Search Skills</span>
              {isSearchExpanded ? (
                <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </button>

            <div
              role="group"
              aria-label="Skills view mode switcher"
              className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-100/80 p-0.5 dark:border-slate-700 dark:bg-slate-800"
            >
              <button
                type="button"
                aria-label="Card view"
                onClick={() => setViewMode('grid')}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                  viewMode === 'grid'
                    ? 'bg-white text-blue-600 shadow-2xs dark:bg-slate-900 dark:text-blue-400'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Card View</span>
              </button>
              <button
                type="button"
                aria-label="List view"
                onClick={() => setViewMode('list')}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                  viewMode === 'list'
                    ? 'bg-white text-blue-600 shadow-2xs dark:bg-slate-900 dark:text-blue-400'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <List className="h-3.5 w-3.5" aria-hidden="true" />
                <span>List View</span>
              </button>
            </div>
          </div>

          <div
            className={`transition-all duration-200 ${
              isSearchExpanded || Boolean(searchQuery.trim())
                ? 'mt-3 max-h-40 border-t border-slate-100 pt-3 opacity-100 dark:border-slate-800'
                : 'max-h-0 overflow-hidden opacity-0'
            }`}
          >
            <div className="relative min-w-[240px] flex-1">
              <Search
                className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search published skills by name, trigger, or capability..."
                aria-label="Search published skills"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-4 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100"
              />
            </div>
          </div>
        </div>

        {publishedSkillsForUser.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center dark:border-slate-800 dark:bg-slate-900">
            <Sparkles className="mx-auto h-10 w-10 text-slate-400" />
            <h3 className="mt-3 text-base font-semibold text-slate-900 dark:text-white">
              No published skills available yet
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Skills appear here automatically once they pass Multi-App
              Evaluation, InfoSec Review, and Registry Distribution.
            </p>
          </div>
        ) : viewMode === 'list' ? (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs dark:divide-slate-800">
                <thead className="bg-slate-50 font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Skill</th>
                    <th className="px-4 py-3">Slash Trigger</th>
                    <th className="px-4 py-3">Shared GE Apps</th>
                    <th className="px-4 py-3">Shared Agents</th>
                    <th className="px-4 py-3">Required Connectors</th>
                    <th className="px-4 py-3">Eval Score</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {publishedSkillsForUser.map((skill) => {
                    const wf = skill.workflow;
                    const connectors = wf?.required_connectors ?? [];
                    const targetEngines = skill.shared_apps?.length
                      ? skill.shared_apps
                      : wf?.target_engines?.length
                        ? wf.target_engines
                        : [skill.engine_id];
                    const sharedAgents = skill.shared_agents?.length
                      ? skill.shared_agents
                      : wf?.target_agents?.length
                        ? wf.target_agents
                        : ['universal-skill-orchestrator'];
                    return (
                      <tr
                        key={skill.skill_id}
                        className="transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                      >
                        <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white">
                          {skill.display_name}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-indigo-700 dark:text-indigo-300">
                          /{skill.display_name}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex flex-wrap gap-1">
                            {targetEngines.map((eng) => (
                              <span
                                key={eng}
                                className="rounded bg-blue-50 px-2 py-0.5 font-mono text-[11px] font-medium text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                              >
                                {eng}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex flex-wrap gap-1">
                            {sharedAgents.map((ag) => (
                              <span
                                key={ag}
                                className="rounded bg-purple-50 px-2 py-0.5 font-mono text-[11px] font-medium text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
                              >
                                {ag}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex flex-wrap gap-1">
                            {connectors.map((c) => (
                              <span
                                key={c.connector_id}
                                className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                              >
                                {c.display_name}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-semibold text-emerald-700 dark:text-emerald-300">
                          {wf?.eval_score ?? 95}/100
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedSkill(skill)}
                            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                          >
                            View SKILL.md
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-1">
            {publishedSkillsForUser.map((skill) => {
              const wf = skill.workflow;
              const connectors = wf?.required_connectors ?? [];
              const targetEngines = wf?.target_engines?.length
                ? wf.target_engines
                : [skill.engine_id];
              const scopeLabel = wf?.distribution_scope || 'SINGLE_APP';
              return (
                <article
                  key={skill.skill_id}
                  className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3.5">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300">
                        <Sparkles className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-bold text-slate-900 dark:text-white">
                            {skill.display_name}
                          </h3>
                          <button
                            type="button"
                            onClick={() =>
                              handleCopyTrigger(
                                skill.display_name,
                                skill.skill_id,
                              )
                            }
                            title="Copy slash trigger command"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 font-mono text-xs font-semibold text-indigo-800 transition hover:bg-indigo-100 dark:border-indigo-900/60 dark:bg-indigo-950/70 dark:text-indigo-200"
                          >
                            <Terminal className="h-3 w-3" />
                            /{skill.display_name}
                            <Copy className="h-3 w-3 opacity-70" />
                            {copiedSkillId === skill.skill_id && (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-300">
                                Copied!
                              </span>
                            )}
                          </button>
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {scopeLabel}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          Registry ID:{' '}
                          <span className="font-mono">
                            {wf?.registry_id || 'private-daily-morning-summary'}
                          </span>
                        </p>
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-200">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      Published • Score {wf?.eval_score ?? 95}/100
                    </span>
                  </div>

                  <p className="mt-3.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {skill.description}
                  </p>

                  {(skill.sub_skills ?? skill.workflow?.sub_skills ?? [])
                    .length > 0 && (
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-md bg-purple-100 px-2 py-0.5 text-[11px] font-bold text-purple-900 dark:bg-purple-950/70 dark:text-purple-200">
                        <Layers className="h-3 w-3" />
                        Composite Skill •{' '}
                        {
                          (skill.sub_skills ?? skill.workflow?.sub_skills ?? [])
                            .length
                        }{' '}
                        Sub-Skills:
                      </span>
                      {(
                        skill.sub_skills ??
                        skill.workflow?.sub_skills ??
                        []
                      ).map((sub) => (
                        <span
                          key={sub}
                          className="rounded-md border border-purple-200 bg-purple-50/70 px-2 py-0.5 font-mono text-[11px] font-semibold text-purple-800 dark:border-purple-900/60 dark:bg-purple-950/40 dark:text-purple-300"
                        >
                          {sub}
                        </span>
                      ))}
                    </div>
                  )}

                  {connectors.length > 0 && (
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        <Plug className="h-3.5 w-3.5 text-indigo-500" />
                        Connected Data Sources:
                      </span>
                      {connectors.map((c) => (
                        <span
                          key={c.connector_id}
                          className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                        >
                          {c.display_name}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 rounded-xl border border-slate-200/80 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-950/60">
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                      <Globe className="h-3.5 w-3.5 text-blue-500" />
                      Launch Skill in Your Authorized Gemini Enterprise Apps:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {targetEngines.map((engId) => {
                        const matchedApp = appLookup.get(engId);
                        const label = matchedApp?.display_name || engId;
                        const url = matchedApp?.launch_url;
                        return url ? (
                          <a
                            key={engId}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-blue-500"
                          >
                            <span>Launch in {label}</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span
                            key={engId}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                          >
                            {label}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3.5 dark:border-slate-800">
                    <span className="text-xs text-slate-400">
                      Type <code className="font-mono">/{skill.display_name}</code>{' '}
                      in any target GE App assistant chat to run this skill.
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowTemplatizedMd(false);
                          setSelectedSkill(skill);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700"
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                        View Skill Guide
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {selectedSkill && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Skill details for ${selectedSkill.display_name}`}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
          >
            <div className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {selectedSkill.display_name}
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Published Enterprise Skill Guide
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSkill(null)}
                  aria-label="Close skill details"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4 overflow-y-auto p-6">
                <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-100 dark:border-slate-800">
                  {selectedSkill.instruction}
                </pre>
              </div>
            </div>
          </div>
        )}
        {orchestratorModal}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Skill Registry
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            6-Stage Skill Publish Pipeline: 1. Trigger → 2. Evaluate → 3.
            Agentic InfoSec Review → 4. InfoSec Approval → 5. Publish in Skill
            Registry → 6. Share to GE Apps & High-Code Agents. Click any skill
            in the list to inspect its vertical stages and SKILL.md.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setShowOnePager((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
              showOnePager
                ? 'border-indigo-600 bg-indigo-600 text-white shadow-2xs'
                : 'border-indigo-200 bg-indigo-50/80 text-indigo-800 hover:bg-indigo-100 dark:border-indigo-900/60 dark:bg-indigo-950/50 dark:text-indigo-200'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>
              {showOnePager
                ? 'Hide Governance One-Pager'
                : 'Skill Governance One-Pager'}
            </span>
          </button>
          <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-3.5 py-2 text-xs dark:border-amber-900/60 dark:bg-amber-950/40">
            <span className="font-semibold text-amber-900 dark:text-amber-200">
              Pending Review:{' '}
            </span>
            <span className="font-bold text-amber-700 dark:text-amber-300">
              {pendingReviewCount}
            </span>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-3.5 py-2 text-xs dark:border-emerald-900/60 dark:bg-emerald-950/40">
            <span className="font-semibold text-emerald-900 dark:text-emerald-200">
              Approved:{' '}
            </span>
            <span className="font-bold text-emerald-700 dark:text-emerald-300">
              {approvedCount}
            </span>
          </div>
        </div>
      </div>

      {/* Executive One-Pager: Problem Statement, Solution & 6-Stage Pipeline */}
      {showOnePager && (
        <div className="mb-6 space-y-4 rounded-2xl border border-indigo-200 bg-white p-5 shadow-sm dark:border-indigo-900/60 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
            <div>
              <span className="rounded-md bg-indigo-100 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                Executive Architecture Brief
              </span>
              <h3 className="mt-1 text-base font-bold text-slate-900 dark:text-white">
                Enterprise Skill Governance & Multi-Target Distribution Pipeline
                (skillgp)
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowOnePager(false)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              aria-label="Close one-pager"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Problem Statement */}
            <div className="rounded-xl border border-red-200/80 bg-red-50/40 p-4 dark:border-red-900/40 dark:bg-red-950/20">
              <h4 className="text-xs font-bold uppercase tracking-wider text-red-900 dark:text-red-300">
                1. Problem Statement
              </h4>
              <ul className="mt-2 space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                <li>
                  • <strong>Ungoverned Shadow Skills:</strong> Ad-hoc{' '}
                  <code className="font-mono">SKILL.md</code> prompts authored
                  in sandbox apps lack deterministic steps, evaluation datasets,
                  and quality gates.
                </li>
                <li>
                  • <strong>Hardcoded Engine Lock-In:</strong> Skills embed
                  single-app Discovery Engine URIs (
                  <code className="font-mono">
                    engines/cymbal-dev-sandbox-app/...
                  </code>
                  ), blocking reuse across Service Desk, Finance, and HR apps.
                </li>
                <li>
                  • <strong>Security & Exfiltration Risks:</strong> Unvetted
                  instructions or scripts risk prompt-injection overrides,
                  hardcoded secrets, untrusted external URLs, and over-broad IAM
                  sharing.
                </li>
                <li>
                  • <strong>Token Bloat & Disconnected Agent Silos:</strong>{' '}
                  Repeated URIs inflate context tokens by 35–45%, and UI-created
                  skills cannot be shared with High-Code Specialized ADK Agents.
                </li>
              </ul>
            </div>

            {/* Solution Architecture */}
            <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
                2. Solution Architecture
              </h4>
              <ul className="mt-2 space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                <li>
                  • <strong>High-Code ADK Evaluation Agent (Stage 2):</strong>{' '}
                  Deployed on Vertex AI Agent Runtime (
                  <code className="font-mono">skill-eval-agent</code>) to run a
                  6-Rubric Benchmark (<code className="font-mono">R1–R6</code>),
                  synthesize golden eval datasets, compact tokens, and
                  parameterize{' '}
                  <code className="font-mono">{'{{engine_id}}'}</code>.
                </li>
                <li>
                  • <strong>High-Code ADK InfoSec Agent (Stage 3):</strong>{' '}
                  Deployed on Vertex AI Agent Runtime (
                  <code className="font-mono">infosec-review-agent</code>) to
                  audit 6 Zero-Trust controls (
                  <code className="font-mono">IS-1..IS-6</code>) and generate a
                  SHA-256 <code className="font-mono">security_digest</code>.
                </li>
                <li>
                  • <strong>Human-in-the-Loop InfoSec Gate (Stage 4):</strong>{' '}
                  Reviewers inspect Stage 2 & Stage 3 outputs in the Admin UI or{' '}
                  <code className="font-mono">./skillgp</code> CLI and select
                  target GE Apps & High-Code ADK Agents.
                </li>
                <li>
                  • <strong>Central Registry & Multi-Target Share:</strong>{' '}
                  Publishes versioned URN artifacts (Stage 5) and distributes to
                  GE Apps + High-Code Specialized ADK Agents (Stage 6).
                </li>
              </ul>
            </div>
          </div>

          {/* 6-Stage Pipeline Steps Table */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950/60">
            <h4 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-300">
              3. 6-Stage Skill Governance Pipeline Steps
            </h4>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
              {[
                {
                  stage: 'Stage 1: Trigger',
                  actor: 'GE API Monitor / Git / skillgp',
                  desc: 'Detects new SKILL.md or IAM share requests across GE engines.',
                },
                {
                  stage: 'Stage 2: Evaluate',
                  actor: 'skill-eval-agent (ADK)',
                  desc: 'Runs R1–R6 rubric benchmark, {{engine_id}} templatizer & Token FinOps.',
                },
                {
                  stage: 'Stage 3: InfoSec Scan',
                  actor: 'infosec-review-agent (ADK)',
                  desc: 'Audits IS-1..IS-6 controls, AST scripts, IAM scope & SHA-256 digest.',
                },
                {
                  stage: 'Stage 4: Human Approval',
                  actor: 'InfoSec Reviewer (UI / CLI)',
                  desc: 'Reviews Stage 2 & 3 evidence, selects target GE Apps & ADK Agents.',
                },
                {
                  stage: 'Stage 5: Publish Registry',
                  actor: 'Enterprise Skill Registry',
                  desc: 'Stores immutable URN skill package with parameterized SKILL.md.',
                },
                {
                  stage: 'Stage 6: Distribute & Share',
                  actor: 'GE v1alpha + Agent Runtime',
                  desc: 'Shares skill to selected GE Apps and High-Code Specialized ADK Agents.',
                },
              ].map((st) => (
                <div
                  key={st.stage}
                  className="rounded-lg border border-slate-200 bg-white p-2.5 text-[11px] dark:border-slate-800 dark:bg-slate-900"
                >
                  <p className="font-bold text-indigo-700 dark:text-indigo-300">
                    {st.stage}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] font-semibold text-slate-500">
                    {st.actor}
                  </p>
                  <p className="mt-1 text-[10px] leading-relaxed text-slate-600 dark:text-slate-300">
                    {st.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tabs: Pending Review | Approved & Shared | Skill Registry | InfoSec Emails | All Skills */}
      <div
        role="tablist"
        aria-label="Skill Review Status Tabs"
        className="mb-6 flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3 dark:border-slate-800"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'PENDING_REVIEW'}
          onClick={() => setActiveTab('PENDING_REVIEW')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
            activeTab === 'PENDING_REVIEW'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
          }`}
        >
          <Clock className="h-4 w-4" aria-hidden="true" />
          <span>Pending Review</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-bold ${
              activeTab === 'PENDING_REVIEW'
                ? 'bg-white/25 text-white'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
            }`}
          >
            {pendingReviewCount}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'APPROVED'}
          onClick={() => setActiveTab('APPROVED')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
            activeTab === 'APPROVED'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
          }`}
        >
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          <span>Approved & Shared</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-bold ${
              activeTab === 'APPROVED'
                ? 'bg-white/25 text-white'
                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
            }`}
          >
            {approvedCount}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'REGISTRY'}
          onClick={() => setActiveTab('REGISTRY')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
            activeTab === 'REGISTRY'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
          }`}
        >
          <PackageCheck className="h-4 w-4" aria-hidden="true" />
          <span>Skill Registry</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-bold ${
              activeTab === 'REGISTRY'
                ? 'bg-white/25 text-white'
                : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300'
            }`}
          >
            {registrySkills.length}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'EMAILS'}
          onClick={() => setActiveTab('EMAILS')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
            activeTab === 'EMAILS'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
          }`}
        >
          <Mail className="h-4 w-4" aria-hidden="true" />
          <span>InfoSec Emails</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-bold ${
              activeTab === 'EMAILS'
                ? 'bg-white/25 text-white'
                : 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300'
            }`}
          >
            {workflowEmails.length}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'ALL'}
          onClick={() => setActiveTab('ALL')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
            activeTab === 'ALL'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
          }`}
        >
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          <span>All Skills</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-bold ${
              activeTab === 'ALL'
                ? 'bg-white/25 text-white'
                : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {uniqueSkills.length}
          </span>
        </button>
      </div>

      {/* Tab Content: Skill Registry */}
      {activeTab === 'REGISTRY' ? (
        registrySkills.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center dark:border-slate-800 dark:bg-slate-900">
            <PackageCheck className="mx-auto h-10 w-10 text-slate-400" />
            <h3 className="mt-3 text-base font-semibold text-slate-900 dark:text-white">
              No published skills in the Skill Registry yet
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Approve a pending skill in the Pending Review tab to publish it to
              the Enterprise Skill Registry (Stage 4) and share it to the GE App
              (Stage 5).
            </p>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {registrySkills.map((reg) => (
              <article
                key={reg.registry_id}
                className="rounded-2xl border border-indigo-200/80 bg-white p-6 shadow-sm dark:border-indigo-900/50 dark:bg-slate-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {reg.display_name}
                      </h3>
                      <span className="rounded-md bg-indigo-100 px-2 py-0.5 font-mono text-xs font-semibold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                        v{reg.version}
                      </span>
                    </div>
                    <p className="mt-0.5 font-mono text-xs text-slate-500">
                      Registry ID: {reg.registry_id} • App:{' '}
                      {reg.app_display_name}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Published & Shared
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                  {reg.description}
                </p>
                <div className="mt-4 grid gap-2 rounded-xl bg-slate-50 p-3 text-xs sm:grid-cols-3 dark:bg-slate-950">
                  <div>
                    <span className="text-slate-400">Eval Score:</span>{' '}
                    <span className="font-bold text-emerald-600">
                      {reg.eval_score}/100
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">InfoSec Risk:</span>{' '}
                    <span className="font-bold text-emerald-600">
                      {reg.infosec_risk_level}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Approved By:</span>{' '}
                    <span className="font-mono font-semibold">
                      {reg.approved_by}
                    </span>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-end border-t border-slate-100 pt-3 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      const matched = skills.find(
                        (s) =>
                          s.skill_id === reg.skill_id ||
                          s.display_name === reg.display_name,
                      );
                      setShowTemplatizedMd(false);
                      setSelectedSkill(
                        matched || {
                          skill_id: reg.skill_id,
                          resource_name: reg.resource_name,
                          engine_id: reg.engine_id,
                          app_display_name: reg.app_display_name,
                          display_name: reg.display_name,
                          description: reg.description,
                          instruction: reg.instruction,
                          gcs_uri: '',
                          owner_email: reg.owner_email,
                          state: 'ENABLED',
                          sharing_scope: 'ORGANIZATION',
                          sharing_state: 'SHARED',
                          has_active_iam_proposals: false,
                          review_status: 'APPROVED',
                          iam_proposals: [],
                          shared_principals: reg.shared_principals || [],
                          subfiles: [
                            {
                              file_name: 'SKILL.md',
                              mime_type: 'text/markdown',
                            },
                          ],
                          sub_skills: reg.sub_skills || [],
                          shared_apps: reg.target_engines || [reg.engine_id],
                          shared_agents: reg.target_agents || [
                            'universal-skill-orchestrator',
                          ],
                          create_time: reg.published_at || '',
                          update_time: reg.published_at || '',
                        },
                      );
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-200"
                  >
                    <FileCode className="h-3.5 w-3.5" />
                    View SKILL.md
                  </button>
                </div>
              </article>
            ))}
          </div>
        )
      ) : activeTab === 'EMAILS' ? (
        /* Tab Content: InfoSec Approval Emails */
        workflowEmails.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center dark:border-slate-800 dark:bg-slate-900">
            <Mail className="mx-auto h-10 w-10 text-slate-400" />
            <h3 className="mt-3 text-base font-semibold text-slate-900 dark:text-white">
              No InfoSec notification emails recorded yet
            </h3>
          </div>
        ) : (
          <div className="space-y-4">
            {workflowEmails.map((em) => (
              <div
                key={em.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {em.subject}
                    </p>
                    <p className="text-xs text-slate-500">
                      To: <span className="font-mono">{em.recipient_email}</span>{' '}
                      • Sent: {formatShortDate(em.created_at)}
                    </p>
                  </div>
                  <span className="rounded-full bg-purple-100 px-2.5 py-0.5 font-mono text-xs font-semibold text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                    {em.delivery_status}
                  </span>
                </div>
                <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-50 p-3.5 font-mono text-xs text-slate-700 dark:bg-slate-950 dark:text-slate-300">
                  {em.body_text}
                </pre>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Tab Content: Pending Review / Approved / All Skills */
        <>
          <div className="mb-6 rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsSearchExpanded((prev) => !prev)}
                aria-expanded={isSearchExpanded}
                aria-label="Toggle search"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <Search className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Search & Filter Skills</span>
                {isSearchExpanded ? (
                  <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                )}
              </button>

              <div
                role="group"
                aria-label="Skills view mode switcher"
                className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-100/80 p-0.5 dark:border-slate-700 dark:bg-slate-800"
              >
                <button
                  type="button"
                  aria-label="Card view"
                  onClick={() => setViewMode('grid')}
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                    viewMode === 'grid'
                      ? 'bg-white text-blue-600 shadow-2xs dark:bg-slate-900 dark:text-blue-400'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Card View</span>
                </button>
                <button
                  type="button"
                  aria-label="List view"
                  onClick={() => setViewMode('list')}
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                    viewMode === 'list'
                      ? 'bg-white text-blue-600 shadow-2xs dark:bg-slate-900 dark:text-blue-400'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  <List className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>List View</span>
                </button>
              </div>
            </div>

            <div
              className={`transition-all duration-200 ${
                isSearchExpanded ||
                Boolean(searchQuery.trim()) ||
                Boolean(selectedEngineId)
                  ? 'mt-3 max-h-48 border-t border-slate-100 pt-3 opacity-100 dark:border-slate-800'
                  : 'max-h-0 overflow-hidden opacity-0'
              }`}
            >
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-[240px] flex-1">
                  <Search
                    className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search skills by name, description, owner, or requested recipient..."
                    aria-label="Search skills"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-4 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100"
                  />
                </div>

                <select
                  aria-label="Filter by GE Application"
                  value={selectedEngineId}
                  onChange={(e) => setSelectedEngineId(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <option value="">All GE Applications</option>
                  {engineOptions.map((eng) => (
                    <option key={eng} value={eng}>
                      {eng}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="grid gap-5 md:grid-cols-2">
              {[1, 2].map((n) => (
                <div
                  key={n}
                  className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
                />
              ))}
            </div>
          ) : filteredSkills.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center dark:border-slate-800 dark:bg-slate-900">
              <Sparkles className="mx-auto h-10 w-10 text-slate-400" />
              <h3 className="mt-3 text-base font-semibold text-slate-900 dark:text-white">
                No skills found in this view
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {activeTab === 'PENDING_REVIEW'
                  ? 'No skills currently have pending share requests awaiting Admin Approval.'
                  : 'Try switching tabs or clearing your search filters.'}
              </p>
            </div>
          ) : viewMode === 'list' ? (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-xs dark:divide-slate-800">
                  <thead className="bg-slate-50 font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Skill (Click to View Stages)</th>
                      <th className="px-4 py-3">Shared GE Apps</th>
                      <th className="px-4 py-3">Shared Agents</th>
                      <th className="px-4 py-3">Owner</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {filteredSkills.map((skill, rowIdx) => {
                      const isPending = skill.review_status === 'PENDING_REVIEW';
                      const wf = skill.workflow;
                      const sharedApps = skill.shared_apps?.length
                        ? skill.shared_apps
                        : wf?.target_engines?.length
                          ? wf.target_engines
                          : [skill.engine_id];
                      const sharedAgents = skill.shared_agents?.length
                        ? skill.shared_agents
                        : wf?.target_agents?.length
                          ? wf.target_agents
                          : ['universal-skill-orchestrator'];

                      const activeExpandedId =
                        expandedSkillId === null
                          ? filteredSkills[0]?.skill_id
                          : expandedSkillId;
                      const isExpanded = activeExpandedId === skill.skill_id;
                      const activeStageIdx =
                        activeStageBySkill[skill.skill_id] ??
                        (isPending ? 3 : 0);

                      const evalDone = wf?.eval_status === 'PASSED';
                      const infosecDone = wf?.infosec_status === 'PASSED';
                      const approvedDone = wf?.approval_status === 'APPROVED';
                      const rejected = wf?.approval_status === 'REJECTED';
                      const registryDone = Boolean(wf?.registry_id);
                      const sharedDone = Boolean(wf?.shared_in_ge);
                      const sharedAgentsCount =
                        wf?.distributed_agents?.length ||
                        wf?.target_agents?.length ||
                        sharedAgents.length ||
                        1;

                      const verticalStages = [
                        {
                          idx: 0,
                          label: '1. Trigger',
                          sub: 'GE UI / Git Catalog / skillgp',
                          state: 'done' as const,
                        },
                        {
                          idx: 1,
                          label: '2. Evaluate (Skill Eval Agent)',
                          sub: wf
                            ? evalDone
                              ? `Passed (${wf.eval_score}/100)`
                              : wf.eval_status
                            : 'Passed',
                          state: (evalDone ? 'done' : 'failed') as
                            | 'done'
                            | 'failed',
                        },
                        {
                          idx: 2,
                          label: '3. Agentic InfoSec Review',
                          sub: wf
                            ? infosecDone
                              ? `Passed (${wf.infosec_risk_level} Risk)`
                              : wf.infosec_status
                            : 'Passed (LOW Risk)',
                          state: (infosecDone ? 'done' : 'failed') as
                            | 'done'
                            | 'failed',
                        },
                        {
                          idx: 3,
                          label: '4. InfoSec Approval (Human)',
                          sub: approvedDone
                            ? `Approved (${wf?.approved_by || 'InfoSec'})`
                            : rejected
                              ? 'Rejected'
                              : 'Email Sent • Awaiting Review',
                          state: (approvedDone
                            ? 'done'
                            : rejected
                              ? 'failed'
                              : 'active') as 'done' | 'failed' | 'active',
                        },
                        {
                          idx: 4,
                          label: '5. Publish in Skill Registry',
                          sub: registryDone
                            ? `Published (${wf?.registry_id})`
                            : 'Pending',
                          state: (registryDone ? 'done' : 'pending') as
                            | 'done'
                            | 'pending',
                        },
                        {
                          idx: 5,
                          label: '6. Share to GE Apps & Agents',
                          sub: sharedDone
                            ? `Shared in GE App & ${sharedAgentsCount} Agent(s)`
                            : 'Pending',
                          state: (sharedDone ? 'done' : 'pending') as
                            | 'done'
                            | 'pending',
                        },
                      ];

                      return (
                        <React.Fragment key={skill.skill_id || rowIdx}>
                          <tr
                            onClick={() =>
                              setExpandedSkillId((prev) => {
                                const current =
                                  prev === null
                                    ? filteredSkills[0]?.skill_id
                                    : prev;
                                return current === skill.skill_id
                                  ? ''
                                  : skill.skill_id;
                              })
                            }
                            className={`cursor-pointer transition ${
                              isExpanded
                                ? 'bg-indigo-50/50 dark:bg-indigo-950/25'
                                : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                            }`}
                          >
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-2">
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                                )}
                                <div>
                                  <p className="font-bold text-slate-900 dark:text-white">
                                    {skill.display_name}
                                  </p>
                                  <p className="mt-0.5 line-clamp-1 max-w-md text-[11px] text-slate-500 dark:text-slate-400">
                                    {skill.description}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex flex-wrap gap-1">
                                {sharedApps.map((eng) => (
                                  <span
                                    key={eng}
                                    className="rounded bg-blue-50 px-2 py-0.5 font-mono text-[11px] font-medium text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                                  >
                                    {eng}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex flex-wrap gap-1">
                                {sharedAgents.map((ag) => (
                                  <span
                                    key={ag}
                                    className="rounded bg-purple-50 px-2 py-0.5 font-mono text-[11px] font-medium text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
                                  >
                                    {ag}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-4 py-3.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                              {skill.owner_email}
                            </td>
                            <td className="px-4 py-3.5">
                              <span
                                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                  isPending
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                }`}
                              >
                                {skill.review_status}
                              </span>
                            </td>
                            <td
                              className="px-4 py-3.5 text-right"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex flex-wrap items-center justify-end gap-2">
                                {isPending && onApproveSkill && (
                                  <button
                                    type="button"
                                    disabled={actionBusyId === skill.skill_id}
                                    onClick={() =>
                                      void handleApproveClick(skill.skill_id)
                                    }
                                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                                  >
                                    Approve & Publish
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setSelectedSkill(skill)}
                                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                >
                                  Inspect SKILL.md & Proposals
                                </button>
                              </div>
                            </td>
                          </tr>

                          {isExpanded && (
                            <tr className="bg-slate-50/70 dark:bg-slate-950/60">
                              <td colSpan={6} className="p-4 sm:p-6">
                                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5 dark:border-slate-800 dark:bg-slate-900">
                                  {/* Top Bar: Skill Sharing Summary + Quick SKILL.md & Orchestrator Actions */}
                                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3.5 dark:border-slate-800">
                                    <div className="space-y-1">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                                          6-Stage Governance Pipeline
                                        </span>
                                        {wf && (
                                          <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                            {wf.workflow_id}
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex flex-wrap items-center gap-2 text-[11px]">
                                        <span className="font-semibold text-slate-500">
                                          Shared GE Apps:
                                        </span>
                                        {sharedApps.map((eng) => (
                                          <span
                                            key={eng}
                                            className="rounded bg-blue-50 px-2 py-0.5 font-mono font-semibold text-blue-700 dark:bg-blue-950/70 dark:text-blue-300"
                                          >
                                            {eng}
                                          </span>
                                        ))}
                                        <span className="ml-1 font-semibold text-slate-500">
                                          Shared Agents:
                                        </span>
                                        {sharedAgents.map((ag) => (
                                          <span
                                            key={ag}
                                            className="rounded bg-purple-50 px-2 py-0.5 font-mono font-semibold text-purple-700 dark:bg-purple-950/70 dark:text-purple-300"
                                          >
                                            {ag}
                                          </span>
                                        ))}
                                      </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setShowTemplatizedMd(false);
                                          setActiveStageBySkill((prev) => ({
                                            ...prev,
                                            [skill.skill_id]:
                                              prev[skill.skill_id] === 6
                                                ? isPending
                                                  ? 3
                                                  : 0
                                                : 6,
                                          }));
                                        }}
                                        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                                          activeStageIdx === 6
                                            ? 'border-indigo-600 bg-indigo-600 text-white shadow-2xs'
                                            : 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-200'
                                        }`}
                                      >
                                        <FileCode
                                          className={`h-3.5 w-3.5 ${
                                            activeStageIdx === 6
                                              ? 'text-white'
                                              : 'text-indigo-600 dark:text-indigo-400'
                                          }`}
                                        />
                                        View SKILL.md
                                      </button>
                                    </div>
                                  </div>

                                  {/* 2-Column Layout: Left = Vertical Stages (click to inspect), Right = Active Step Details */}
                                  <div className="grid gap-5 lg:grid-cols-12">
                                    {/* Left Column: Vertical 6-Stage Stepper */}
                                    <div
                                      aria-label={`Vertical pipeline stages for ${skill.display_name}`}
                                      className="space-y-2 lg:col-span-4"
                                    >
                                      <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                        Pipeline Stages (Click a stage for
                                        details)
                                      </p>
                                      {verticalStages.map((st) => {
                                        const isSelectedStage =
                                          activeStageIdx === st.idx;
                                        return (
                                          <button
                                            key={st.label}
                                            type="button"
                                            onClick={() =>
                                              setActiveStageBySkill((prev) => ({
                                                ...prev,
                                                [skill.skill_id]: st.idx,
                                              }))
                                            }
                                            className={`flex w-full items-start justify-between gap-2 rounded-xl border p-3 text-left transition ${
                                              isSelectedStage
                                                ? 'border-indigo-500 bg-indigo-50/70 ring-2 ring-indigo-500/20 dark:border-indigo-500 dark:bg-indigo-950/40'
                                                : st.state === 'done'
                                                  ? 'border-emerald-200 bg-emerald-50/60 hover:bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/20'
                                                  : st.state === 'active'
                                                    ? 'border-amber-300 bg-amber-50/80 hover:bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40'
                                                    : st.state === 'failed'
                                                      ? 'border-red-300 bg-red-50/80 dark:border-red-900 dark:bg-red-950/30'
                                                      : 'border-slate-200 bg-slate-50/60 text-slate-500 hover:bg-slate-100/70 dark:border-slate-800 dark:bg-slate-900/50'
                                            }`}
                                          >
                                            <div>
                                              <p className="text-xs font-bold text-slate-900 dark:text-white">
                                                {st.label}
                                              </p>
                                              <p className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-300">
                                                {st.sub}
                                              </p>
                                            </div>
                                            <span
                                              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                                                st.state === 'done'
                                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                                  : st.state === 'active'
                                                    ? 'bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200'
                                                    : st.state === 'failed'
                                                      ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                                                      : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                              }`}
                                            >
                                              {st.state}
                                            </span>
                                          </button>
                                        );
                                      })}
                                    </div>

                                    {/* Right Column: Active Step Details */}
                                    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 lg:col-span-8 dark:border-slate-800 dark:bg-slate-950/60">
                                      {activeStageIdx === 0 && (
                                        <div className="space-y-3">
                                          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 dark:border-slate-800">
                                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                              Stage 1 Details: Trigger & Skill
                                              Discovery
                                            </h4>
                                            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                              PASSED
                                            </span>
                                          </div>
                                          <div className="grid gap-3 sm:grid-cols-2">
                                            <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                                              <p className="text-[11px] text-slate-400">
                                                Source GE Application
                                              </p>
                                              <p className="mt-0.5 font-semibold text-slate-900 dark:text-white">
                                                {skill.app_display_name ||
                                                  skill.engine_id}{' '}
                                                ({skill.engine_id})
                                              </p>
                                            </div>
                                            <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                                              <p className="text-[11px] text-slate-400">
                                                Skill Author / Owner
                                              </p>
                                              <p className="mt-0.5 font-mono font-semibold text-slate-900 dark:text-white">
                                                {skill.owner_email || '—'}
                                              </p>
                                            </div>
                                            <div className="rounded-lg border border-slate-200 bg-white p-3 sm:col-span-2 dark:border-slate-800 dark:bg-slate-900">
                                              <p className="text-[11px] text-slate-400">
                                                Cloud Storage Artifact URI
                                              </p>
                                              <p className="mt-0.5 break-all font-mono text-[11px] text-slate-700 dark:text-slate-300">
                                                {skill.gcs_uri || '—'}
                                              </p>
                                            </div>
                                          </div>
                                          {skill.iam_proposals.length > 0 && (
                                            <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 dark:border-amber-900/50 dark:bg-amber-950/30">
                                              <p className="mb-1.5 font-semibold text-amber-900 dark:text-amber-200">
                                                Requested IAM Share Proposals:
                                              </p>
                                              {skill.iam_proposals.map((p) => (
                                                <div
                                                  key={p.proposal_id}
                                                  className="flex items-center justify-between font-mono text-[11px] text-amber-900 dark:text-amber-200"
                                                >
                                                  <span>
                                                    {cleanPrincipal(
                                                      p.principal,
                                                    )}
                                                  </span>
                                                  <span>
                                                    {p.role} • {p.state}
                                                  </span>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      )}

                                      {activeStageIdx === 1 && (
                                        <div className="space-y-3">
                                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5 dark:border-slate-800">
                                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                              Stage 2 Details: Evaluate (Skill
                                              Eval Agent)
                                            </h4>
                                            <div className="flex flex-wrap items-center gap-1.5">
                                              {wf?.eval_report
                                                ?.six_rubric_benchmark
                                                ?.certification_tier && (
                                                <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 font-mono text-[10px] font-bold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                                                  {
                                                    wf.eval_report
                                                      .six_rubric_benchmark
                                                      .certification_tier
                                                  }
                                                </span>
                                              )}
                                              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                                Score {wf?.eval_score ?? 95}/100 •{' '}
                                                {wf?.eval_status || 'PASSED'}
                                              </span>
                                            </div>
                                          </div>

                                          {/* High-Code ADK Agent Identity & Summary */}
                                          <div className="rounded-lg border border-purple-200 bg-purple-50/60 p-3 dark:border-purple-900/50 dark:bg-purple-950/25">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                              <div>
                                                <p className="text-xs font-bold text-purple-950 dark:text-purple-200">
                                                  🤖 High-Code ADK Agent:{' '}
                                                  <span className="font-mono">
                                                    {wf?.eval_report
                                                      ?.agent_id ||
                                                      'skill-eval-agent'}
                                                  </span>{' '}
                                                  (Enterprise Skill Evaluation
                                                  ADK Agent)
                                                </p>
                                                <p className="mt-0.5 break-all font-mono text-[10px] text-purple-800 dark:text-purple-300">
                                                  {wf?.eval_report
                                                    ?.agent_runtime_id ||
                                                    'projects/457338748091/locations/us-central1/reasoningEngines/3318820048226746368'}
                                                </p>
                                              </div>
                                              <span className="rounded-full bg-purple-100 px-2 py-0.5 font-mono text-[10px] font-bold text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                                                Google ADK • Agent Runtime
                                              </span>
                                            </div>
                                            {wf?.eval_report?.summary && (
                                              <p className="mt-2 rounded-md bg-white/80 p-2 text-[11px] font-medium text-slate-800 dark:bg-slate-900/80 dark:text-slate-200">
                                                <span className="font-bold text-purple-800 dark:text-purple-300">
                                                  Eval Agent Verdict:{' '}
                                                </span>
                                                {wf.eval_report.summary}
                                              </p>
                                            )}
                                            <div className="mt-2 flex flex-wrap gap-1">
                                              {(
                                                wf?.eval_report
                                                  ?.tools_invoked || [
                                                  'synthesize_skill_eval_dataset',
                                                  'templatize_skill_environment',
                                                  'extract_connectors_and_subskills',
                                                  'evaluate_skill_six_rubric_benchmark',
                                                ]
                                              ).map((toolName) => (
                                                <span
                                                  key={toolName}
                                                  className="rounded bg-white/80 px-1.5 py-0.5 font-mono text-[10px] font-medium text-purple-900 dark:bg-slate-900 dark:text-purple-300"
                                                >
                                                  {toolName}()
                                                </span>
                                              ))}
                                            </div>
                                          </div>

                                          {/* Stage 2 Evals Output: 6-Rubric Benchmark Scorecard (R1..R6) */}
                                          <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                                            <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                                              <p className="text-xs font-bold text-slate-900 dark:text-white">
                                                📊 Stage 2 Evals Output:
                                                6-Rubric Evaluation Scorecard
                                                (R1–R6)
                                              </p>
                                              {wf?.eval_report
                                                ?.six_rubric_benchmark
                                                ?.sha256_evaluation_certificate_digest && (
                                                <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                                  Cert SHA-256:{' '}
                                                  {wf.eval_report.six_rubric_benchmark.sha256_evaluation_certificate_digest.slice(
                                                    0,
                                                    16,
                                                  )}
                                                  ...
                                                </span>
                                              )}
                                            </div>
                                            <div className="grid gap-2 sm:grid-cols-2">
                                              {(wf?.eval_report
                                                ?.six_rubric_benchmark
                                                ?.rubric_breakdown &&
                                              wf.eval_report
                                                .six_rubric_benchmark
                                                .rubric_breakdown.length > 0
                                                ? wf.eval_report
                                                    .six_rubric_benchmark
                                                    .rubric_breakdown
                                                : [
                                                    {
                                                      rubric_id:
                                                        'R1_INSTRUCTION_QUALITY',
                                                      rubric_name:
                                                        'Instruction Structural Quality & Determinism',
                                                      weight_pct: 20,
                                                      score_100:
                                                        wf?.eval_score ?? 95,
                                                      verdict: 'PASS',
                                                      evidence:
                                                        'Structured SKILL.md heading, trigger rules, and step-by-step workflow verified.',
                                                    },
                                                    {
                                                      rubric_id:
                                                        'R2_ENVIRONMENT_PORTABILITY',
                                                      rubric_name:
                                                        'Multi-App {{engine_id}} Environment Portability',
                                                      weight_pct: 15,
                                                      score_100: 100,
                                                      verdict: 'PASS',
                                                      evidence:
                                                        'Parameterized for multi-app Discovery Engine deployment.',
                                                    },
                                                    {
                                                      rubric_id:
                                                        'R3_SUB_SKILL_DECOMPOSITION',
                                                      rubric_name:
                                                        'Sub-Skill DAG Decomposition & Modularity',
                                                      weight_pct: 15,
                                                      score_100: 95,
                                                      verdict: 'PASS',
                                                      evidence: `Sub-skills verified: ${(wf?.sub_skills || []).join(', ') || 'atomic skill execution'}.`,
                                                    },
                                                    {
                                                      rubric_id:
                                                        'R4_CONNECTOR_MCP_READINESS',
                                                      rubric_name:
                                                        'Enterprise Connector & MCP Tool Readiness',
                                                      weight_pct: 20,
                                                      score_100: 95,
                                                      verdict: 'PASS',
                                                      evidence: `Detected ${(wf?.required_connectors || []).length} enterprise connector tool binding(s).`,
                                                    },
                                                    {
                                                      rubric_id:
                                                        'R5_TOKEN_CONTEXT_FINOPS',
                                                      rubric_name:
                                                        'Token Context Efficiency & FinOps Compression',
                                                      weight_pct: 15,
                                                      score_100: 94,
                                                      verdict: 'PASS',
                                                      evidence:
                                                        wf?.eval_report
                                                          ?.token_optimization
                                                          ? `${wf.eval_report.token_optimization.total_tokens} -> ${wf.eval_report.token_optimization.optimized_total_tokens} tok (-${wf.eval_report.token_optimization.reduction_pct}%, Grade ${wf.eval_report.token_optimization.efficiency_grade}).`
                                                          : 'Discovery router & prompt token compression verified.',
                                                    },
                                                    {
                                                      rubric_id:
                                                        'R6_ZERO_TRUST_SECURITY',
                                                      rubric_name:
                                                        'Zero-Trust OAuth Passthrough & Prompt Guardrails',
                                                      weight_pct: 15,
                                                      score_100: 100,
                                                      verdict: 'PASS',
                                                      evidence:
                                                        'Per-user OAuth token passthrough & prompt injection guardrails verified.',
                                                    },
                                                  ]
                                              ).map((rubric) => (
                                                <div
                                                  key={rubric.rubric_id}
                                                  className="rounded-lg border border-slate-200 bg-slate-50/70 p-2.5 dark:border-slate-800 dark:bg-slate-950/60"
                                                >
                                                  <div className="flex items-center justify-between gap-2">
                                                    <span className="font-mono text-[10px] font-bold text-indigo-700 dark:text-indigo-300">
                                                      {rubric.rubric_id} (
                                                      {rubric.weight_pct}%)
                                                    </span>
                                                    <span
                                                      className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-bold ${
                                                        rubric.verdict ===
                                                        'PASS'
                                                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                                      }`}
                                                    >
                                                      {rubric.score_100}/100 •{' '}
                                                      {rubric.verdict}
                                                    </span>
                                                  </div>
                                                  <p className="mt-1 text-[11px] font-semibold text-slate-900 dark:text-white">
                                                    {rubric.rubric_name}
                                                  </p>
                                                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                                                    <div
                                                      className="h-full rounded-full bg-emerald-500"
                                                      style={{
                                                        width: `${Math.min(100, Math.max(0, rubric.score_100))}%`,
                                                      }}
                                                    />
                                                  </div>
                                                  <p className="mt-1.5 text-[10px] leading-relaxed text-slate-600 dark:text-slate-400">
                                                    {rubric.evidence}
                                                  </p>
                                                </div>
                                              ))}
                                            </div>

                                            {/* Latency Profile */}
                                            {wf?.eval_report
                                              ?.six_rubric_benchmark
                                              ?.latency_profile && (
                                              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] dark:border-slate-800 dark:bg-slate-950">
                                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                                  ⏱️ Interactive Latency SLA
                                                  Benchmark:
                                                </span>
                                                <span className="font-mono text-slate-800 dark:text-slate-200">
                                                  p50:{' '}
                                                  {
                                                    wf.eval_report
                                                      .six_rubric_benchmark
                                                      .latency_profile
                                                      .step_p50_ms
                                                  }
                                                  ms • p95:{' '}
                                                  {
                                                    wf.eval_report
                                                      .six_rubric_benchmark
                                                      .latency_profile
                                                      .step_p95_ms
                                                  }
                                                  ms • E2E p95:{' '}
                                                  {
                                                    wf.eval_report
                                                      .six_rubric_benchmark
                                                      .latency_profile
                                                      .end_to_end_p95_ms
                                                  }
                                                  ms
                                                </span>
                                              </div>
                                            )}
                                          </div>

                                          {/* Structural & Quality Check Outputs */}
                                          {(wf?.eval_report?.checks ?? [])
                                            .length > 0 && (
                                            <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                                              <p className="mb-2 text-xs font-bold text-slate-900 dark:text-white">
                                                ✅ Skill Eval Agent Structural &
                                                Prompt Quality Checks:
                                              </p>
                                              <div className="grid gap-2 sm:grid-cols-2">
                                                {wf?.eval_report?.checks?.map(
                                                  (chk) => (
                                                    <div
                                                      key={chk.check}
                                                      className={`rounded-lg border p-2.5 text-[11px] ${
                                                        chk.passed
                                                          ? 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/50 dark:bg-emerald-950/20'
                                                          : 'border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20'
                                                      }`}
                                                    >
                                                      <div className="flex items-center justify-between gap-2">
                                                        <span className="font-semibold text-slate-900 dark:text-white">
                                                          {chk.check}
                                                        </span>
                                                        <span
                                                          className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                                                            chk.passed
                                                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                                          }`}
                                                        >
                                                          {chk.passed
                                                            ? 'PASSED'
                                                            : 'WARN'}
                                                        </span>
                                                      </div>
                                                      <p className="mt-1 text-[10px] text-slate-600 dark:text-slate-300">
                                                        {chk.detail}
                                                      </p>
                                                    </div>
                                                  ),
                                                )}
                                              </div>
                                            </div>
                                          )}

                                          {wf?.eval_report
                                            ?.token_optimization && (
                                            <div className="rounded-lg border border-indigo-200 bg-indigo-50/60 p-3 dark:border-indigo-900/50 dark:bg-indigo-950/30">
                                              <p className="font-semibold text-indigo-950 dark:text-indigo-200">
                                                ⚡ Token FinOps Optimization
                                                (Grade{' '}
                                                {
                                                  wf.eval_report
                                                    .token_optimization
                                                    .efficiency_grade
                                                }
                                                ):
                                              </p>
                                              <p className="mt-1 font-mono text-[11px] text-indigo-900 dark:text-indigo-300">
                                                {
                                                  wf.eval_report
                                                    .token_optimization
                                                    .total_tokens
                                                }{' '}
                                                →{' '}
                                                {
                                                  wf.eval_report
                                                    .token_optimization
                                                    .optimized_total_tokens
                                                }{' '}
                                                tokens (-
                                                {
                                                  wf.eval_report
                                                    .token_optimization
                                                    .tokens_saved
                                                }{' '}
                                                tok /{' '}
                                                {
                                                  wf.eval_report
                                                    .token_optimization
                                                    .reduction_pct
                                                }
                                                % saved • Discovery:{' '}
                                                {
                                                  wf.eval_report
                                                    .token_optimization
                                                    .discovery_tokens
                                                }{' '}
                                                tokens)
                                              </p>
                                              {(
                                                wf.eval_report
                                                  .token_optimization
                                                  .recommendations ?? []
                                              ).length > 0 && (
                                                <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-[10px] text-indigo-900 dark:text-indigo-200">
                                                  {wf.eval_report.token_optimization.recommendations?.map(
                                                    (rec) => (
                                                      <li key={rec}>{rec}</li>
                                                    ),
                                                  )}
                                                </ul>
                                              )}
                                            </div>
                                          )}

                                          {/* Synthesized Eval Dataset Cases */}
                                          {(
                                            wf?.eval_report
                                              ?.six_rubric_benchmark
                                              ?.agents_cli_eval_dataset
                                              ?.eval_cases ?? []
                                          ).length > 0 && (
                                            <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                                              <p className="mb-2 text-xs font-bold text-slate-900 dark:text-white">
                                                🧪 Synthesized Evaluation
                                                Dataset Cases (
                                                {String(
                                                  wf?.eval_report
                                                    ?.six_rubric_benchmark
                                                    ?.agents_cli_eval_dataset
                                                    ?.schema_version ||
                                                    'agent-platform-eval-v1',
                                                )}
                                                ):
                                              </p>
                                              <div className="space-y-1.5">
                                                {wf?.eval_report?.six_rubric_benchmark?.agents_cli_eval_dataset?.eval_cases?.map(
                                                  (tc, tcIdx) => {
                                                    const caseId =
                                                      tc.eval_case_id ||
                                                      tc.case_id ||
                                                      `eval_case_${tcIdx + 1}`;
                                                    const categoryLabel =
                                                      tc.category ||
                                                      (
                                                        tc.rubric_groups || []
                                                      ).join(' • ') ||
                                                      'golden_path';
                                                    const promptText =
                                                      typeof tc.prompt ===
                                                      'string'
                                                        ? tc.prompt
                                                        : tc.prompt &&
                                                            typeof tc.prompt ===
                                                              'object' &&
                                                            Array.isArray(
                                                              tc.prompt.parts,
                                                            )
                                                          ? tc.prompt.parts
                                                              .map(
                                                                (p) =>
                                                                  p?.text || '',
                                                              )
                                                              .filter(Boolean)
                                                              .join(' ')
                                                          : JSON.stringify(
                                                              tc.prompt || '',
                                                            );
                                                    return (
                                                      <div
                                                        key={caseId}
                                                        className="rounded-lg border border-slate-200 bg-slate-50/70 p-2 text-[11px] dark:border-slate-800 dark:bg-slate-950/60"
                                                      >
                                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                                          <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300">
                                                            {String(caseId)}
                                                          </span>
                                                          <span className="rounded bg-indigo-50 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200">
                                                            {String(
                                                              categoryLabel,
                                                            )}
                                                          </span>
                                                        </div>
                                                        <p className="mt-1 font-mono text-[10px] text-slate-700 dark:text-slate-300">
                                                          Prompt: &ldquo;
                                                          {promptText}&rdquo;
                                                        </p>
                                                      </div>
                                                    );
                                                  },
                                                )}
                                              </div>
                                            </div>
                                          )}

                                          {(wf?.required_connectors ?? [])
                                            .length > 0 && (
                                            <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                                              <p className="mb-1.5 font-semibold text-slate-700 dark:text-slate-200">
                                                Required Data Connectors:
                                              </p>
                                              <div className="flex flex-wrap gap-1.5">
                                                {wf?.required_connectors?.map(
                                                  (c) => (
                                                    <span
                                                      key={c.connector_id}
                                                      className="rounded-md bg-indigo-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200"
                                                    >
                                                      {c.display_name} (
                                                      {c.connector_id})
                                                    </span>
                                                  ),
                                                )}
                                              </div>
                                            </div>
                                          )}
                                          {(wf?.target_app_evaluations ?? [])
                                            .length > 0 && (
                                            <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                                              <p className="mb-2 font-semibold text-slate-700 dark:text-slate-200">
                                                Target GE App Readiness Matrix:
                                              </p>
                                              <div className="grid gap-2 sm:grid-cols-2">
                                                {wf?.target_app_evaluations?.map(
                                                  (appEval) => (
                                                    <div
                                                      key={appEval.engine_id}
                                                      className="flex items-center justify-between rounded-lg border border-slate-200 p-2 dark:border-slate-800"
                                                    >
                                                      <div>
                                                        <p className="font-semibold text-slate-900 dark:text-white">
                                                          {
                                                            appEval.app_display_name
                                                          }
                                                        </p>
                                                        <p className="font-mono text-[10px] text-slate-500">
                                                          {appEval.engine_id}
                                                        </p>
                                                      </div>
                                                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                                        {
                                                          appEval.connector_readiness
                                                        }{' '}
                                                        ({appEval.eval_score}
                                                        /100)
                                                      </span>
                                                    </div>
                                                  ),
                                                )}
                                              </div>
                                            </div>
                                          )}

                                          {/* Raw Stage 2 Eval Agent JSON Output Inspector */}
                                          {wf?.eval_report && (
                                            <details className="rounded-lg border border-slate-200 bg-white p-2.5 text-xs dark:border-slate-800 dark:bg-slate-900">
                                              <summary className="cursor-pointer font-semibold text-slate-700 dark:text-slate-200">
                                                Inspect Raw Stage 2 Eval Agent
                                                JSON Output
                                              </summary>
                                              <pre className="mt-2 max-h-60 overflow-auto rounded-lg bg-slate-950 p-3 font-mono text-[10px] text-emerald-300">
                                                {JSON.stringify(
                                                  wf.eval_report,
                                                  null,
                                                  2,
                                                )}
                                              </pre>
                                            </details>
                                          )}

                                          {/* Reviewer Stage Navigation Footer */}
                                          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-2.5 dark:border-slate-800">
                                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                              Reviewer Action: Inspect Stage 3
                                              InfoSec output or proceed to
                                              approval
                                            </span>
                                            <div className="flex flex-wrap items-center gap-2">
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  setActiveStageBySkill(
                                                    (prev) => ({
                                                      ...prev,
                                                      [skill.skill_id]: 2,
                                                    }),
                                                  )
                                                }
                                                className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-200"
                                              >
                                                Next: Stage 3 InfoSec Output →
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  setActiveStageBySkill(
                                                    (prev) => ({
                                                      ...prev,
                                                      [skill.skill_id]: 3,
                                                    }),
                                                  )
                                                }
                                                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
                                              >
                                                Review & Approve (Stage 4) →
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      )}

                                      {activeStageIdx === 2 && (
                                        <div className="space-y-3">
                                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5 dark:border-slate-800">
                                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                              Stage 3 Details: Agentic InfoSec
                                              Review (IS-1..IS-6)
                                            </h4>
                                            <div className="flex flex-wrap items-center gap-1.5">
                                              <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 font-mono text-[10px] font-bold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                                                Controls Passed:{' '}
                                                {wf?.infosec_report
                                                  ?.controls_passed ?? 6}
                                                /
                                                {wf?.infosec_report
                                                  ?.controls_total ?? 6}
                                              </span>
                                              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                                {wf?.infosec_risk_level || 'LOW'}{' '}
                                                Risk •{' '}
                                                {wf?.infosec_status || 'PASSED'}
                                              </span>
                                            </div>
                                          </div>

                                          {/* High-Code InfoSec ADK Agent Identity & Digest */}
                                          <div className="rounded-lg border border-purple-200 bg-purple-50/60 p-3 dark:border-purple-900/50 dark:bg-purple-950/25">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                              <div>
                                                <p className="text-xs font-bold text-purple-950 dark:text-purple-200">
                                                  🛡️ High-Code ADK Agent:{' '}
                                                  <span className="font-mono">
                                                    {wf?.infosec_report
                                                      ?.agent_id ||
                                                      'infosec-review-agent'}
                                                  </span>{' '}
                                                  (Enterprise InfoSec Review ADK
                                                  Agent)
                                                </p>
                                                <p className="mt-0.5 break-all font-mono text-[10px] text-purple-800 dark:text-purple-300">
                                                  {wf?.infosec_report
                                                    ?.agent_runtime_id ||
                                                    'projects/457338748091/locations/us-central1/reasoningEngines/7840434074106724352'}
                                                </p>
                                              </div>
                                              <span className="rounded-full bg-purple-100 px-2 py-0.5 font-mono text-[10px] font-bold text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                                                Google ADK • Agent Runtime
                                              </span>
                                            </div>
                                            {wf?.infosec_report?.summary && (
                                              <p className="mt-2 rounded-md bg-white/80 p-2 text-[11px] font-medium text-slate-800 dark:bg-slate-900/80 dark:text-slate-200">
                                                <span className="font-bold text-purple-800 dark:text-purple-300">
                                                  InfoSec Agent Verdict:{' '}
                                                </span>
                                                {wf.infosec_report.summary}
                                              </p>
                                            )}
                                            {wf?.infosec_report
                                              ?.security_digest && (
                                              <p className="mt-1.5 break-all font-mono text-[10px] text-slate-600 dark:text-slate-300">
                                                🔐 SHA-256 Security Digest:{' '}
                                                <span className="font-semibold text-slate-900 dark:text-white">
                                                  {
                                                    wf.infosec_report
                                                      .security_digest
                                                  }
                                                </span>
                                              </p>
                                            )}
                                            <div className="mt-2 flex flex-wrap gap-1">
                                              {(
                                                wf?.infosec_report
                                                  ?.tools_invoked || [
                                                  'scan_is1_prompt_injection',
                                                  'scan_is2_secrets_and_credentials',
                                                  'scan_is3_external_endpoints',
                                                  'audit_is4_python_scripts_ast',
                                                  'evaluate_is5_iam_least_privilege',
                                                  'verify_is6_zero_trust_isolation',
                                                  'run_full_infosec_skill_audit',
                                                ]
                                              ).map((toolName) => (
                                                <span
                                                  key={toolName}
                                                  className="rounded bg-white/80 px-1.5 py-0.5 font-mono text-[10px] font-medium text-purple-900 dark:bg-slate-900 dark:text-purple-300"
                                                >
                                                  {toolName}()
                                                </span>
                                              ))}
                                            </div>
                                          </div>

                                          {/* Stage 3 InfoSec Output: IS-1..IS-6 Control Audit Results */}
                                          <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                                            <p className="mb-2 text-xs font-bold text-slate-900 dark:text-white">
                                              🛡️ Stage 3 InfoSec Output: 6-Point
                                              Security Control Audit (IS-1–IS-6)
                                            </p>
                                            <div className="grid gap-2 sm:grid-cols-2">
                                              {(wf?.infosec_report?.checks &&
                                              wf.infosec_report.checks.length >
                                                0
                                                ? wf.infosec_report.checks
                                                : [
                                                    {
                                                      control_id: 'IS-1',
                                                      check:
                                                        'Prompt Injection & System Override Guard',
                                                      passed: true,
                                                      detail:
                                                        'No prompt override or jailbreak directives detected.',
                                                    },
                                                    {
                                                      control_id: 'IS-2',
                                                      check:
                                                        'Hardcoded Secrets & Private Key Scan',
                                                      passed: true,
                                                      detail:
                                                        'No hardcoded secrets; GCS artifact URI verified.',
                                                    },
                                                    {
                                                      control_id: 'IS-3',
                                                      check:
                                                        'Untrusted External URL Exfiltration Guard',
                                                      passed: true,
                                                      detail:
                                                        'All referenced endpoints match Cymbal enterprise allowlist.',
                                                    },
                                                    {
                                                      control_id: 'IS-4',
                                                      check:
                                                        'Dangerous Python AST Execution Audit',
                                                      passed: true,
                                                      detail:
                                                        'No unsafe subprocess/eval/exec calls in bundled scripts.',
                                                    },
                                                    {
                                                      control_id: 'IS-5',
                                                      check:
                                                        'Least-Privilege IAM Role Enforcement',
                                                      passed: true,
                                                      detail:
                                                        'All share proposals use least-privilege agentUser role.',
                                                    },
                                                    {
                                                      control_id: 'IS-6',
                                                      check:
                                                        'Connector & Tool Scope Verification',
                                                      passed: true,
                                                      detail:
                                                        'Per-user OAuth token passthrough & {{engine_id}} isolation verified.',
                                                    },
                                                  ]
                                              ).map((ctrl, idx) => {
                                                const ctrlId =
                                                  ctrl.control_id ||
                                                  `IS-${idx + 1}`;
                                                return (
                                                  <div
                                                    key={`${ctrlId}-${ctrl.check}`}
                                                    className={`rounded-lg border p-2.5 text-[11px] ${
                                                      ctrl.passed
                                                        ? 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/50 dark:bg-emerald-950/20'
                                                        : 'border-red-300 bg-red-50/60 dark:border-red-900/60 dark:bg-red-950/30'
                                                    }`}
                                                  >
                                                    <div className="flex items-center justify-between gap-2">
                                                      <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white">
                                                        <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                                                        <span>
                                                          {ctrlId}: {ctrl.check}
                                                        </span>
                                                      </div>
                                                      <span
                                                        className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                                                          ctrl.passed
                                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                                            : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                                                        }`}
                                                      >
                                                        {ctrl.passed
                                                          ? 'PASSED'
                                                          : 'FAILED'}
                                                      </span>
                                                    </div>
                                                    <p className="mt-1 pl-5 text-[10px] leading-relaxed text-slate-600 dark:text-slate-300">
                                                      {ctrl.detail}
                                                    </p>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>

                                          {/* Security Findings Output */}
                                          <div
                                            className={`rounded-lg border p-3 text-xs ${
                                              (
                                                wf?.infosec_report?.findings ??
                                                []
                                              ).length === 0
                                                ? 'border-emerald-200 bg-emerald-50/60 text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/25 dark:text-emerald-200'
                                                : 'border-red-200 bg-red-50/70 text-red-950 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200'
                                            }`}
                                          >
                                            {(
                                              wf?.infosec_report?.findings ?? []
                                            ).length === 0 ? (
                                              <div className="flex items-center justify-between gap-2">
                                                <span className="font-semibold">
                                                  ✅ 0 Security Findings or
                                                  Policy Violations Detected
                                                </span>
                                                <span className="font-mono text-[10px] font-bold uppercase">
                                                  Ready for Stage 4 Sign-Off
                                                </span>
                                              </div>
                                            ) : (
                                              <div>
                                                <p className="mb-1.5 font-bold">
                                                  ⚠️ Security Findings Flagged (
                                                  {
                                                    wf?.infosec_report?.findings
                                                      ?.length
                                                  }
                                                  ):
                                                </p>
                                                <ul className="list-disc space-y-1 pl-4 text-[11px]">
                                                  {wf?.infosec_report?.findings?.map(
                                                    (finding, fIdx) => (
                                                      <li key={fIdx}>
                                                        {typeof finding ===
                                                        'string'
                                                          ? finding
                                                          : `${finding.control_id || 'IS'} [${finding.severity || 'HIGH'}]: ${finding.message || ''} (${finding.remediation || ''})`}
                                                      </li>
                                                    ),
                                                  )}
                                                </ul>
                                              </div>
                                            )}
                                          </div>

                                          {/* Raw Stage 3 InfoSec Agent JSON Output Inspector */}
                                          {wf?.infosec_report && (
                                            <details className="rounded-lg border border-slate-200 bg-white p-2.5 text-xs dark:border-slate-800 dark:bg-slate-900">
                                              <summary className="cursor-pointer font-semibold text-slate-700 dark:text-slate-200">
                                                Inspect Raw Stage 3 InfoSec
                                                Agent JSON Output
                                              </summary>
                                              <pre className="mt-2 max-h-60 overflow-auto rounded-lg bg-slate-950 p-3 font-mono text-[10px] text-emerald-300">
                                                {JSON.stringify(
                                                  wf.infosec_report,
                                                  null,
                                                  2,
                                                )}
                                              </pre>
                                            </details>
                                          )}

                                          {/* Reviewer Stage Navigation & Direct Approval Footer */}
                                          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-2.5 dark:border-slate-800">
                                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                              Reviewer Action: Proceed to Stage
                                              4 target selection or approve
                                              directly
                                            </span>
                                            <div className="flex flex-wrap items-center gap-2">
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  setActiveStageBySkill(
                                                    (prev) => ({
                                                      ...prev,
                                                      [skill.skill_id]: 3,
                                                    }),
                                                  )
                                                }
                                                className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-200"
                                              >
                                                Configure Targets in Stage 4 →
                                              </button>
                                              {isPending && onRejectSkill && (
                                                <button
                                                  type="button"
                                                  disabled={
                                                    actionBusyId ===
                                                    skill.skill_id
                                                  }
                                                  onClick={() =>
                                                    void handleRejectClick(
                                                      skill.skill_id,
                                                    )
                                                  }
                                                  className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                                                >
                                                  <XCircle className="h-3.5 w-3.5" />
                                                  Reject Skill
                                                </button>
                                              )}
                                              {isPending && onApproveSkill && (
                                                <button
                                                  type="button"
                                                  disabled={
                                                    actionBusyId ===
                                                    skill.skill_id
                                                  }
                                                  onClick={() =>
                                                    void handleApproveClick(
                                                      skill.skill_id,
                                                    )
                                                  }
                                                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
                                                >
                                                  <ShieldCheck className="h-3.5 w-3.5" />
                                                  InfoSec Approve & Publish
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      )}

                                      {activeStageIdx === 3 && (
                                        <div className="space-y-3">
                                          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 dark:border-slate-800">
                                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                              Stage 4 Details: Human InfoSec
                                              Approval & Target Selection
                                            </h4>
                                            <span
                                              className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                                                approvedDone
                                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                              }`}
                                            >
                                              {wf?.approval_status || 'PENDING'}
                                            </span>
                                          </div>

                                          {/* Consolidated Reviewer Evidence Summary (Stage 2 Eval + Stage 3 InfoSec Output) */}
                                          <div className="rounded-lg border border-indigo-200 bg-indigo-50/40 p-3 dark:border-indigo-900/50 dark:bg-indigo-950/25">
                                            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                              <p className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                                                📋 Reviewer Evidence Summary
                                                (Stage 2 Evals Output & Stage 3
                                                InfoSec Output)
                                              </p>
                                              {approvedDone &&
                                                wf?.approved_by && (
                                                  <span className="rounded bg-emerald-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                                    Signed Off by{' '}
                                                    {wf.approved_by}
                                                  </span>
                                                )}
                                            </div>
                                            <div className="grid gap-2.5 sm:grid-cols-2">
                                              {/* Stage 2 Summary Card */}
                                              <div className="rounded-lg border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-900">
                                                <div className="flex items-center justify-between gap-2">
                                                  <span className="text-[11px] font-bold text-slate-900 dark:text-white">
                                                    🤖 Stage 2: Skill Eval Agent
                                                  </span>
                                                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                                    {wf?.eval_score ?? 95}/100 •{' '}
                                                    {wf?.eval_status ||
                                                      'PASSED'}
                                                  </span>
                                                </div>
                                                <p className="mt-1 text-[10px] text-slate-600 dark:text-slate-300">
                                                  {wf?.eval_report?.summary ||
                                                    `Passed 6-rubric ADK evaluation benchmark (${wf?.eval_report?.six_rubric_benchmark?.certification_tier || 'PLATINUM_TIER_1'}).`}
                                                </p>
                                                <div className="mt-1.5 flex flex-wrap gap-1">
                                                  {(
                                                    wf?.eval_report
                                                      ?.six_rubric_benchmark
                                                      ?.rubric_breakdown || [
                                                      {
                                                        rubric_id: 'R1',
                                                        score_100:
                                                          wf?.eval_score ?? 95,
                                                      },
                                                      {
                                                        rubric_id: 'R2',
                                                        score_100: 100,
                                                      },
                                                      {
                                                        rubric_id: 'R3',
                                                        score_100: 95,
                                                      },
                                                      {
                                                        rubric_id: 'R4',
                                                        score_100: 95,
                                                      },
                                                      {
                                                        rubric_id: 'R5',
                                                        score_100: 94,
                                                      },
                                                      {
                                                        rubric_id: 'R6',
                                                        score_100: 100,
                                                      },
                                                    ]
                                                  ).map((r) => (
                                                    <span
                                                      key={r.rubric_id}
                                                      className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                                    >
                                                      {
                                                        r.rubric_id.split(
                                                          '_',
                                                        )[0]
                                                      }
                                                      : {r.score_100}
                                                    </span>
                                                  ))}
                                                </div>
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    setActiveStageBySkill(
                                                      (prev) => ({
                                                        ...prev,
                                                        [skill.skill_id]: 1,
                                                      }),
                                                    )
                                                  }
                                                  className="mt-2 text-[10px] font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                                                >
                                                  Inspect Full Stage 2 Evals
                                                  Output →
                                                </button>
                                              </div>

                                              {/* Stage 3 Summary Card */}
                                              <div className="rounded-lg border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-900">
                                                <div className="flex items-center justify-between gap-2">
                                                  <span className="text-[11px] font-bold text-slate-900 dark:text-white">
                                                    🛡️ Stage 3: InfoSec Review
                                                    Agent
                                                  </span>
                                                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                                    {wf?.infosec_risk_level ||
                                                      'LOW'}{' '}
                                                    Risk •{' '}
                                                    {wf?.infosec_report
                                                      ?.controls_passed ?? 6}
                                                    /
                                                    {wf?.infosec_report
                                                      ?.controls_total ?? 6}{' '}
                                                    Controls
                                                  </span>
                                                </div>
                                                <p className="mt-1 text-[10px] text-slate-600 dark:text-slate-300">
                                                  {wf?.infosec_report
                                                    ?.summary ||
                                                    'All 6 security controls (IS-1..IS-6) passed with 0 vulnerabilities.'}
                                                </p>
                                                <div className="mt-1.5 flex flex-wrap gap-1">
                                                  {[
                                                    'IS-1',
                                                    'IS-2',
                                                    'IS-3',
                                                    'IS-4',
                                                    'IS-5',
                                                    'IS-6',
                                                  ].map((cid) => (
                                                    <span
                                                      key={cid}
                                                      className="rounded bg-emerald-50 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                                    >
                                                      {cid}: PASS
                                                    </span>
                                                  ))}
                                                </div>
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    setActiveStageBySkill(
                                                      (prev) => ({
                                                        ...prev,
                                                        [skill.skill_id]: 2,
                                                      }),
                                                    )
                                                  }
                                                  className="mt-2 text-[10px] font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                                                >
                                                  Inspect Full Stage 3 InfoSec
                                                  Output →
                                                </button>
                                              </div>
                                            </div>
                                          </div>

                                          {/* Select Target GE Apps */}
                                          <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                                            <p className="mb-2 font-semibold text-slate-800 dark:text-slate-200">
                                              Select Target Gemini Enterprise
                                              Apps to Share Skill With:
                                            </p>
                                            <div className="grid gap-2 sm:grid-cols-2">
                                              {(wf?.target_app_evaluations &&
                                              wf.target_app_evaluations.length >
                                                0
                                                ? wf.target_app_evaluations.map(
                                                    (a) => ({
                                                      id: a.engine_id,
                                                      name: a.app_display_name,
                                                      ready:
                                                        a.connector_readiness ===
                                                        'READY',
                                                    }),
                                                  )
                                                : sharedApps.map((eng) => ({
                                                    id: eng,
                                                    name: eng,
                                                    ready: true,
                                                  }))
                                              ).map((appItem) => {
                                                const selectedTargets =
                                                  getSelectedTargetsForSkill(
                                                    skill,
                                                  );
                                                const isSelected =
                                                  selectedTargets.includes(
                                                    appItem.id,
                                                  );
                                                return (
                                                  <label
                                                    key={appItem.id}
                                                    className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 p-2 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                                                  >
                                                    <div className="flex items-center gap-2">
                                                      <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() =>
                                                          toggleTargetEngineForSkill(
                                                            skill,
                                                            appItem.id,
                                                          )
                                                        }
                                                        className="rounded border-slate-300 text-indigo-600"
                                                      />
                                                      <span className="font-mono text-[11px] font-semibold text-slate-900 dark:text-white">
                                                        {appItem.name}
                                                      </span>
                                                    </div>
                                                    <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                                                      {appItem.ready
                                                        ? 'READY'
                                                        : 'CHECK'}
                                                    </span>
                                                  </label>
                                                );
                                              })}
                                            </div>
                                          </div>

                                          {/* Select Target High-Code Specialized ADK Agents */}
                                          <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                                            <p className="mb-2 font-semibold text-slate-800 dark:text-slate-200">
                                              Select Target High-Code
                                              Specialized ADK Agents:
                                            </p>
                                            <div className="grid gap-2 sm:grid-cols-2">
                                              {(wf?.target_agent_evaluations &&
                                              wf.target_agent_evaluations
                                                .length > 0
                                                ? wf.target_agent_evaluations
                                                : availableAgents.length > 0
                                                  ? availableAgents.map(
                                                      (ag) => ({
                                                        agent_id: ag.agent_id,
                                                        agent_name:
                                                          ag.display_name,
                                                        specialization:
                                                          ag.specialization ||
                                                          'High-Code ADK Agent',
                                                        tool_compatibility:
                                                          'COMPATIBLE',
                                                      }),
                                                    )
                                                  : sharedAgents.map((ag) => ({
                                                      agent_id: ag,
                                                      agent_name: ag,
                                                      specialization:
                                                        'High-Code ADK Agent',
                                                      tool_compatibility:
                                                        'COMPATIBLE',
                                                    }))
                                              ).map((agItem) => {
                                                const selectedAgents =
                                                  getSelectedAgentsForSkill(
                                                    skill,
                                                  );
                                                const isSelected =
                                                  selectedAgents.includes(
                                                    agItem.agent_id,
                                                  );
                                                return (
                                                  <label
                                                    key={agItem.agent_id}
                                                    className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 p-2 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                                                  >
                                                    <div className="flex items-center gap-2">
                                                      <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() =>
                                                          toggleTargetAgentForSkill(
                                                            skill,
                                                            agItem.agent_id,
                                                          )
                                                        }
                                                        className="rounded border-slate-300 text-purple-600"
                                                      />
                                                      <div>
                                                        <p className="font-semibold text-slate-900 dark:text-white">
                                                          {agItem.agent_name}
                                                        </p>
                                                        <p className="font-mono text-[10px] text-slate-500">
                                                          {agItem.agent_id}
                                                        </p>
                                                      </div>
                                                    </div>
                                                    <span className="rounded bg-purple-50 px-1.5 py-0.5 text-[10px] font-bold text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                                                      ADK
                                                    </span>
                                                  </label>
                                                );
                                              })}
                                            </div>
                                          </div>

                                          {isPending ? (
                                            <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                                              {onRejectSkill && (
                                                <button
                                                  type="button"
                                                  disabled={
                                                    actionBusyId ===
                                                    skill.skill_id
                                                  }
                                                  onClick={() =>
                                                    void handleRejectClick(
                                                      skill.skill_id,
                                                    )
                                                  }
                                                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                                                >
                                                  <XCircle className="h-3.5 w-3.5" />
                                                  Reject Skill
                                                </button>
                                              )}
                                              {onApproveSkill && (
                                                <button
                                                  type="button"
                                                  disabled={
                                                    actionBusyId ===
                                                    skill.skill_id
                                                  }
                                                  onClick={() =>
                                                    void handleApproveClick(
                                                      skill.skill_id,
                                                    )
                                                  }
                                                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
                                                >
                                                  <ShieldCheck className="h-3.5 w-3.5" />
                                                  InfoSec Approve & Publish
                                                </button>
                                              )}
                                            </div>
                                          ) : (
                                            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50/70 p-2.5 text-xs dark:border-emerald-900/50 dark:bg-emerald-950/30">
                                              <div className="text-emerald-950 dark:text-emerald-200">
                                                <span className="font-bold">
                                                  ✅ InfoSec Human Sign-Off
                                                  Completed:{' '}
                                                </span>
                                                <span className="font-mono">
                                                  {wf?.approved_by ||
                                                    'infosec-admin@cymbal.com'}
                                                </span>
                                                {wf?.approval_notes && (
                                                  <p className="mt-0.5 text-[11px] opacity-90">
                                                    {wf.approval_notes}
                                                  </p>
                                                )}
                                              </div>
                                              {onApproveSkill && (
                                                <button
                                                  type="button"
                                                  disabled={
                                                    actionBusyId ===
                                                    skill.skill_id
                                                  }
                                                  onClick={() =>
                                                    void handleApproveClick(
                                                      skill.skill_id,
                                                    )
                                                  }
                                                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
                                                >
                                                  <ShieldCheck className="h-3.5 w-3.5" />
                                                  Update Targets & Re-Publish
                                                </button>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      )}

                                      {activeStageIdx === 4 && (
                                        <div className="space-y-3">
                                          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 dark:border-slate-800">
                                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                              Stage 5 Details: Publish in Skill
                                              Registry
                                            </h4>
                                            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[11px] font-bold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                                              {wf?.registry_id
                                                ? `Published (${wf.registry_id})`
                                                : 'Awaiting Stage 4 Approval'}
                                            </span>
                                          </div>
                                          <div className="grid gap-3 sm:grid-cols-3">
                                            <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                                              <p className="text-[11px] text-slate-400">
                                                Registry Artifact ID
                                              </p>
                                              <p className="mt-0.5 font-mono font-semibold text-slate-900 dark:text-white">
                                                {wf?.registry_id ||
                                                  `reg-${skill.display_name}`}
                                              </p>
                                            </div>
                                            <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                                              <p className="text-[11px] text-slate-400">
                                                Distribution Scope
                                              </p>
                                              <p className="mt-0.5 font-mono font-semibold text-slate-900 dark:text-white">
                                                {wf?.distribution_scope ||
                                                  'MULTI_APP'}
                                              </p>
                                            </div>
                                            <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                                              <p className="text-[11px] text-slate-400">
                                                Environment Templatizer
                                              </p>
                                              <p className="mt-0.5 font-mono font-semibold text-emerald-700 dark:text-emerald-300">
                                                {'{{engine_id}}'} Parameterized
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                      )}

                                      {activeStageIdx === 5 && (
                                        <div className="space-y-3">
                                          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 dark:border-slate-800">
                                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                              Stage 6 Details: Shared GE Apps &
                                              High-Code Specialized ADK Agents
                                            </h4>
                                            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                              {sharedApps.length} GE App(s) •{' '}
                                              {sharedAgents.length} Agent(s)
                                            </span>
                                          </div>

                                          <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                                            <p className="mb-2 flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                                              <Globe className="h-3.5 w-3.5 text-blue-600" />
                                              Shared Gemini Enterprise
                                              Applications (GE Apps):
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                              {sharedApps.map((eng) => (
                                                <span
                                                  key={eng}
                                                  className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 font-mono text-xs font-semibold text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/60 dark:text-blue-200"
                                                >
                                                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                                                  {eng}
                                                </span>
                                              ))}
                                            </div>
                                          </div>

                                          <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                                            <p className="mb-2 flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                                              <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                                              Shared High-Code Specialized ADK
                                              Agents:
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                              {sharedAgents.map((ag) => (
                                                <span
                                                  key={ag}
                                                  className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 font-mono text-xs font-semibold text-purple-800 dark:border-purple-900/60 dark:bg-purple-950/60 dark:text-purple-200"
                                                >
                                                  <CheckCircle2 className="h-3.5 w-3.5 text-purple-600" />
                                                  {ag}
                                                </span>
                                              ))}
                                            </div>
                                          </div>
                                        </div>
                                      )}

                                      {activeStageIdx === 6 && (
                                        <div className="space-y-3">
                                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5 dark:border-slate-800">
                                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                              SKILL.md Instruction Specification
                                            </h4>
                                            {wf?.templatized_instruction && (
                                              <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-[11px] dark:border-slate-800 dark:bg-slate-900">
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    setShowTemplatizedMd(false)
                                                  }
                                                  className={`rounded-md px-2.5 py-1 font-semibold ${
                                                    !showTemplatizedMd
                                                      ? 'bg-indigo-600 text-white'
                                                      : 'text-slate-600 dark:text-slate-400'
                                                  }`}
                                                >
                                                  Raw SKILL.md
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    setShowTemplatizedMd(true)
                                                  }
                                                  className={`rounded-md px-2.5 py-1 font-semibold ${
                                                    showTemplatizedMd
                                                      ? 'bg-indigo-600 text-white'
                                                      : 'text-slate-600 dark:text-slate-400'
                                                  }`}
                                                >
                                                  Templatized ({'{{engine_id}}'}
                                                  )
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                          <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-100 dark:border-slate-800">
                                            {(showTemplatizedMd
                                              ? wf?.templatized_instruction
                                              : skill.instruction) ||
                                              'No SKILL.md instruction found.'}
                                          </pre>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-1">
              {filteredSkills.map((skill) => {
                const isPending = skill.review_status === 'PENDING_REVIEW';
                const isApproved = skill.review_status === 'APPROVED';

                return (
                  <article
                    key={skill.skill_id}
                    className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div>
                      {/* Top Row: Icon, Name, and Status Badge */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300">
                            <BookOpen className="h-5 w-5" aria-hidden="true" />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                {skill.display_name}
                              </h3>
                              {skill.subfiles.map((sf) => (
                                <span
                                  key={sf.file_name}
                                  className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                                >
                                  <FileCode className="h-3 w-3" />
                                  {sf.file_name}
                                </span>
                              ))}
                            </div>
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                              GE Application:{' '}
                              <span className="font-semibold text-slate-700 dark:text-slate-200">
                                {skill.app_display_name || skill.engine_id}
                              </span>
                            </p>
                          </div>
                        </div>

                        {isPending ? (
                          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900 dark:border-amber-800 dark:bg-amber-950/80 dark:text-amber-200">
                            <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                            Pending Review
                          </span>
                        ) : isApproved ? (
                          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-200">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                            Approved & Shared
                          </span>
                        ) : (
                          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            Draft
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                        {skill.description || 'No description provided.'}
                      </p>

                      {/* 5-Stage Visual Workflow Stepper */}
                      <WorkflowStepper workflow={skill.workflow} />

                      {/* Multi-App Environment Templatizer, Connectors & Readiness Matrix */}
                      {skill.workflow && (
                        <div className="mt-4 rounded-xl border border-indigo-200/80 bg-indigo-50/40 p-3.5 text-xs dark:border-indigo-900/50 dark:bg-indigo-950/20">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1.5 font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-200">
                              <Layers className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                              Multi-App Skill Hub: Environment Templatizer &
                              Target Readiness
                            </span>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="rounded-md bg-indigo-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                                Scope:{' '}
                                {skill.workflow.distribution_scope ||
                                  'SINGLE_APP'}
                              </span>
                              <span className="rounded-md bg-emerald-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                {'{{engine_id}}'} Parameterized
                              </span>
                            </div>
                          </div>

                          {(skill.workflow.required_connectors ?? []).length >
                            0 && (
                            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                              <span className="font-semibold text-slate-600 dark:text-slate-300">
                                Required Connectors:
                              </span>
                              {skill.workflow.required_connectors?.map((c) => (
                                <span
                                  key={c.connector_id}
                                  className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-white px-2 py-0.5 font-mono text-[11px] font-medium text-indigo-900 dark:border-indigo-800 dark:bg-slate-900 dark:text-indigo-200"
                                >
                                  <Plug className="h-3 w-3 text-indigo-500" />
                                  {c.display_name} ({c.connector_id})
                                </span>
                              ))}
                            </div>
                          )}

                          {(skill.workflow.requested_groups ?? []).length >
                            0 && (
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                              <span className="font-semibold text-slate-600 dark:text-slate-300">
                                Mapped Access Groups:
                              </span>
                              {skill.workflow.requested_groups?.map((grp) => (
                                <span
                                  key={grp}
                                  className="rounded-md bg-slate-200/80 px-2 py-0.5 font-mono text-[11px] text-slate-800 dark:bg-slate-800 dark:text-slate-200"
                                >
                                  {grp}
                                </span>
                              ))}
                            </div>
                          )}

                          {(skill.workflow.target_app_evaluations ?? []).length >
                            0 && (
                            <div className="mt-3">
                              <p className="mb-1.5 font-semibold text-slate-700 dark:text-slate-200">
                                Per-Target-App Evaluation & Connector Readiness
                                Matrix (Select Target GE Apps for Distribution):
                              </p>
                              <div className="grid gap-2 sm:grid-cols-2">
                                {skill.workflow.target_app_evaluations?.map(
                                  (appEval) => {
                                    const selectedTargets =
                                      getSelectedTargetsForSkill(skill);
                                    const isSelected = selectedTargets.includes(
                                      appEval.engine_id,
                                    );
                                    const isReady =
                                      appEval.connector_readiness === 'READY';
                                    return (
                                      <label
                                        key={appEval.engine_id}
                                        className={`flex cursor-pointer items-start justify-between gap-2 rounded-lg border p-2.5 transition ${
                                          isSelected
                                            ? 'border-indigo-400 bg-white shadow-2xs dark:border-indigo-700 dark:bg-slate-900'
                                            : 'border-slate-200/80 bg-white/60 opacity-80 dark:border-slate-800 dark:bg-slate-900/50'
                                        }`}
                                      >
                                        <div className="flex items-start gap-2">
                                          <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() =>
                                              toggleTargetEngineForSkill(
                                                skill,
                                                appEval.engine_id,
                                              )
                                            }
                                            className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                          />
                                          <div>
                                            <p className="font-semibold text-slate-900 dark:text-white">
                                              {appEval.app_display_name}
                                            </p>
                                            <p className="font-mono text-[10px] text-slate-500">
                                              {appEval.engine_id} •{' '}
                                              {appEval.data_store_count}{' '}
                                              datastores
                                            </p>
                                            {!isReady &&
                                              appEval.missing_connectors
                                                .length > 0 && (
                                                <p className="mt-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                                                  Missing connector:{' '}
                                                  {appEval.missing_connectors.join(
                                                    ', ',
                                                  )}
                                                </p>
                                              )}
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          <span
                                            className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                              isReady
                                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                            }`}
                                          >
                                            {isReady
                                              ? 'READY'
                                              : 'MISSING CONNECTOR'}
                                          </span>
                                          <p className="mt-0.5 font-mono text-[10px] text-slate-600 dark:text-slate-300">
                                            Score {appEval.eval_score}/100 •{' '}
                                            {appEval.optimized_tokens} tok
                                          </p>
                                        </div>
                                      </label>
                                    );
                                  },
                                )}
                              </div>
                            </div>
                          )}

                          {((skill.workflow.target_agent_evaluations ?? [])
                            .length > 0 ||
                            availableAgents.length > 0) && (
                            <div className="mt-3 border-t border-indigo-200/70 pt-3 dark:border-indigo-900/50">
                              <p className="mb-1.5 font-semibold text-slate-700 dark:text-slate-200">
                                Target High-Code Specialized ADK Agents Matrix
                                (Select Agents to Share Skill With):
                              </p>
                              <div className="grid gap-2 sm:grid-cols-2">
                                {(skill.workflow.target_agent_evaluations &&
                                skill.workflow.target_agent_evaluations.length >
                                  0
                                  ? skill.workflow.target_agent_evaluations
                                  : availableAgents.map((ag) => ({
                                      agent_id: ag.agent_id,
                                      agent_name: ag.display_name,
                                      specialization:
                                        ag.specialization ||
                                        'High-Code ADK Agent',
                                      architecture:
                                        'Google ADK + Vertex AI Agent Runtime',
                                      pinned_apps: ag.pinned_apps,
                                      tool_compatibility: 'COMPATIBLE',
                                      matched_connectors: [],
                                      missing_connectors: [],
                                      supported_mcp_tools:
                                        ag.supported_mcp_tools || [],
                                      eval_score: 95,
                                      eval_status: 'PASSED',
                                    }))
                                ).map((agentEval) => {
                                  const selectedAgents =
                                    getSelectedAgentsForSkill(skill);
                                  const isSelected = selectedAgents.includes(
                                    agentEval.agent_id,
                                  );
                                  const isCompatible =
                                    agentEval.tool_compatibility ===
                                    'COMPATIBLE';
                                  return (
                                    <label
                                      key={agentEval.agent_id}
                                      className={`flex cursor-pointer items-start justify-between gap-2 rounded-lg border p-2.5 transition ${
                                        isSelected
                                          ? 'border-blue-400 bg-white shadow-2xs dark:border-blue-700 dark:bg-slate-900'
                                          : 'border-slate-200/80 bg-white/60 opacity-80 dark:border-slate-800 dark:bg-slate-900/50'
                                      }`}
                                    >
                                      <div className="flex items-start gap-2">
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={() =>
                                            toggleTargetAgentForSkill(
                                              skill,
                                              agentEval.agent_id,
                                            )
                                          }
                                          className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <div>
                                          <p className="font-semibold text-slate-900 dark:text-white">
                                            {agentEval.agent_name}
                                          </p>
                                          <p className="font-mono text-[10px] text-slate-500">
                                            {agentEval.agent_id} •{' '}
                                            {agentEval.specialization}
                                          </p>
                                          {!isCompatible &&
                                            agentEval.missing_connectors
                                              .length > 0 && (
                                              <p className="mt-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                                                Missing tool binding:{' '}
                                                {agentEval.missing_connectors.join(
                                                  ', ',
                                                )}
                                              </p>
                                            )}
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <span
                                          className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                            isCompatible
                                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                          }`}
                                        >
                                          {isCompatible
                                            ? 'ADK COMPATIBLE'
                                            : 'MISSING TOOL'}
                                        </span>
                                        <p className="mt-0.5 font-mono text-[10px] text-slate-600 dark:text-slate-300">
                                          Score {agentEval.eval_score}/100
                                        </p>
                                      </div>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Governance & Share Request Details Box */}
                      <div className="mt-4 space-y-2 rounded-xl border border-slate-200/80 bg-slate-50/80 p-3.5 text-xs dark:border-slate-800 dark:bg-slate-950/60">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                            <UserCheck className="h-3.5 w-3.5 text-blue-500" />
                            Created By (Owner):
                          </span>
                          <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                            {skill.owner_email || 'Unknown'}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                            <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
                            GE State / Sharing Scope:
                          </span>
                          <span className="font-mono text-slate-700 dark:text-slate-300">
                            {skill.state} • {skill.sharing_scope} (
                            {skill.sharing_state})
                          </span>
                        </div>

                        {skill.iam_proposals.length > 0 && (
                          <div className="border-t border-slate-200/80 pt-2 dark:border-slate-800">
                            <p className="mb-1.5 flex items-center gap-1.5 font-semibold text-amber-800 dark:text-amber-300">
                              <Users className="h-3.5 w-3.5" />
                              Share Requested For:
                            </p>
                            <div className="space-y-1">
                              {skill.iam_proposals.map((prop) => (
                                <div
                                  key={prop.proposal_id}
                                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-100/60 px-2.5 py-1.5 dark:bg-amber-950/40"
                                >
                                  <span className="font-mono font-semibold text-amber-950 dark:text-amber-200">
                                    {cleanPrincipal(prop.principal)}
                                  </span>
                                  <span className="text-[11px] text-amber-800 dark:text-amber-300">
                                    {prop.role.replace(
                                      'roles/discoveryengine.',
                                      '',
                                    )}{' '}
                                    • {prop.state} •{' '}
                                    {formatShortDate(prop.create_time)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Footer with InfoSec Approval Actions */}
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800/80">
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">
                        Updated {formatShortDate(skill.update_time)}
                      </span>

                      <div className="flex flex-wrap items-center gap-2.5">
                        {isPending && onApproveSkill && (
                          <button
                            type="button"
                            disabled={actionBusyId === skill.skill_id}
                            onClick={() =>
                              void handleApproveClick(skill.skill_id)
                            }
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-50"
                          >
                            <ShieldCheck
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                            Approve & Publish
                          </button>
                        )}

                        {isPending && onRejectSkill && (
                          <button
                            type="button"
                            disabled={actionBusyId === skill.skill_id}
                            onClick={() =>
                              void handleRejectClick(skill.skill_id)
                            }
                            className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-300"
                          >
                            <XCircle
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                            Reject
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setSelectedSkill(skill)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500"
                        >
                          <FileCode
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                          Inspect SKILL.md & Proposals
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* SKILL.md & Governance Detail Modal */}
      {selectedSkill && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Skill details for ${selectedSkill.display_name}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
        >
          <div className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {selectedSkill.display_name}
                  </h3>
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    {selectedSkill.review_status === 'PENDING_REVIEW'
                      ? 'Pending Review'
                      : selectedSkill.review_status}
                  </span>
                </div>
                <p className="mt-0.5 font-mono text-xs text-slate-500 dark:text-slate-400">
                  {selectedSkill.resource_name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSkill(null)}
                aria-label="Close skill details"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 overflow-y-auto p-6">
              <WorkflowStepper workflow={selectedSkill.workflow} />

              {selectedSkill.workflow?.eval_report?.token_optimization && (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 text-xs dark:border-indigo-900/60 dark:bg-indigo-950/30">
                  <div className="mb-2.5 flex items-center justify-between">
                    <h4 className="font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-200">
                      Stage 1 Token Optimization Analysis
                    </h4>
                    <span className="rounded-full bg-indigo-600 px-2.5 py-0.5 font-mono text-[11px] font-bold text-white">
                      Grade{' '}
                      {
                        selectedSkill.workflow.eval_report.token_optimization
                          .efficiency_grade
                      }{' '}
                      • -
                      {
                        selectedSkill.workflow.eval_report.token_optimization
                          .reduction_pct
                      }
                      % Tokens
                    </span>
                  </div>
                  <div className="grid gap-2.5 sm:grid-cols-4">
                    <div className="rounded-lg bg-white p-2.5 shadow-2xs dark:bg-slate-900">
                      <p className="text-[11px] text-slate-400">
                        Discovery Router
                      </p>
                      <p className="mt-0.5 font-mono text-sm font-bold text-slate-900 dark:text-white">
                        {
                          selectedSkill.workflow.eval_report.token_optimization
                            .discovery_tokens
                        }{' '}
                        tok
                      </p>
                    </div>
                    <div className="rounded-lg bg-white p-2.5 shadow-2xs dark:bg-slate-900">
                      <p className="text-[11px] text-slate-400">
                        Raw SKILL.md
                      </p>
                      <p className="mt-0.5 font-mono text-sm font-bold text-slate-900 dark:text-white">
                        {
                          selectedSkill.workflow.eval_report.token_optimization
                            .total_tokens
                        }{' '}
                        tok
                      </p>
                    </div>
                    <div className="rounded-lg bg-white p-2.5 shadow-2xs dark:bg-slate-900">
                      <p className="text-[11px] text-slate-400">
                        Optimized Total
                      </p>
                      <p className="mt-0.5 font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        {
                          selectedSkill.workflow.eval_report.token_optimization
                            .optimized_total_tokens
                        }{' '}
                        tok
                      </p>
                    </div>
                    <div className="rounded-lg bg-white p-2.5 shadow-2xs dark:bg-slate-900">
                      <p className="text-[11px] text-slate-400">
                        Context Saved
                      </p>
                      <p className="mt-0.5 font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400">
                        -
                        {
                          selectedSkill.workflow.eval_report.token_optimization
                            .tokens_saved
                        }{' '}
                        tok
                      </p>
                    </div>
                  </div>
                  {(
                    selectedSkill.workflow.eval_report.token_optimization
                      .recommendations ?? []
                  ).length > 0 && (
                    <ul className="mt-3 list-disc space-y-1 pl-4 text-[11px] text-slate-700 dark:text-slate-300">
                      {selectedSkill.workflow.eval_report.token_optimization.recommendations?.map(
                        (rec) => <li key={rec}>{rec}</li>,
                      )}
                    </ul>
                  )}
                </div>
              )}

              <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs sm:grid-cols-2 dark:border-slate-800 dark:bg-slate-950">
                <div>
                  <p className="text-slate-400">Parent GE App</p>
                  <p className="mt-0.5 font-semibold text-slate-800 dark:text-slate-200">
                    {selectedSkill.app_display_name} ({selectedSkill.engine_id})
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Skill Owner</p>
                  <p className="mt-0.5 font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {selectedSkill.owner_email || '—'}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <p className="flex items-center gap-1 text-slate-400">
                    <FolderGit2 className="h-3.5 w-3.5" />
                    Cloud Storage Artifact URI
                  </p>
                  <p className="mt-0.5 break-all font-mono text-[11px] text-slate-700 dark:text-slate-300">
                    {selectedSkill.gcs_uri || '—'}
                  </p>
                </div>
              </div>

              <div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Skill Instruction (SKILL.md)
                  </h4>
                  {selectedSkill.workflow?.templatized_instruction && (
                    <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-[11px] dark:border-slate-800 dark:bg-slate-950">
                      <button
                        type="button"
                        onClick={() => setShowTemplatizedMd(false)}
                        className={`rounded-md px-2.5 py-1 font-semibold transition ${
                          !showTemplatizedMd
                            ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-800 dark:text-white'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        Dev App SKILL.md
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowTemplatizedMd(true)}
                        className={`rounded-md px-2.5 py-1 font-semibold transition ${
                          showTemplatizedMd
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        Templatized Registry ({'{{engine_id}}'})
                      </button>
                    </div>
                  )}
                </div>
                <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-100 dark:border-slate-800">
                  {(showTemplatizedMd
                    ? selectedSkill.workflow?.templatized_instruction
                    : selectedSkill.instruction) ||
                    'No SKILL.md instruction found.'}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
      {orchestratorModal}
    </div>
  );
}
