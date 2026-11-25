/**
 * Expandable Search and multi-faceted filter bar with Card/List view switcher
 * for the Gemini Enterprise AppHub catalog.
 */

import React, { useState } from 'react';
import {
  Building2,
  ChevronDown,
  ChevronUp,
  Filter,
  LayoutGrid,
  List,
  Search,
  Users,
  X,
} from 'lucide-react';

export interface SearchFilterBarProps {
  searchQuery: string;
  selectedCategory: string;
  selectedDepartment: string;
  selectedTag: string;
  selectedGroup?: string;
  categories: string[];
  departments: string[];
  groups?: string[];
  totalCount: number;
  filteredCount: number;
  onSearchChange: (value: string) => void;
  onCategoryChange: (category: string) => void;
  onDepartmentChange: (department: string) => void;
  onGroupChange?: (group: string) => void;
  onClearFilters: () => void;
  viewMode?: 'grid' | 'list';
  onViewModeChange?: (mode: 'grid' | 'list') => void;
}

/**
 * Renders a compact toolbar with an expandable search/filter drawer and
 * a Card View (current view) / List View toggle.
 */
export function SearchFilterBar({
  searchQuery,
  selectedCategory,
  selectedDepartment,
  selectedTag,
  selectedGroup = '',
  categories,
  departments,
  groups = [],
  totalCount,
  filteredCount,
  onSearchChange,
  onCategoryChange,
  onDepartmentChange,
  onGroupChange,
  onClearFilters,
  viewMode = 'list',
  onViewModeChange,
}: SearchFilterBarProps): React.ReactElement {
  const [isSearchExpanded, setIsSearchExpanded] = useState<boolean>(false);

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
      selectedCategory ||
      selectedDepartment ||
      selectedTag ||
      selectedGroup,
  );

  return (
    <section
      aria-label="Search and filter applications"
      className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900"
    >
      {/* Compact Top Toolbar: Expandable Search Button + Count Summary + Card/List View Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsSearchExpanded((prev) => !prev)}
            aria-expanded={isSearchExpanded}
            aria-label="Toggle search and filters"
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
              isSearchExpanded || hasActiveFilters
                ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
            }`}
          >
            <Search className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Search & Filters</span>
            {hasActiveFilters && (
              <span className="rounded-full bg-blue-600 px-1.5 py-0.2 text-[10px] font-bold text-white">
                Active
              </span>
            )}
            {isSearchExpanded ? (
              <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Clear Filters
            </button>
          )}

          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Showing{' '}
            <span className="font-semibold text-slate-900 dark:text-white">
              {filteredCount}
            </span>{' '}
            of{' '}
            <span className="font-semibold text-slate-900 dark:text-white">
              {totalCount}
            </span>{' '}
            applications
          </p>
        </div>

        {/* View Mode Switcher: Card View (Current View) vs List View */}
        <div
          role="group"
          aria-label="View mode switcher"
          className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-100/80 p-0.5 dark:border-slate-700 dark:bg-slate-800"
        >
          <button
            type="button"
            aria-label="Card view"
            onClick={() => onViewModeChange?.('grid')}
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
            onClick={() => onViewModeChange?.('list')}
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

      {/* Expandable Search & Filter Drawer (Hidden by default until expanded or active) */}
      <div
        className={`transition-all duration-200 ${
          isSearchExpanded || hasActiveFilters
            ? 'mt-3.5 max-h-[600px] border-t border-slate-100 pt-3.5 opacity-100 dark:border-slate-800'
            : 'max-h-0 overflow-hidden opacity-0'
        }`}
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search applications by name, description, category, or tag..."
              aria-label="Search applications"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-4 pl-10 text-sm text-slate-900 placeholder-slate-400 transition focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800/80 dark:text-white dark:placeholder-slate-400 dark:focus:border-blue-400"
            />
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800/80">
            <Building2
              className="h-4 w-4 text-slate-400"
              aria-hidden="true"
            />
            <label htmlFor="department-filter" className="sr-only">
              Filter by department
            </label>
            <select
              id="department-filter"
              aria-label="Filter by department"
              value={selectedDepartment}
              onChange={(e) => onDepartmentChange(e.target.value)}
              className="bg-transparent text-sm font-medium text-slate-700 focus:outline-none dark:text-slate-200"
            >
              <option
                value=""
                className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white"
              >
                All Departments
              </option>
              {departments.map((dept) => (
                <option
                  key={dept}
                  value={dept}
                  className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white"
                >
                  {dept}
                </option>
              ))}
            </select>
          </div>
        </div>

        {groups.length > 0 && onGroupChange && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
            <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              Access Group:
            </span>
            <button
              type="button"
              onClick={() => onGroupChange('')}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                selectedGroup === ''
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              All My Groups
            </button>
            {groups.map((grp) => {
              const isActive = selectedGroup === grp;
              return (
                <button
                  key={grp}
                  type="button"
                  aria-label={`Filter by group ${grp}`}
                  onClick={() => onGroupChange(isActive ? '' : grp)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  {grp}
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            <Filter className="h-3.5 w-3.5" aria-hidden="true" />
            Category:
          </span>
          <button
            type="button"
            onClick={() => onCategoryChange('')}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              selectedCategory === ''
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                aria-label={`Filter by category ${cat}`}
                onClick={() => onCategoryChange(isActive ? '' : cat)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
