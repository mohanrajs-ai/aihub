/**
 * User Portal Skill Registry Component (`frontend-user`).
 * Displays an App selector restricted to the user's authorized applications (`userApps`),
 * filters skills to those belonging to the selected authorized app, and displays strictly:
 * - Skill ID
 * - Slash Command
 * - Required Connector
 * - View SKILL.md (opens modal with SKILL.md instruction)
 */

import React, { useMemo, useState } from 'react';
import {
  Copy,
  FileText,
  FolderGit2,
  LayoutGrid,
  List,
  Plug,
  Search,
  Sparkles,
  Terminal,
  X,
} from 'lucide-react';
import {
  AgentSummary,
  CatalogApplication,
  DiscoveredSkill,
  SkillRegistryItem,
  SkillRequiredConnector,
} from '../types/catalog';

export interface SkillsSectionProps {
  mode?: 'user-hub' | 'admin-governance';
  skills: DiscoveredSkill[];
  userApps?: CatalogApplication[];
  availableAgents?: AgentSummary[];
  isAdmin?: boolean;
  pendingReviewCount?: number;
  approvedCount?: number;
  registrySkills?: SkillRegistryItem[];
  loading: boolean;
}

interface NormalizedUserSkill {
  skill_id: string;
  display_name: string;
  slash_command: string;
  instruction: string;
  target_engines: string[];
  required_connectors: SkillRequiredConnector[];
}

