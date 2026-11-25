/**
 * Unit and integration tests for the Standalone Admin Console codebase.
 * Verifies that the Admin Console bundle enforces administrative access guards
 * and renders Skill Governance Studio, Provisioning Studio, Sync, and Access Matrix.
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as apiClient from '../api/client';
import { App } from '../App';

describe('Standalone Admin Console Codebase', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.sessionStorage.setItem('ge_admin_auth_token', 'test-admin-session');
    vi.spyOn(apiClient, 'fetchApps').mockResolvedValue({
      items: [],
      total: 0,
      categories: [],
      departments: [],
      groups: [],
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
    vi.spyOn(apiClient, 'fetchWorkflowNotifications').mockResolvedValue({
      items: [],
      total: 0,
    });
    vi.spyOn(apiClient, 'fetchProvisioningJobs').mockResolvedValue({
      items: [],
      total: 0,
      active_workspace_locks: [],
    });
    vi.spyOn(apiClient, 'fetchSyncStatus').mockResolvedValue({
      sync_enabled: true,
      sync_interval_seconds: 900,
      database_dialect: 'sqlite',
      total_apps: 6,
      total_groups: 2,
      total_users: 5,
      total_memberships: 5,
      last_run: {
        id: 1,
        trigger_source: 'startup',
        status: 'completed',
        apps_synced: 6,
        groups_synced: 2,
        memberships_synced: 5,
      },
    });
    vi.spyOn(apiClient, 'fetchAgents').mockResolvedValue([]);
  });

  it('blocks unprivileged accounts with Administrator Role Required guard', async () => {
    vi.spyOn(apiClient, 'fetchCurrentUser').mockResolvedValue({
      email: 'regular-employee@mohanrajs.demo.altostrat.com',
      user_id: 'emp-001',
      roles: ['employee'],
      auth_source: 'session_token',
    });

    render(<App />);

    expect(
      await screen.findByText('Administrator Role Required'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Access Restricted — Gemini Enterprise Admin Console/i),
    ).toBeInTheDocument();
  });

  it('renders all administrative studios for authorized admin users', async () => {
    vi.spyOn(apiClient, 'fetchCurrentUser').mockResolvedValue({
      email: 'admin@mohanrajs.demo.altostrat.com',
      user_id: 'admin-001',
      roles: ['admin', 'employee'],
      auth_source: 'session_token',
    });

    render(<App />);

    expect(
      await screen.findByText('Skill Governance Studio'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Infra Provisioning Studio'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Catalog & Identity Sync'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Access & Roles Overview'),
    ).toBeInTheDocument();
  });
});
