/**
 * Unit and integration tests for the Standalone User Portal codebase.
 * Verifies that the User Portal bundle renders only GE App Hub,
 * shows no pre-populated accounts on the login page, redirects to Google Login
 * with the entered email ID, and completely excludes Skills, Agents, MCP, and Admin panels.
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

  it('renders only GE App Hub and excludes Skills, Agents, Connectors/MCP, and Admin panels', async () => {
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
    expect(
      screen.getByText('https://vertexaisearch.cloud.google.com/home'),
    ).toBeInTheDocument();

    // Verify Skills, Agents, Connectors/MCP, and Admin panels are excluded
    expect(screen.queryByText('Skill Registry')).not.toBeInTheDocument();
    expect(screen.queryByText('Agent Registry')).not.toBeInTheDocument();
    expect(screen.queryByText('Connector/MCP')).not.toBeInTheDocument();
    expect(screen.queryByText('Skill Governance')).not.toBeInTheDocument();
    expect(screen.queryByText('Infra Provisioning')).not.toBeInTheDocument();
    expect(screen.queryByText('Admin Console')).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Toggle user profile menu'));
    expect(screen.getByText('Sign Out')).toBeInTheDocument();
    expect(
      screen.queryByText(/Simulate Cloud Identity Persona/i),
    ).not.toBeInTheDocument();
  });
});
