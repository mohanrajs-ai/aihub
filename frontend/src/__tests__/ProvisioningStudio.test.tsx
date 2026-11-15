import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProvisioningStudio } from '../components/ProvisioningStudio';
import { ProvisioningJobItem } from '../types/catalog';

const SAMPLE_PENDING_JOB: ProvisioningJobItem = {
  job_id: 'prov-12345abcde',
  stack_type: 'GE_APP',
  title: 'GE App: HR Benefits Assistant (global)',
  workspace_key: 'app-global-hr-benefits-assistant',
  state_backend_type: 'GCS_REMOTE',
  state_bucket: 'mohandemo-tfstate',
  state_prefix: 'gemini-enterprise/apps/global/hr-benefits-assistant',
  execution_mode: 'PLAN_AND_WAIT',
  status: 'PENDING_APPROVAL',
  initiated_by: 'admin@mohanrajs.altostrat.com',
  approved_by: '',
  sanitized_config: {
    ge_app_id: 'hr-benefits-assistant',
    m365_client_secret: '***REDACTED***',
  },
  plan_summary: '[TERRAFORM] plan complete',
  log_lines: [
    "[PLAN] Workspace='app-global-hr-benefits-assistant'",
    '[GATE] Terraform Plan & REST Dry-Run complete. Awaiting Admin Approval before Apply.',
  ],
  outputs: {},
};

describe('ProvisioningStudio', () => {
  it('renders Terraform best-practice guardrails, 3 stack tabs, and approves pending plan', async () => {
    const onProvisionGeApp = vi.fn().mockResolvedValue(undefined);
    const onProvisionIdentity = vi.fn().mockResolvedValue(undefined);
    const onProvisionM365 = vi.fn().mockResolvedValue(undefined);
    const onApproveJob = vi.fn().mockResolvedValue(undefined);
    const onRejectJob = vi.fn().mockResolvedValue(undefined);

    render(
      <ProvisioningStudio
        jobs={[SAMPLE_PENDING_JOB]}
        activeWorkspaceLocks={['app-global-hr-benefits-assistant']}
        existingApps={[]}
        onProvisionGeApp={onProvisionGeApp}
        onProvisionIdentity={onProvisionIdentity}
        onProvisionM365={onProvisionM365}
        onApproveJob={onApproveJob}
        onRejectJob={onRejectJob}
      />,
    );

    expect(
      screen.getByText(/Self-Service GE App, WIF Identity & M365 Automation/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Active Workspace Locks: 1/i),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/Workspace: app-global-hr-benefits-assistant/i)
        .length,
    ).toBeGreaterThanOrEqual(2);

    // Submit Stack 02 GE App Plan
    fireEvent.click(
      screen.getByRole('button', {
        name: /Run Stack 02: GE App Terraform Plan/i,
      }),
    );
    await waitFor(() => {
      expect(onProvisionGeApp).toHaveBeenCalledTimes(1);
    });

    // Switch to Stack 01 and Stack 03 tabs
    fireEvent.click(
      screen.getByRole('button', {
        name: /Stack 01: Identity & WIF/i,
      }),
    );
    expect(
      screen.getByText(/Entra ID to Cloud Identity Sync & SAML\/WIF SSO/i),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', {
        name: /Stack 03: M365 Connectors/i,
      }),
    );
    expect(
      screen.getByText(/Provision Microsoft 365 Federated Connectors/i),
    ).toBeInTheDocument();

    // Approve the PENDING_APPROVAL Terraform Plan
    fireEvent.click(
      screen.getByRole('button', { name: /Approve & Apply Plan/i }),
    );
    await waitFor(() => {
      expect(onApproveJob).toHaveBeenCalledWith('prov-12345abcde');
    });
  });
});