export function SkillsSection({
  skills,
  userApps = [],
  registrySkills = [],
  loading,
}: SkillsSectionProps): React.ReactElement {
  const [selectedEngineId, setSelectedEngineId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedSkill, setSelectedSkill] =
    useState<NormalizedUserSkill | null>(null);
  const [copiedSkillId, setCopiedSkillId] = useState<string | null>(null);

  const authorizedEngineIds = useMemo(
    () => new Set(userApps.map((app) => app.engine_id)),
    [userApps],
  );

  // Merge skills and registrySkills and restrict strictly to apps the user has access to
  const normalizedSkills = useMemo<NormalizedUserSkill[]>(() => {
    const registryBySlug = new Map<string, SkillRegistryItem>();
    for (const reg of registrySkills) {
      const slug = reg.skill_id.includes(':')
        ? reg.skill_id.split(':', 2)[1].trim().toLowerCase()
        : reg.skill_id.trim().toLowerCase();
      registryBySlug.set(slug, reg);
      if (reg.display_name) {
        registryBySlug.set(reg.display_name.trim().toLowerCase(), reg);
      }
    }

    const items: NormalizedUserSkill[] = [];
    const seenIds = new Set<string>();

    for (const skill of skills) {
      if (skill.review_status && skill.review_status !== 'APPROVED') {
        continue;
      }
      const slug = skill.skill_id.includes(':')
        ? skill.skill_id.split(':', 2)[1].trim().toLowerCase()
        : skill.skill_id.trim().toLowerCase();
      const matchedReg =
        registryBySlug.get(slug) ||
        registryBySlug.get(skill.display_name.trim().toLowerCase());

      const rawEngines = Array.from(
        new Set([
          ...(skill.shared_apps ?? []),
          ...(skill.workflow?.target_engines ?? []),
          ...(matchedReg?.target_engines ?? []),
          ...(skill.engine_id ? [skill.engine_id] : []),
        ]),
      );

      // Filter engines to only apps the user has access to
      const allowedEngines = rawEngines.filter((eng) =>
        authorizedEngineIds.has(eng),
      );
      if (allowedEngines.length === 0) {
        continue;
      }

      if (seenIds.has(skill.skill_id)) {
        continue;
      }
      seenIds.add(skill.skill_id);

      const connectors =
        skill.workflow?.required_connectors?.length
          ? skill.workflow.required_connectors
          : matchedReg?.required_connectors ?? [];

      const cleanName = skill.display_name.trim().replace(/^\/+/, '');
      items.push({
        skill_id: skill.skill_id,
        display_name: cleanName,
        slash_command: `/${cleanName}`,
        instruction: skill.instruction || matchedReg?.instruction || '',
        target_engines: allowedEngines,
        required_connectors: connectors,
      });
    }

    return items;
  }, [skills, registrySkills, authorizedEngineIds]);

  const filteredSkills = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    return normalizedSkills.filter((skill) => {
      if (
        selectedEngineId &&
        !skill.target_engines.includes(selectedEngineId)
      ) {
        return false;
      }
      if (!needle) {
        return true;
      }
      const connectorNames = skill.required_connectors
        .map((c) => c.display_name)
        .join(' ');
      const searchable = [
        skill.skill_id,
        skill.slash_command,
        skill.display_name,
        connectorNames,
      ]
        .join(' ')
        .toLowerCase();
      return searchable.includes(needle);
    });
  }, [normalizedSkills, selectedEngineId, searchQuery]);

  function handleCopySlashCommand(slashCommand: string, skillId: string): void {
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(slashCommand);
    }
    setCopiedSkillId(skillId);
    window.setTimeout(() => setCopiedSkillId(null), 1500);
  }

  if (loading) {
    return (
      <div
        aria-label="Loading skills"
        className="mt-4 space-y-3"
      >
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="h-16 animate-pulse rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
          />
        ))}
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
            Select an authorized application to view its published AI skills,
            slash commands, required connectors, and SKILL.md definitions.
          </p>
        </div>
      </div>

      {/* Top Toolbar: Authorized App Selector + Search + View Switcher */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800">
            <FolderGit2
              className="h-4 w-4 text-blue-600 dark:text-blue-400"
              aria-hidden="true"
            />
            <label
              htmlFor="skill-app-select"
              className="font-semibold text-slate-600 dark:text-slate-300"
            >
              Application:
            </label>
            <select
              id="skill-app-select"
              aria-label="Choose application"
              value={selectedEngineId}
              onChange={(e) => setSelectedEngineId(e.target.value)}
              className="bg-transparent font-mono text-xs font-semibold text-slate-900 focus:outline-none dark:text-white"
            >
              <option
                value=""
                className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white"
              >
                All Authorized Apps ({userApps.length})
              </option>
              {userApps.map((app) => (
                <option
                  key={app.engine_id}
                  value={app.engine_id}
                  className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white"
                >
                  {app.display_name} ({app.engine_id})
                </option>
              ))}
            </select>
          </div>

          <div className="relative min-w-[220px]">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter skills..."
              aria-label="Search skills"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pr-3 pl-8 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
        </div>

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

      {filteredSkills.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <Sparkles className="mx-auto h-10 w-10 text-slate-400" />
          <h3 className="mt-3 text-base font-semibold text-slate-900 dark:text-white">
            No skills found for the selected application
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Choose another authorized application or clear the search filter.
          </p>
        </div>
      ) : viewMode === 'list' ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs dark:divide-slate-800">
              <thead className="bg-slate-50 font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Skill ID</th>
                  <th className="px-4 py-3">Slash Command</th>
                  <th className="px-4 py-3">Required Connector</th>
                  <th className="px-4 py-3 text-right">SKILL.md</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredSkills.map((skill) => (
                  <tr
                    key={skill.skill_id}
                    className="transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                  >
                    <td className="px-4 py-3.5 font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {skill.skill_id}
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        type="button"
                        onClick={() =>
                          handleCopySlashCommand(
                            skill.slash_command,
                            skill.skill_id,
                          )
                        }
                        title="Copy slash command"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 font-mono text-xs font-semibold text-indigo-800 transition hover:bg-indigo-100 dark:border-indigo-900/60 dark:bg-indigo-950/70 dark:text-indigo-200"
                      >
                        <Terminal className="h-3 w-3" aria-hidden="true" />
                        <span>{skill.slash_command}</span>
                        <Copy className="h-3 w-3 opacity-70" aria-hidden="true" />
                        {copiedSkillId === skill.skill_id && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-300">
                            Copied!
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3.5">
                      {skill.required_connectors.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {skill.required_connectors.map((c) => (
                            <span
                              key={c.connector_id}
                              className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            >
                              <Plug className="h-3 w-3 text-indigo-500" aria-hidden="true" />
                              {c.display_name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400">None</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedSkill(skill)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-blue-500 hover:bg-blue-50/50 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-blue-400"
                      >
                        <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>View SKILL.md</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSkills.map((skill) => (
            <article
              key={skill.skill_id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition hover:border-blue-500/60 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="space-y-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Skill ID
                  </p>
                  <p className="mt-0.5 truncate font-mono text-xs font-bold text-slate-900 dark:text-white">
                    {skill.skill_id}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Slash Command
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopySlashCommand(
                        skill.slash_command,
                        skill.skill_id,
                      )
                    }
                    className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 font-mono text-xs font-semibold text-indigo-800 dark:border-indigo-900/60 dark:bg-indigo-950/70 dark:text-indigo-200"
                  >
                    <Terminal className="h-3 w-3" aria-hidden="true" />
                    <span>{skill.slash_command}</span>
                    <Copy className="h-3 w-3 opacity-70" aria-hidden="true" />
                  </button>
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Required Connector
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {skill.required_connectors.length > 0 ? (
                      skill.required_connectors.map((c) => (
                        <span
                          key={c.connector_id}
                          className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        >
                          <Plug className="h-3 w-3 text-indigo-500" aria-hidden="true" />
                          {c.display_name}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400">None</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 border-t border-slate-100 pt-3.5 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedSkill(skill)}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs transition hover:bg-blue-700"
                >
                  <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>View SKILL.md</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {selectedSkill && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`SKILL.md for ${selectedSkill.skill_id}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
        >
          <div className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <div>
                <h3 className="font-mono text-base font-bold text-slate-900 dark:text-white">
                  {selectedSkill.skill_id}
                </h3>
                <p className="mt-0.5 font-mono text-xs text-indigo-600 dark:text-indigo-400">
                  {selectedSkill.slash_command} • SKILL.md
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
            <div className="overflow-y-auto p-6">
              <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-100 dark:border-slate-800">
                {selectedSkill.instruction}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
