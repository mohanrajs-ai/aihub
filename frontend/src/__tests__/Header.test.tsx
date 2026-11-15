/**
 * Unit tests for the AppHub Header, ThemeContext, and API client.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  fetchApps,
  fetchAuthConfig,
  fetchCurrentUser,
  fetchSyncStatus,
  loginWithEmail,
  logoutUser,
  triggerSync,
} from '../api/client';
import { Header } from '../components/Header';
import { ThemeProvider } from '../context/ThemeContext';
import { UserContext } from '../types/catalog';

describe('Header & ThemeProvider', () => {
  const sampleUser: UserContext = {
    email: 'developer@enterprise.example.com',
    user_id: 'dev-user-001',
    roles: ['employee', 'engineering'],
    auth_source: 'mock_default',
  };

  it('renders Tech Mahindra logo, GE AI Hub top name, Cymbal project pill, and supports parameterized logo/brand overrides', () => {
    const onRoleChange = vi.fn();
    const { rerender } = render(
      <ThemeProvider>
        <Header
          user={sampleUser}
          activeDevRole="employee"
          onDevRoleChange={onRoleChange}
        />
      </ThemeProvider>,
    );

    expect(screen.getByText(/Tech Mahindra/i)).toBeInTheDocument();
    expect(screen.getByText('GE AI Hub')).toBeInTheDocument();
    const defaultLogo = screen.getByRole('img', { name: /Tech Mahindra Logo/i });
    expect(defaultLogo).toBeInTheDocument();
    expect(screen.getByText(/cymbal-app-514110/i)).toBeInTheDocument();
    expect(
      screen.getByText('developer@enterprise.example.com'),
    ).toBeInTheDocument();

    // Verify parameterized logo and brand props
    rerender(
      <ThemeProvider>
        <Header
          user={sampleUser}
          activeDevRole="employee"
          onDevRoleChange={onRoleChange}
          brandName="Custom AI Hub"
          orgName="Custom Partner"
          logoUrl="https://example.com/custom-logo.svg"
          logoAlt="Custom Partner Logo"
        />
      </ThemeProvider>,
    );
    expect(screen.getByText('Custom Partner')).toBeInTheDocument();
    expect(screen.getByText('Custom AI Hub')).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Custom Partner Logo' }),
    ).toHaveAttribute('src', 'https://example.com/custom-logo.svg');
  });

  it('toggles between light and dark theme when the theme button is clicked', () => {
    const onRoleChange = vi.fn();
    render(
      <ThemeProvider>
        <Header
          user={sampleUser}
          activeDevRole="employee"
          onDevRoleChange={onRoleChange}
        />
      </ThemeProvider>,
    );

    const toggleButton = screen.getByRole('button', {
      name: /toggle color theme/i,
    });
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    fireEvent.click(toggleButton);
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    fireEvent.click(toggleButton);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('calls onDevRoleChange when the local role switcher is changed', () => {
    const onRoleChange = vi.fn();
    render(
      <ThemeProvider>
        <Header
          user={sampleUser}
          activeDevRole="employee"
          onDevRoleChange={onRoleChange}
        />
      </ThemeProvider>,
    );

    const roleSelect = screen.getByLabelText(/preview role/i);
    fireEvent.change(roleSelect, { target: { value: 'admin' } });
    expect(onRoleChange).toHaveBeenCalledWith('admin');
  });

  it('opens user dropdown menu below project pill and renders Sign Out and Preview Role inside the user dropdown', () => {
    const onRoleChange = vi.fn();
    const onSignOut = vi.fn();
    render(
      <ThemeProvider>
        <Header
          user={{
            ...sampleUser,
            groups: ['hr-app-01-users@mohanrajs.altostrat.com'],
          }}
          activeDevRole="employee"
          onDevRoleChange={onRoleChange}
          onSignOut={onSignOut}
        />
      </ThemeProvider>,
    );

    const userMenuBtn = screen.getByRole('button', {
      name: /toggle user profile and role menu/i,
    });
    expect(userMenuBtn).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(userMenuBtn);
    expect(userMenuBtn).toHaveAttribute('aria-expanded', 'true');

    const signOutBtn = screen.getByRole('button', { name: /sign out/i });
    fireEvent.click(signOutBtn);
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  it('omits DB sync status badge from the user portal header', () => {
    const onRoleChange = vi.fn();
    const onSyncNow = vi.fn();
    render(
      <ThemeProvider>
        <Header
          user={sampleUser}
          activeDevRole="employee"
          onDevRoleChange={onRoleChange}
          syncStatus={{
            sync_enabled: true,
            sync_interval_seconds: 900,
            database_dialect: 'postgresql',
            total_apps: 7,
            total_groups: 6,
            total_users: 2,
            total_memberships: 8,
            last_run: {
              id: 1,
              trigger_source: 'scheduled',
              status: 'completed',
              apps_synced: 7,
              groups_synced: 6,
              memberships_synced: 8,
            },
          }}
          syncing={false}
          onSyncNow={onSyncNow}
        />
      </ThemeProvider>,
    );

    expect(screen.queryByText(/7 Apps • 6 Groups/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /sync database now/i }),
    ).not.toBeInTheDocument();
  });
});

describe('API Client', () => {
  it('fetches current user and catalog apps with role header', async () => {
    const mockFetch = vi.fn();
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          email: 'alice@enterprise.example.com',
          user_id: 'alice',
          roles: ['admin'],
          auth_source: 'dev_override',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [],
          total: 0,
          categories: ['Productivity'],
          departments: ['General'],
        }),
      });
    vi.stubGlobal('fetch', mockFetch);

    const user = await fetchCurrentUser('admin');
    expect(user.email).toBe('alice@enterprise.example.com');

    const catalog = await fetchApps({ devRole: 'admin', q: 'search' });
    expect(catalog.total).toBe(0);
    expect(mockFetch).toHaveBeenCalledTimes(2);

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          google_client_id: '',
          suggested_users: [
            {
              email: 'mohanraj@mohanrajs.altostrat.com',
              label: 'Mohanraj',
              description: 'HR & Ops',
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: 'signed-token-123',
          user: {
            email: 'mohanraj@mohanrajs.altostrat.com',
            user_id: 'mohanraj@mohanrajs.altostrat.com',
            roles: ['employee'],
            groups: ['hr-app-01-users@mohanrajs.altostrat.com'],
            auth_source: 'session_token',
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'logged_out' }),
      });

    const authCfg = await fetchAuthConfig();
    expect(authCfg.suggested_users).toHaveLength(1);

    const loginRes = await loginWithEmail('mohanraj@mohanrajs.altostrat.com');
    expect(loginRes.token).toBe('signed-token-123');

    await logoutUser();

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sync_enabled: true,
          sync_interval_seconds: 900,
          database_dialect: 'postgresql',
          total_apps: 7,
          total_groups: 6,
          total_users: 2,
          total_memberships: 8,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 2,
          trigger_source: 'manual_api',
          status: 'completed',
          apps_synced: 7,
          groups_synced: 6,
          memberships_synced: 8,
        }),
      });

    const syncStat = await fetchSyncStatus();
    expect(syncStat.total_apps).toBe(7);

    const syncRun = await triggerSync();
    expect(syncRun.status).toBe('completed');

    vi.unstubAllGlobals();
  });

  it('throws descriptive error when API response is not ok', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });
    vi.stubGlobal('fetch', mockFetch);

    await expect(fetchCurrentUser()).rejects.toThrow(/500/);
    await expect(fetchApps()).rejects.toThrow(/500/);

    vi.unstubAllGlobals();
  });
});
