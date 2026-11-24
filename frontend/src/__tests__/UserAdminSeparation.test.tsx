/**
 * Unit tests verifying architectural separation between User Portal and Admin Console.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { AdminConsole } from '../components/AdminConsole';
import { Header } from '../components/Header';
import { UserPortal } from '../components/UserPortal';
import { ThemeProvider } from '../context/ThemeContext';
import { CatalogApplication, UserContext } from '../types/catalog';

const MOCK_USER: UserContext = {
  email: 'employee@mohanrajs.demo.altostrat.com',
  user_id: 'emp-001',
  roles: ['employee'],
  groups: ['hr-app-users@mohanrajs.demo.altostrat.com'],
  auth_source: 'mock',
};

const MOCK_ADMIN: UserContext = {
  email: 'admin@mohanrajs.demo.altostrat.com',
  user_id: 'admin-001',
  roles: ['admin', 'it-admin', 'employee'],
  groups: ['ge-platform-admins@mohanrajs.demo.altostrat.com'],
  auth_source: 'mock',
};

const MOCK_APPS: CatalogApplication[] = [
  {
    engine_id: 'service-desk-app',
    display_name: 'IT Service Desk Assistant',
    description: 'Internal IT ticketing agent',
    category: 'IT & Support',
    department: 'Corporate IT',
    tags: ['it', 'service-desk'],
    icon_name: 'Cpu',
    launch_url: 'https://vertexaisearch.cloud.google.com/home',
    location: 'global',
    solution_type: 'SOLUTION_TYPE_SEARCH',
    allowed_roles: ['employee'],
    featured: true,
  },
];

describe('User Portal vs Admin Console Separation', () => {
  it('UserPortal renders only user sections and excludes administrative panels', () => {
    render(
      <ThemeProvider>
        <UserPortal
          user={MOCK_USER}
          apps={MOCK_APPS}
          agents={[]}
          mcpServers={[]}
          skills={[]}
          registrySkills={[]}
          workflowEmails={[]}
          loading={false}
          error={null}
          onRetry={vi.fn()}
        />
      </ThemeProvider>,
    );

    // Verify user sections exist
    expect(screen.getAllByText('GE App Hub').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Skill Registry')).toBeInTheDocument();
    expect(screen.getByText('Agent Registry')).toBeInTheDocument();
    expect(screen.getByText('Connector/MCP')).toBeInTheDocument();

    // Verify admin sections are NOT in the UserPortal
    expect(
      screen.queryByText('Skill Governance'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('Infra Provisioning'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('Admin & Governance'),
    ).not.toBeInTheDocument();
  });

  it('AdminConsole blocks non-admin users with an Access Denied guard', () => {
    const onReturnToUserPortal = vi.fn();
    render(
      <ThemeProvider>
        <AdminConsole
          user={MOCK_USER}
          isAdmin={false}
          apps={MOCK_APPS}
          agents={[]}
          skills={[]}
          registrySkills={[]}
          workflowEmails={[]}
          provisioningJobs={[]}
          activeWorkspaceLocks={[]}
          onApproveSkill={vi.fn()}
          onRejectSkill={vi.fn()}
          onProvisionGeApp={vi.fn()}
          onProvisionIdentity={vi.fn()}
          onProvisionM365={vi.fn()}
          onApproveJob={vi.fn()}
          onRejectJob={vi.fn()}
          onReturnToUserPortal={onReturnToUserPortal}
        />
      </ThemeProvider>,
    );

    expect(
      screen.getByText(/Administrator Role Required/i),
    ).toBeInTheDocument();
    const returnBtn = screen.getByRole('button', {
      name: /Return to User Portal/i,
    });
    expect(returnBtn).toBeInTheDocument();
    fireEvent.click(returnBtn);
    expect(onReturnToUserPortal).toHaveBeenCalled();
  });

  it('AdminConsole renders administrative navigation and governance for admin users', () => {
    render(
      <ThemeProvider>
        <AdminConsole
          user={MOCK_ADMIN}
          isAdmin={true}
          apps={MOCK_APPS}
          agents={[]}
          skills={[]}
          registrySkills={[]}
          workflowEmails={[]}
          provisioningJobs={[]}
          activeWorkspaceLocks={[]}
          onApproveSkill={vi.fn()}
          onRejectSkill={vi.fn()}
          onProvisionGeApp={vi.fn()}
          onProvisionIdentity={vi.fn()}
          onProvisionM365={vi.fn()}
          onApproveJob={vi.fn()}
          onRejectJob={vi.fn()}
        />
      </ThemeProvider>,
    );

    expect(screen.getByText('Skill Governance Studio')).toBeInTheDocument();
    expect(screen.getByText('Infra Provisioning Studio')).toBeInTheDocument();
    expect(screen.getByText('Catalog & Identity Sync')).toBeInTheDocument();
  });

  it('Header shows Portal Switcher only when user is admin', () => {
    const onSystemChange = vi.fn();

    // Render as standard employee
    const { rerender } = render(
      <ThemeProvider>
        <Header
          user={MOCK_USER}
          activeDevRole="employee"
          onDevRoleChange={vi.fn()}
          isAdmin={false}
          activeSystem="user"
          onSystemChange={onSystemChange}
        />
      </ThemeProvider>,
    );

    expect(screen.queryByText('Admin Console')).not.toBeInTheDocument();

    // Rerender as Admin
    rerender(
      <ThemeProvider>
        <Header
          user={MOCK_ADMIN}
          activeDevRole="admin"
          onDevRoleChange={vi.fn()}
          isAdmin={true}
          activeSystem="user"
          onSystemChange={onSystemChange}
        />
      </ThemeProvider>,
    );

    const adminBtn = screen.getByRole('button', { name: /Admin Console/i });
    expect(adminBtn).toBeInTheDocument();
    fireEvent.click(adminBtn);
    expect(onSystemChange).toHaveBeenCalledWith('admin');
  });
});
