/**
 * User Portal Component: Dedicated end-user experience for Gemini Enterprise AppHub.
 * Exclusively provides access to App Catalog, Published Skill Registry, Agent Registry,
 * and Connectors/MCP without administrative clutter.
 */

import React, { useMemo, useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { AgentsView } from './AgentsView';
import { CatalogGrid } from './CatalogGrid';
import { McpServersView } from './McpServersView';
import { SearchFilterBar } from './SearchFilterBar';
import { Sidebar } from './Sidebar';
import { SkillsSection } from './SkillsSection';
import {
  AgentSummary,
  CatalogApplication,
  DiscoveredSkill,
  McpServerSummary,
  PortalSection,
  SkillRegistryItem,
  UserContext,
  WorkflowEmailItem,
} from '../types/catalog';

export interface UserPortalProps {
  user?: UserContext | null;
  apps: CatalogApplication[];
  agents: AgentSummary[];
  mcpServers: McpServerSummary[];
  skills: DiscoveredSkill[];
  registrySkills: SkillRegistryItem[];
  workflowEmails: WorkflowEmailItem[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  categories?: string[];
  departments?: string[];
  groups?: string[];
  pendingSkillsCount?: number;
  approvedSkillsCount?: number;
}

function filterApps(
  apps: CatalogApplication[],
  searchQuery: string,
  category: string,
  department: string,
  tag: string,
  group: string,
): CatalogApplication[] {
  const needle = searchQuery.trim().toLowerCase();
  return apps.filter((app) => {
    if (category && app.category !== category) return false;
    if (department && app.department !== department) return false;
    if (tag && !app.tags.includes(tag)) return false;
    if (group) {
      const normalizedRoles = app.allowed_roles.map((r) => r.toLowerCase());
      const cleanGrp = group.toLowerCase().replace(/^group:/, '');
      if (
        !normalizedRoles.includes(cleanGrp) &&
        !normalizedRoles.includes(`group:${cleanGrp}`)
      ) {
        return false;
      }
    }
    if (!needle) return true;
    const searchable = [
      app.display_name,
      app.description,
      app.category,
      app.department,
      app.engine_id,
      ...app.tags,
    ]
      .join(' ')
      .toLowerCase();
    return searchable.includes(needle);
  });
}

export function UserPortal({
  apps,
  agents,
  mcpServers,
  skills,
  registrySkills,
  workflowEmails,
  loading,
  error,
  onRetry,
  categories = [],
  departments = [],
  groups = [],
  pendingSkillsCount = 0,
  approvedSkillsCount,
}: UserPortalProps): React.ReactElement {
  const [activeSection, setActiveSection] = useState<PortalSection>('apps');
  const [appsViewMode, setAppsViewMode] = useState<'grid' | 'list'>('list');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<string>('');

  const filteredApps = useMemo(
    () =>
      filterApps(
        apps,
        searchQuery,
        selectedCategory,
        selectedDepartment,
        selectedTag,
        selectedGroup,
      ),
    [
      apps,
      searchQuery,
      selectedCategory,
      selectedDepartment,
      selectedTag,
      selectedGroup,
    ],
  );

  function handleClearFilters(): void {
    setSearchQuery('');
    setSelectedCategory('');
    setSelectedDepartment('');
    setSelectedTag('');
    setSelectedGroup('');
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      {/* User Sidebar: Strictly User Sections */}
      <Sidebar
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        appsCount={apps.length}
        skillsCount={skills.length}
        pendingSkillsCount={pendingSkillsCount}
        approvedSkillsCount={approvedSkillsCount ?? (registrySkills.length || skills.length)}
        agentsCount={agents.length || 1}
        mcpCount={mcpServers.length || 7}
        isAdmin={false}
      />

      <div className="min-w-0 flex-1">
        {error && (
          <div
            role="alert"
            className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-200"
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-semibold">
                  Unable to load application catalog
                </p>
                <p className="text-xs opacity-90">{error}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-red-700"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Retry
            </button>
          </div>
        )}

        {activeSection === 'apps' && (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                GE App Hub
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Browse, filter, and launch Gemini Enterprise agents and search
                applications authorized for your Cloud Identity groups.
              </p>
            </div>

            <SearchFilterBar
              searchQuery={searchQuery}
              selectedCategory={selectedCategory}
              selectedDepartment={selectedDepartment}
              selectedTag={selectedTag}
              selectedGroup={selectedGroup}
              categories={categories}
              departments={departments}
              groups={groups}
              totalCount={apps.length}
              filteredCount={filteredApps.length}
              onSearchChange={setSearchQuery}
              onCategoryChange={setSelectedCategory}
              onDepartmentChange={setSelectedDepartment}
              onGroupChange={setSelectedGroup}
              onClearFilters={handleClearFilters}
              viewMode={appsViewMode}
              onViewModeChange={setAppsViewMode}
            />

            <CatalogGrid
              apps={filteredApps}
              loading={loading}
              onResetFilters={handleClearFilters}
              onSelectTag={(tag) =>
                setSelectedTag((prev) => (prev === tag ? '' : tag))
              }
              viewMode={appsViewMode}
            />
          </>
        )}

        {activeSection === 'skills' && (
          <SkillsSection
            mode="user-hub"
            skills={skills}
            userApps={apps}
            availableAgents={agents}
            isAdmin={false}
            pendingReviewCount={0}
            approvedCount={registrySkills.length || skills.length}
            registrySkills={registrySkills}
            workflowEmails={workflowEmails}
            loading={loading}
          />
        )}

        {activeSection === 'agents' && (
          <AgentsView agents={agents} loading={loading} />
        )}

        {activeSection === 'mcp' && (
          <McpServersView servers={mcpServers} loading={loading} />
        )}
      </div>
    </div>
  );
}
