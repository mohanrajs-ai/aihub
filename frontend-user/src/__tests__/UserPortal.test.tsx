/**
 * Unit and integration tests for the Standalone User Portal codebase.
 * Verifies that the User Portal bundle renders only user sections,
 * shows no pre-populated accounts on the login page, redirects to Google Login
 * with the entered email ID, and completely excludes admin panels.
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
      items: [
        {
          skill_id: 'ge-enterprise-search:daily-brief',
          resource_name: 'projects/p/locations/global/engines/ge-enterprise-search/skills/daily-brief',
          engine_id: 'ge-enterprise-search',
          app_display_name: 'Gemini Enterprise Knowledge Search',
          display_name: 'daily-brief',
          description: 'Generates daily executive summary.',
          instruction: '# SKILL.md\nDaily brief instructions.',
          gcs_uri: '',
          owner_email: 'owner@example.com',
          state: 'ENABLED',
          sharing_scope: 'ORGANIZATION',
          sharing_state: 'SHARED',
          has_active_iam_proposals: false,
          review_status: 'APPROVED',
          iam_proposals: [],
          shared_principals: [],
          subfiles: [],
          create_time: '',
          update_time: '',
          workflow: {
            workflow_id: 'wf-1',
            skill_id: 'ge-enterprise-search:daily-brief',
            engine_id: 'ge-enterprise-search',
            skill_display_name: 'daily-brief',
            owner_email: 'owner@example.com',
            current_stage: 'PUBLISHED',
            status: 'COMPLETED',
            eval_score: 96,
            eval_status: 'PASSED',
            eval_report: {},
            infosec_risk_level: 'LOW',
            infosec_status: 'PASSED',
            infosec_report: {},
            approval_status: 'APPROVED',
            approved_by: 'infosec@example.com',
            approval_notes: '',
            registry_id: 'reg-1',
            shared_in_ge: true,
            shared_principals: [],
            required_connectors: [
              { connector_id: 'jira-cloud', display_name: 'Atlassian Jira' },
            ],
            target_engines: ['ge-enterprise-search'],
          },
        },
        {
          skill_id: 'unauthorized-app:secret-skill',
          resource_name: 'projects/p/locations/global/engines/unauthorized-app/skills/secret-skill',
          engine_id: 'unauthorized-app',
          app_display_name: 'Unauthorized App',
          display_name: 'secret-skill',
          description: 'Should not appear because user has no access to unauthorized-app.',
          instruction: '# SKILL.md\nSecret',
          gcs_uri: '',
          owner_email: 'owner@example.com',
          state: 'ENABLED',
          sharing_scope: 'RESTRICTED',
          sharing_state: 'SHARED',
          has_active_iam_proposals: false,
          review_status: 'APPROVED',
          iam_proposals: [],
          shared_principals: [],
          subfiles: [],
          create_time: '',
          update_time: '',
        },
      ],
      total: 2,
      pending_review_count: 0,
      approved_count: 2,
      draft_count: 0,
    });
    vi.spyOn(apiClient, 'fetchRegistrySkills').mockResolvedValue({
      items: [],
      total: 0,
    });
    vi.spyOn(apiClient, 'fetchAgents').mockResolvedValue([]);
    vi.spyOn(apiClient, 'fetchMcpServers').mockResolvedValue([]);
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

    // Verify updated Tech-M copy and removal of footer policy text & user list
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
    expect(
      screen.queryByText(/mohanraj@mohanrajs\.demo\.altostrat\.com/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/pradeepg@mohanrajs\.demo\.altostrat\.com/i),
    ).not.toBeInTheDocument();

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

  it('renders all user modules and completely excludes admin governance and IaC panels', async () => {
    window.sessionStorage.setItem('ge_user_auth_token', 'test-user-session');
    render(<App />);

    const titles = await screen.findAllByText('GE App Hub');
    expect(titles.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Skill Registry')).toBeInTheDocument();
    expect(screen.getByText('Agent Registry')).toBeInTheDocument();
    expect(screen.getByText('Connector/MCP')).toBeInTheDocument();

    // Verify application table columns: APP ID, APP Name, Group, Location, URL
    expect(screen.getByText('APP ID')).toBeInTheDocument();
    expect(screen.getByText('APP Name')).toBeInTheDocument();
    expect(screen.getByText('Group')).toBeInTheDocument();
    expect(screen.getByText('Location')).toBeInTheDocument();
    expect(screen.getByText('URL')).toBeInTheDocument();
    expect(screen.getByText('ge-enterprise-search')).toBeInTheDocument();
    expect(
      screen.getByText('https://vertexaisearch.cloud.google.com/home'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Category & Department'),
    ).not.toBeInTheDocument();

    // Verify zero administrative presence and no persona simulator in user menu
    expect(screen.queryByText('Skill Governance')).not.toBeInTheDocument();
    expect(screen.queryByText('Infra Provisioning')).not.toBeInTheDocument();
    expect(screen.queryByText('Admin Console')).not.toBeInTheDocument();
    expect(screen.queryByText('Admin & Governance')).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Toggle user profile menu'));
    expect(screen.getByText('Sign Out')).toBeInTheDocument();
    expect(
      screen.queryByText(/Simulate Cloud Identity Persona/i),
    ).not.toBeInTheDocument();

    // Navigate to Skill Registry and verify app filter & 4 skill fields
    fireEvent.click(screen.getByLabelText('Skill Registry'));
    expect(await screen.findByText('Skill ID')).toBeInTheDocument();
    expect(screen.getByText('Slash Command')).toBeInTheDocument();
    expect(screen.getByText('Required Connector')).toBeInTheDocument();
    expect(screen.getByText('SKILL.md')).toBeInTheDocument();
    expect(
      screen.getByText('ge-enterprise-search:daily-brief'),
    ).toBeInTheDocument();
    expect(screen.getByText('/daily-brief')).toBeInTheDocument();
    expect(screen.getByText('Atlassian Jira')).toBeInTheDocument();
    expect(screen.getByText('View SKILL.md')).toBeInTheDocument();
    // Skill belonging to an app the user does not have access to is hidden
    expect(
      screen.queryByText('unauthorized-app:secret-skill'),
    ).not.toBeInTheDocument();
  });
});
