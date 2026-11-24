/**
 * Unit and integration tests for the Standalone User Portal codebase.
 * Verifies that the User Portal bundle renders only user sections and
 * completely excludes administrative governance, IaC, and sync trigger actions.
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as apiClient from '../api/client';
import { App } from '../App';
import { CatalogApplication } from '../types/catalog';

const SAMPLE_APPS: CatalogApplication[] = [
  {
    engine_id: 'ge-enterprise-search',
    display_name: 'Gemini Enterprise Knowledge Search',
    description: 'Search across internal enterprise documents.',
    category: 'Productivity',
    department: 'Organization-Wide',
    tags: ['search', 'workspace'],
    icon_name: 'Search',
    launch_url: 'https://vertexaisearch.cloud.google.com/home',
    location: 'global',
    solution_type: 'SOLUTION_TYPE_SEARCH',
    allowed_roles: ['*'],
    featured: true,
  },
];

describe('Standalone User Portal Codebase', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.sessionStorage.setItem('ge_user_auth_token', 'test-user-session');
    vi.spyOn(apiClient, 'fetchCurrentUser').mockResolvedValue({
      email: 'employee@mohanrajs.demo.altostrat.com',
      user_id: 'emp-001',
      roles: ['employee'],
      groups: ['hr-app-users@mohanrajs.demo.altostrat.com'],
      auth_source: 'session_token',
    });
    vi.spyOn(apiClient, 'fetchApps').mockResolvedValue({
      items: SAMPLE_APPS,
      total: 1,
      categories: ['Productivity'],
      departments: ['Organization-Wide'],
      groups: ['hr-app-users@mohanrajs.demo.altostrat.com'],
    });
    vi.spyOn(apiClient, 'fetchSkills').mockResolvedValue({
      items: [],
      total: 0,
      pending_review_count: 0,
      approved_count: 0,
      draft_count: 0,
    });
    vi.spyOn(apiClient, 'fetchRegistrySkills').mockResolvedValue({
      items: [],
      total: 0,
    });
    vi.spyOn(apiClient, 'fetchAgents').mockResolvedValue([]);
    vi.spyOn(apiClient, 'fetchMcpServers').mockResolvedValue([]);
  });

  it('renders all user modules and completely excludes admin governance and IaC panels', async () => {
    render(<App />);

    const titles = await screen.findAllByText('GE App Hub');
    expect(titles.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Skill Registry')).toBeInTheDocument();
    expect(screen.getByText('Agent Registry')).toBeInTheDocument();
    expect(screen.getByText('Connector/MCP')).toBeInTheDocument();

    // Verify zero administrative presence
    expect(screen.queryByText('Skill Governance')).not.toBeInTheDocument();
    expect(screen.queryByText('Infra Provisioning')).not.toBeInTheDocument();
    expect(screen.queryByText('Admin Console')).not.toBeInTheDocument();
    expect(screen.queryByText('Admin & Governance')).not.toBeInTheDocument();
  });
});
