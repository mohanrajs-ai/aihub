/**
 * Standalone User Portal Root Component.
 * Pure end-user application for Gemini Enterprise AppHub.
 * Exclusively provides access to the GE App Hub catalog (Skills, Agents,
 * and Connectors/MCP are available directly inside each launched GE App).
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import {
  buildGoogleSsoLoginUrl,
  fetchAccessRequests,
  fetchApps,
  fetchCurrentUser,
  fetchRequestableApps,
  logoutUser,
  submitAccessRequest,
} from './api/client';
import { AntiGravityHubView } from './components/AntiGravityHubView';
import { CatalogGrid } from './components/CatalogGrid';
import { Header } from './components/Header';
import { LoginScreen } from './components/LoginScreen';
import { RequestAccessView } from './components/RequestAccessView';
import { SearchFilterBar } from './components/SearchFilterBar';
import { Sidebar } from './components/Sidebar';
import { ThemeProvider } from './context/ThemeContext';
import {
  AccessRequestCreatePayload,
  AccessRequestItem,
  CatalogApplication,
  PortalSection,
  UserContext,
} from './types/catalog';

const SESSION_TOKEN_KEY = 'ge_user_auth_token';

function isStandardOrPlusLicense(user: UserContext | null): boolean {
  const tier = (user?.license_type ?? 'standard').trim().toLowerCase();
  return (
    tier === 'standard' ||
    tier === 'plus' ||
    tier === 'gemini_enterprise_standard' ||
    tier === 'gemini_enterprise_plus'
  );
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

export function App(): React.ReactElement {
  const [authToken, setAuthToken] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const callbackToken = params.get('auth_token');
    if (callbackToken) {
      window.sessionStorage.setItem(SESSION_TOKEN_KEY, callbackToken);
      return callbackToken;
    }
    return window.sessionStorage.getItem(SESSION_TOKEN_KEY);
  });
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('auth_error');
  });
  const [user, setUser] = useState<UserContext | null>(null);

  const [activeSection, setActiveSection] = useState<PortalSection>('apps');
  const [apps, setApps] = useState<CatalogApplication[]>([]);
  const [allApps, setAllApps] = useState<CatalogApplication[]>([]);
  const [accessRequests, setAccessRequests] = useState<AccessRequestItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [appsViewMode, setAppsViewMode] = useState<'grid' | 'list'>('list');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('auth_token') || params.has('auth_error')) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const loadCatalogData = useCallback(async (token: string) => {
    setLoading(true);
    setError(null);
    try {
      const [userRes, catalogRes] = await Promise.all([
        fetchCurrentUser('employee', token),
        fetchApps({ devRole: 'employee', authToken: token }),
      ]);
      setUser(userRes);
      setApps(catalogRes.items);
      setCategories(catalogRes.categories);
      setDepartments(catalogRes.departments);
      setGroups(catalogRes.groups ?? userRes.groups ?? []);

      void fetchRequestableApps('employee', token)
        .then((reqCatalog) => {
          if (reqCatalog && Array.isArray(reqCatalog.items)) {
            setAllApps(reqCatalog.items);
          }
        })
        .catch(() => null);

      void fetchAccessRequests('employee', token)
        .then((reqs) => {
          if (Array.isArray(reqs)) {
            setAccessRequests(reqs);
          }
        })
        .catch(() => null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unexpected backend error';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authToken) {
      void loadCatalogData(authToken);
    }
  }, [authToken, loadCatalogData]);

  function handleLoginEmail(email: string): void {
    setAuthLoading(true);
    setAuthError(null);
    window.location.assign(buildGoogleSsoLoginUrl(email));
  }

  function handleSignOut(): void {
    void logoutUser();
    window.sessionStorage.removeItem(SESSION_TOKEN_KEY);
    setAuthToken(null);
    setUser(null);
    setApps([]);
    setAllApps([]);
    setAccessRequests([]);
    setGroups([]);
  }

  async function handleSubmitAccessRequest(
    payload: AccessRequestCreatePayload,
  ): Promise<void> {
    if (!authToken) return;
    try {
      const created = await submitAccessRequest(payload, 'employee', authToken);
      setAccessRequests((prev) => [
        ...prev.filter((item) => item.target_id !== created.target_id),
        created,
      ]);
    } catch {
      // Fallback optimistic state in test/offline mode
      setAccessRequests((prev) => [
        ...prev,
        {
          request_id: `req-${Date.now()}`,
          user_email: user?.email || 'employee@mohanrajs.demo.altostrat.com',
          request_type: payload.request_type,
          target_id: payload.target_id,
          target_name: payload.target_name,
          requested_group: payload.requested_group,
          justification: payload.justification,
          status: 'PENDING_APPROVAL',
          created_at: new Date().toISOString(),
        },
      ]);
    }
  }

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

  const showAntiGravityHub = useMemo(
    () => isStandardOrPlusLicense(user),
    [user],
  );

  return (
    <ThemeProvider>
      {!authToken ? (
        <LoginScreen
          loading={authLoading}
          error={authError}
          onLoginEmail={(email) => handleLoginEmail(email)}
          onLoginSsoPopup={() =>
            window.location.assign(buildGoogleSsoLoginUrl())
          }
        />
      ) : (
        <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
          <Header user={user} onSignOut={handleSignOut} />

          <div className="flex min-h-[calc(100vh-61px)] flex-col lg:flex-row">
            <Sidebar
              activeSection={activeSection}
              onSelectSection={setActiveSection}
              appsCount={apps.length}
              showAntiGravityHub={showAntiGravityHub}
              userLicenseType={user?.license_type || 'standard'}
            />

            <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
              <div className="mx-auto max-w-[1400px]">
                {error && (
                  <div
                    role="alert"
                    className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-200"
                  >
                    <div className="flex items-center gap-3">
                      <AlertCircle
                        className="h-5 w-5 shrink-0"
                        aria-hidden="true"
                      />
                      <div>
                        <p className="font-semibold">
                          Unable to load application catalog
                        </p>
                        <p className="text-xs opacity-90">{error}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void loadCatalogData(authToken)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-red-700"
                    >
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                      Retry
                    </button>
                  </div>
                )}

                {activeSection === 'antigravity' && showAntiGravityHub ? (
                  <AntiGravityHubView user={user} />
                ) : activeSection === 'request-access' ? (
                  <RequestAccessView
                    user={user}
                    authorizedApps={apps}
                    allApps={allApps}
                    accessRequests={accessRequests}
                    onSubmitRequest={handleSubmitAccessRequest}
                  />
                ) : (
                  <>
                    <div className="mb-6">
                      <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                        GE App Hub
                      </h2>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                        Browse, filter, and launch Gemini Enterprise applications
                        authorized for your Cloud Identity groups.
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
              </div>
            </main>
          </div>
        </div>
      )}
    </ThemeProvider>
  );
}
