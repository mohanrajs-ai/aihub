/**
 * Unit and integration tests for the Standalone User Portal codebase.
 * Verifies that the User Portal bundle renders GE App Hub, conditionally
 * displays the AntiGravity Hub tab for Standard/Plus licensed users with the
 * VS Code guide, hides AntiGravity Hub for unlicensed users, and excludes
 * Skills, Agents, MCP, and Admin panels.
 */

import { fireEvent, render, screen } from '@testing-library/react';
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
    window.sessionStorage.clear();
    vi.spyOn(apiClient, 'fetchCurrentUser').mockResolvedValue({
      email: 'employee@mohanrajs.demo.altostrat.com',
      user_id: 'emp-001',
      roles: ['employee'],
      groups: ['hr-app-users@mohanrajs.demo.altostrat.com'],
      license_type: 'standard',
      auth_source: 'session_token',
    });
    vi.spyOn(apiClient, 'fetchApps').mockResolvedValue({
      items: SAMPLE_APPS,
      total: 1,
      categories: ['Productivity'],
      departments: ['Organization-Wide'],
      groups: ['hr-app-users@mohanrajs.demo.altostrat.com'],
    });
    vi.spyOn(apiClient, 'fetchRequestableApps').mockResolvedValue({
      items: [
        ...SAMPLE_APPS,
        {
          engine_id: 'cymbal-finance-app',
          display_name: 'Cymbal Finance Assistant',
          description: 'Restricted finance app',
          category: 'Finance',
          department: 'Finance',
          tags: ['finance'],
          icon_name: 'BarChart3',
          launch_url: 'https://vertexaisearch.cloud.google.com/home/cid/cymbal-finance-app',
          location: 'global',
          solution_type: 'SOLUTION_TYPE_SEARCH',
          allowed_roles: ['group:ge-finance-users@mohanrajs.demo.altostrat.com'],
          featured: false,
        },
      ],
      total: 2,
      categories: ['Productivity', 'Finance'],
      departments: ['Organization-Wide', 'Finance'],
      groups: ['ge-finance-users@mohanrajs.demo.altostrat.com'],
    });
    vi.spyOn(apiClient, 'fetchAccessRequests').mockResolvedValue([]);
    vi.spyOn(apiClient, 'submitAccessRequest').mockImplementation(
      async (payload) => ({
        request_id: 'req-123',
        user_email: 'employee@mohanrajs.demo.altostrat.com',
        request_type: payload.request_type,
        target_id: payload.target_id,
        target_name: payload.target_name,
        requested_group: payload.requested_group || '',
        justification: payload.justification || '',
        status: 'PENDING_APPROVAL',
        created_at: '2026-11-24T21:55:00Z',
      }),
    );
  });

  it('shows no user list on the login screen and redirects to Google login with the entered email', () => {
    const assignMock = vi.fn();
    Object.defineProperty(window, 'location', {
      value: {
        ...window.location,
        origin: 'http://localhost:5173',
        search: '',
        pathname: '/',
        assign: assignMock,
      },
      writable: true,
    });

    render(<App />);

    expect(
      screen.getByText(
        'Enter your Tech-M email address to continue to Google Sign-In.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        'Protected by Google Cloud Identity & Engine IAM Policies',
      ),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Select Workspace Account')).not.toBeInTheDocument();

    const emailInput = screen.getByLabelText('Work Email Address');
    fireEvent.change(emailInput, {
      target: { value: 'pradeepg@mohanrajs.demo.altostrat.com' },
    });
    fireEvent.click(screen.getByText('Continue to Google Sign-In'));

    expect(assignMock).toHaveBeenCalledTimes(1);
    expect(assignMock.mock.calls[0][0]).toContain(
      '/api/v1/auth/google/login?email=pradeepg%40mohanrajs.demo.altostrat.com',
    );
  });

  it('shows AGY Hub tab for Standard/Plus users with Antigravity on VS Code, Antigravity CLI, and Antigravity App options', async () => {
    window.sessionStorage.setItem('ge_user_auth_token', 'test-user-session');
    render(<App />);

    const titles = await screen.findAllByText('GE App Hub');
    expect(titles.length).toBeGreaterThanOrEqual(1);

    // Verify application table columns: APP ID, APP Name, Group, Location, URL
    expect(screen.getByText('APP ID')).toBeInTheDocument();
    expect(screen.getByText('APP Name')).toBeInTheDocument();
    expect(screen.getByText('Group')).toBeInTheDocument();
    expect(screen.getByText('Location')).toBeInTheDocument();
    expect(screen.getByText('URL')).toBeInTheDocument();
    expect(screen.getByText('ge-enterprise-search')).toBeInTheDocument();

    // Verify Skills, Agents, Connectors/MCP, and Admin panels are excluded
    expect(screen.queryByText('Skill Registry')).not.toBeInTheDocument();
    expect(screen.queryByText('Agent Registry')).not.toBeInTheDocument();
    expect(screen.queryByText('Connector/MCP')).not.toBeInTheDocument();
    expect(screen.queryByText('Skill Governance')).not.toBeInTheDocument();

    // AGY Hub tab is visible for Standard/Plus license
    const agyTab = screen.getByLabelText('AGY Hub');
    expect(agyTab).toBeInTheDocument();
    fireEvent.click(agyTab);

    // Option 1 (default): Antigravity on VS Code
    expect(
      await screen.findByText('Quick Start: Setting Up Antigravity on VS Code'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: 'Antigravity on VS Code' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: 'Antigravity CLI' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: 'Antigravity App' }),
    ).toBeInTheDocument();

    // Switch to Option 2: Antigravity CLI
    fireEvent.click(screen.getByRole('tab', { name: 'Antigravity CLI' }));
    expect(
      await screen.findByText('Quick Start: Antigravity CLI (agy)'),
    ).toBeInTheDocument();

    // Switch to Option 3: Antigravity App
    fireEvent.click(screen.getByRole('tab', { name: 'Antigravity App' }));
    expect(
      await screen.findByText('Quick Start: Antigravity App (Desktop 2.0)'),
    ).toBeInTheDocument();

    // Navigate to Request Access tab and verify App & AGY License requests
    fireEvent.click(screen.getByLabelText('Request Access'));
    expect(await screen.findByText('Request AGY License')).toBeInTheDocument();
    expect(
      screen.getByText('Request Application Access'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Cymbal Finance Assistant'),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByLabelText('Request Access to Cymbal Finance Assistant'),
    );
    expect(await screen.findByText('Access Requested')).toBeInTheDocument();
  });

  it('hides AGY Hub tab when user license is none', async () => {
    vi.spyOn(apiClient, 'fetchCurrentUser').mockResolvedValue({
      email: 'guest@mohanrajs.demo.altostrat.com',
      user_id: 'guest-001',
      roles: ['employee'],
      groups: [],
      license_type: 'none',
      auth_source: 'session_token',
    });
    window.sessionStorage.setItem('ge_user_auth_token', 'test-guest-session');
    render(<App />);

    await screen.findAllByText('GE App Hub');
    expect(screen.queryByLabelText('AGY Hub')).not.toBeInTheDocument();
  });
});
