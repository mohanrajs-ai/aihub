/**
 * Admin Self-Service Terraform & REST Provisioning Studio.
 * Implements Stack 01 (Identity & WIF), Stack 02 (GE App Instance), and
 * Stack 03 (Microsoft 365 Connectors) with Per-Instance Workspace Isolation,
 * Remote GCS State option, Zero-Disk Secret Injection, and Plan-Before-Apply Gates.
 */

import React, { useState } from 'react';
import {
  CheckCircle2,
  Cloud,
  Database,
  KeyRound,
  Lock,
  Play,
  Server,
  ShieldCheck,
  Sparkles,
  Terminal,
  XCircle,
} from 'lucide-react';
import {
  CatalogApplication,
  GeAppProvisionRequest,
  GePinnedAgentItem,
  IdentityProvisionRequest,
  M365ConnectorProvisionRequest,
  ProvisioningJobItem,
} from '../types/catalog';
import { publishPinnedGeAgent } from '../api/client';

export interface ProvisioningStudioProps {
  jobs: ProvisioningJobItem[];
  activeWorkspaceLocks: string[];
  existingApps: CatalogApplication[];
  onProvisionGeApp: (payload: GeAppProvisionRequest) => Promise<void>;
  onProvisionIdentity: (payload: IdentityProvisionRequest) => Promise<void>;
  onProvisionM365: (payload: M365ConnectorProvisionRequest) => Promise<void>;
  onApproveJob: (jobId: string, notes?: string) => Promise<void>;
  onRejectJob: (jobId: string, notes?: string) => Promise<void>;
}

type StackTab =
  | 'GE_APP'
  | 'IDENTITY_WIF'
  | 'M365_CONNECTORS'
  | 'PINNED_ORCHESTRATOR';

export function ProvisioningStudio({
  jobs,
  activeWorkspaceLocks,
  existingApps,
  onProvisionGeApp,
  onProvisionIdentity,
  onProvisionM365,
  onApproveJob,
  onRejectJob,
}: ProvisioningStudioProps): React.ReactElement {
  const [activeTab, setActiveTab] = useState<StackTab>('GE_APP');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(
    jobs[0]?.job_id ?? null,
  );

  // Stack 02: GE App Instance state
  const [geProjectId, setGeProjectId] = useState('mohandemo');
  const [geLocation, setGeLocation] = useState('global');
  const [geAppId, setGeAppId] = useState('hr-benefits-assistant');
  const [geDisplayName, setGeDisplayName] = useState('HR Benefits Assistant');
  const [geCompanyName, setGeCompanyName] = useState('Enterprise Corp');
  const [geStorageType, setGeStorageType] = useState('GCS');
  const [geIdentityType, setGeIdentityType] = useState('GSUITE');
  const [geAccessGroup, setGeAccessGroup] = useState(
    'hr-users@mohanrajs.altostrat.com',
  );
  const [geEnableM365, setGeEnableM365] = useState(true);
  const [tfStateBucket, setTfStateBucket] = useState('');
  const [executionMode, setExecutionMode] = useState<
    'PLAN_AND_WAIT' | 'DRY_RUN' | 'APPLY'
  >('PLAN_AND_WAIT');

  // Stack 01: Identity & WIF Foundation state
  const [idDomain, setIdDomain] = useState('mohanrajs.altostrat.com');
  const [idCustomerId, setIdCustomerId] = useState('customers/C01234567');
  const [idEntraFilter, setIdEntraFilter] = useState(
    "startswith(mailNickname,'ge-')",
  );
  const [idSamlEnabled, setIdSamlEnabled] = useState(true);
  const [idWifOidcEnabled, setIdWifOidcEnabled] = useState(false);
  const [idWifPoolId, setIdWifPoolId] = useState('entra-id-shared-pool');
  const [m365TenantId, setM365TenantId] = useState('');
  const [m365ClientId, setM365ClientId] = useState('');
  const [m365ClientSecret, setM365ClientSecret] = useState('');

  // Stack 03: M365 Connectors state
  const [m365Prefix, setM365Prefix] = useState('m365');
  const [m365TargetAppId, setM365TargetAppId] = useState(
    existingApps[0]?.engine_id ?? '',
  );
  const [m365SharePointUri, setM365SharePointUri] = useState(
    'https://contoso.sharepoint.com',
  );
  const [m365OneDriveUri, setM365OneDriveUri] = useState(
    'https://contoso-my.sharepoint.com',
  );
  const [enableSp, setEnableSp] = useState(true);
  const [enableOd, setEnableOd] = useState(true);
  const [enableOl, setEnableOl] = useState(true);
  const [enableTeams, setEnableTeams] = useState(true);

  // Track 3: Pinned GE Orchestrator Agent Publisher state
  const [pinEngineId, setPinEngineId] = useState(
    existingApps[0]?.engine_id ?? 'service-desk-app-01',
  );
  const [pinDisplayName, setPinDisplayName] = useState(
    'Enterprise Skill Orchestrator',
  );
  const [pinAuthId, setPinAuthId] = useState('ge-user-oauth-passthrough');
  const [pinnedAgentResult, setPinnedAgentResult] =
    useState<GePinnedAgentItem | null>(null);

  const selectedJob =
    jobs.find((j) => j.job_id === selectedJobId) ?? jobs[0] ?? null;

  async function handleSubmitGeApp(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await onProvisionGeApp({
        gcp_project_id: geProjectId,
        ge_location: geLocation,
        ge_app_id: geAppId.trim(),
        ge_app_display_name: geDisplayName.trim(),
        ge_company_name: geCompanyName.trim(),
        ge_backing_storage_type: geStorageType,
        ge_identity_provider_type: geIdentityType,
        ge_app_access_group: geAccessGroup.trim(),
        enable_common_connectors: geEnableM365,
        tf_state_bucket: tfStateBucket.trim(),
        execution_mode: executionMode,
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Provisioning failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitIdentity(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await onProvisionIdentity({
        gcp_project_id: geProjectId,
        ge_location: geLocation,
        cloud_identity_customer_id: idCustomerId.trim(),
        primary_customer_domain: idDomain.trim(),
        shared_identity_domain: idDomain.trim(),
        m365_tenant_id: m365TenantId.trim(),
        m365_client_id: m365ClientId.trim(),
        m365_client_secret: m365ClientSecret,
        entra_group_filter: idEntraFilter.trim(),
        enable_cloud_identity_saml_sso: idSamlEnabled,
        enable_workforce_pool_oidc: idWifOidcEnabled,
        workforce_pool_id: idWifPoolId.trim(),
        tf_state_bucket: tfStateBucket.trim(),
        execution_mode: executionMode,
      });
      setM365ClientSecret('');
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Identity provisioning failed',
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitM365(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await onProvisionM365({
        gcp_project_id: geProjectId,
        ge_location: geLocation,
        m365_collection_prefix: m365Prefix.trim(),
        ge_app_id: m365TargetAppId.trim(),
        m365_tenant_id: m365TenantId.trim(),
        m365_client_id: m365ClientId.trim(),
        m365_client_secret: m365ClientSecret,
        enable_sharepoint_connector: enableSp,
        m365_sharepoint_instance_uri: m365SharePointUri.trim(),
        enable_onedrive_connector: enableOd,
        m365_onedrive_instance_uri: m365OneDriveUri.trim(),
        enable_outlook_connector: enableOl,
        enable_teams_connector: enableTeams,
        tf_state_bucket: tfStateBucket.trim(),
        execution_mode: executionMode,
      });
      setM365ClientSecret('');
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'M365 provisioning failed',
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitPinnedAgent(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await publishPinnedGeAgent({
        engine_id: pinEngineId.trim(),
        display_name: pinDisplayName.trim(),
        authorization_id: pinAuthId.trim(),
        registration_mode: 'adk',
        default_pinned: true,
      });
      setPinnedAgentResult(res);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Pinned agent publish failed',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header & Enterprise Terraform Guardrails Banner */}
      <div className="rounded-2xl border border-indigo-200/80 bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-900 p-6 text-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              Enterprise Terraform Provisioning Studio (infra/stacks)
            </div>
            <h2 className="mt-2 text-2xl font-bold tracking-tight">
              Self-Service GE App, WIF Identity & M365 Automation
            </h2>
            <p className="mt-1 max-w-3xl text-xs text-slate-300">
              Executes modular Terraform stacks with per-instance workspace
              isolation, remote GCS state support, ephemeral{' '}
              <code className="rounded bg-white/10 px-1 py-0.5">TF_VAR_*</code>{' '}
              secret injection, and Plan-Before-Apply approval gates.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300">
              <Lock className="h-3.5 w-3.5" />
              Active Workspace Locks: {activeWorkspaceLocks.length}
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="text-[11px] font-semibold uppercase text-indigo-300">
              1. Per-App State Isolation
            </p>
            <p className="mt-0.5 text-xs text-slate-300">
              Dedicated workspace{' '}
              <code className="text-white">app-&lt;loc&gt;-&lt;id&gt;</code>{' '}
              prevents overwriting existing GE Apps.
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="text-[11px] font-semibold uppercase text-indigo-300">
              2. Plan-Before-Apply Gate
            </p>
            <p className="mt-0.5 text-xs text-slate-300">
              Generates <code className="text-white">terraform plan</code> &
              holds workspace lock until Admin approval.
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="text-[11px] font-semibold uppercase text-indigo-300">
              3. Zero-Disk Secret Injection
            </p>
            <p className="mt-0.5 text-xs text-slate-300">
              Entra ID secrets injected via memory env & redacted as{' '}
              <code className="text-emerald-300">***REDACTED***</code>.
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="text-[11px] font-semibold uppercase text-indigo-300">
              4. Auto-Catalog & Readiness Sync
            </p>
            <p className="mt-0.5 text-xs text-slate-300">
              Newly provisioned Engines & M365 Data Stores register in AppHub
              automatically.
            </p>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-xs font-medium text-red-800 dark:border-red-900 dark:bg-red-950/60 dark:text-red-200"
        >
          {errorMsg}
        </div>
      )}

      {/* 3-Tab Stack Selector */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('GE_APP')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition ${
            activeTab === 'GE_APP'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300'
          }`}
        >
          <Cloud className="h-4 w-4" />
          Stack 02: Create GE App (02-ge-app-instance)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('IDENTITY_WIF')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition ${
            activeTab === 'IDENTITY_WIF'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300'
          }`}
        >
          <KeyRound className="h-4 w-4" />
          Stack 01: Identity & WIF (01-identity-foundation)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('M365_CONNECTORS')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition ${
            activeTab === 'M365_CONNECTORS'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300'
          }`}
        >
          <Database className="h-4 w-4" />
          Stack 03: M365 Connectors (03-m365-connectors)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('PINNED_ORCHESTRATOR')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition ${
            activeTab === 'PINNED_ORCHESTRATOR'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300'
          }`}
        >
          <Sparkles className="h-4 w-4" />
          Pin Orchestrator (agents-cli publish)
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Stack Configuration Form */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-6">
          {activeTab === 'GE_APP' && (
            <form onSubmit={(e) => void handleSubmitGeApp(e)} className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Provision Gemini Enterprise App Instance
                </h3>
                <span className="rounded-lg bg-indigo-50 px-2.5 py-1 font-mono text-[11px] font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  Workspace: app-{geLocation}-{geAppId || 'app'}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  GCP Project ID
                  <input
                    type="text"
                    value={geProjectId}
                    onChange={(e) => setGeProjectId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                    required
                  />
                </label>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  GE Multi-Region Location
                  <select
                    aria-label="GE Multi-Region Location"
                    value={geLocation}
                    onChange={(e) => setGeLocation(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="global">global</option>
                    <option value="us">us</option>
                    <option value="eu">eu</option>
                  </select>
                </label>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Engine ID (GE_APP_ID)
                  <input
                    type="text"
                    value={geAppId}
                    onChange={(e) => setGeAppId(e.target.value)}
                    placeholder="hr-benefits-assistant"
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                    required
                  />
                </label>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  App Display Name
                  <input
                    type="text"
                    value={geDisplayName}
                    onChange={(e) => setGeDisplayName(e.target.value)}
                    placeholder="HR Benefits Assistant"
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                    required
                  />
                </label>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Company Persona Name
                  <input
                    type="text"
                    value={geCompanyName}
                    onChange={(e) => setGeCompanyName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                  />
                </label>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Backing Data Store Type
                  <select
                    value={geStorageType}
                    onChange={(e) => setGeStorageType(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="GCS">GCS Unstructured Bucket</option>
                    <option value="BIGQUERY">BigQuery Dataset</option>
                    <option value="NONE">Connector-Only (No GCS/BQ)</option>
                  </select>
                </label>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Identity Provider (ACL Mode)
                  <select
                    value={geIdentityType}
                    onChange={(e) => setGeIdentityType(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="GSUITE">
                      Cloud Identity / Entra SAML (GSUITE)
                    </option>
                    <option value="THIRD_PARTY">
                      Workforce Identity Pool (THIRD_PARTY)
                    </option>
                  </select>
                </label>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Dedicated Cloud Identity Access Group
                  <input
                    type="text"
                    value={geAccessGroup}
                    onChange={(e) => setGeAccessGroup(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                  />
                </label>
              </div>

              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={geEnableM365}
                  onChange={(e) => setGeEnableM365(e.target.checked)}
                  className="rounded border-slate-300"
                />
                Bind Shared M365 Federated Data Stores (SharePoint, Outlook,
                Teams, OneDrive)
              </label>

              <div className="grid grid-cols-1 gap-3 border-t border-slate-200 pt-3 dark:border-slate-800 sm:grid-cols-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Remote GCS State Bucket (Optional)
                  <input
                    type="text"
                    value={tfStateBucket}
                    onChange={(e) => setTfStateBucket(e.target.value)}
                    placeholder="Leave empty for isolated local workspace"
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                  />
                </label>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Terraform Execution Gate
                  <select
                    aria-label="Terraform Execution Gate"
                    value={executionMode}
                    onChange={(e) =>
                      setExecutionMode(
                        e.target.value as 'PLAN_AND_WAIT' | 'DRY_RUN' | 'APPLY',
                      )
                    }
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="PLAN_AND_WAIT">
                      Plan First & Require Admin Approval (Recommended)
                    </option>
                    <option value="DRY_RUN">Dry-Run Only (Plan Preview)</option>
                    <option value="APPLY">Direct Apply (Auto-Approve)</option>
                  </select>
                </label>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
              >
                <Play className="h-4 w-4" />
                {submitting
                  ? 'Executing Terraform Stack...'
                  : 'Run Stack 02: GE App Terraform Plan'}
              </button>
            </form>
          )}

          {activeTab === 'IDENTITY_WIF' && (
            <form
              onSubmit={(e) => void handleSubmitIdentity(e)}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Entra ID to Cloud Identity Sync & SAML/WIF SSO
                </h3>
                <span className="rounded-lg bg-indigo-50 px-2.5 py-1 font-mono text-[11px] font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  Stack 01: Identity Foundation
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Primary Corporate Domain
                  <input
                    type="text"
                    value={idDomain}
                    onChange={(e) => setIdDomain(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                    required
                  />
                </label>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Cloud Identity Customer ID
                  <input
                    type="text"
                    value={idCustomerId}
                    onChange={(e) => setIdCustomerId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                  />
                </label>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Entra ID Tenant ID
                  <input
                    type="text"
                    value={m365TenantId}
                    onChange={(e) => setM365TenantId(e.target.value)}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                  />
                </label>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Entra ID App Client ID
                  <input
                    type="text"
                    value={m365ClientId}
                    onChange={(e) => setM365ClientId(e.target.value)}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                  />
                </label>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 sm:col-span-2">
                  Entra ID Client Secret (Ephemeral TF_VAR_* — Never Saved to
                  Disk)
                  <input
                    type="password"
                    value={m365ClientSecret}
                    onChange={(e) => setM365ClientSecret(e.target.value)}
                    placeholder="Injected via memory env & stored in Secret Manager"
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                  />
                </label>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Microsoft Graph Group Filter
                  <input
                    type="text"
                    value={idEntraFilter}
                    onChange={(e) => setIdEntraFilter(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                  />
                </label>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Workforce Pool ID
                  <input
                    type="text"
                    value={idWifPoolId}
                    onChange={(e) => setIdWifPoolId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                  />
                </label>
              </div>

              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={idSamlEnabled}
                    onChange={(e) => setIdSamlEnabled(e.target.checked)}
                  />
                  Configure Cloud Identity Inbound SAML 2.0 SSO
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={idWifOidcEnabled}
                    onChange={(e) => setIdWifOidcEnabled(e.target.checked)}
                  />
                  Provision Workforce Identity OIDC Pool
                </label>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
              >
                <Play className="h-4 w-4" />
                {submitting
                  ? 'Running Identity Terraform...'
                  : 'Run Stack 01: Identity & WIF Plan'}
              </button>
            </form>
          )}

          {activeTab === 'M365_CONNECTORS' && (
            <form onSubmit={(e) => void handleSubmitM365(e)} className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Provision Microsoft 365 Federated Connectors
                </h3>
                <span className="rounded-lg bg-indigo-50 px-2.5 py-1 font-mono text-[11px] font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  Workspace: m365-{geLocation}-{m365Prefix || 'm365'}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Collection Prefix
                  <input
                    type="text"
                    value={m365Prefix}
                    onChange={(e) => setM365Prefix(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                    required
                  />
                </label>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Bind to Target GE App (Optional)
                  <input
                    type="text"
                    value={m365TargetAppId}
                    onChange={(e) => setM365TargetAppId(e.target.value)}
                    placeholder="e.g. hr-benefits-assistant"
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                  />
                </label>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  SharePoint Instance URI
                  <input
                    type="text"
                    value={m365SharePointUri}
                    onChange={(e) => setM365SharePointUri(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                  />
                </label>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  OneDrive Instance URI
                  <input
                    type="text"
                    value={m365OneDriveUri}
                    onChange={(e) => setM365OneDriveUri(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                  />
                </label>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 sm:col-span-2">
                  Entra ID Client Secret (Ephemeral TF_VAR_* — Redacted in Logs)
                  <input
                    type="password"
                    value={m365ClientSecret}
                    onChange={(e) => setM365ClientSecret(e.target.value)}
                    placeholder="Never written to disk; redacted from SSE output"
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={enableSp}
                    onChange={(e) => setEnableSp(e.target.checked)}
                  />
                  SharePoint ({m365Prefix}-sp)
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={enableOl}
                    onChange={(e) => setEnableOl(e.target.checked)}
                  />
                  Outlook ({m365Prefix}-ol)
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={enableTeams}
                    onChange={(e) => setEnableTeams(e.target.checked)}
                  />
                  Microsoft Teams ({m365Prefix}-teams)
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={enableOd}
                    onChange={(e) => setEnableOd(e.target.checked)}
                  />
                  OneDrive ({m365Prefix}-od)
                </label>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
              >
                <Play className="h-4 w-4" />
                {submitting
                  ? 'Provisioning M365 Connectors...'
                  : 'Run Stack 03: M365 Connectors Plan'}
              </button>
            </form>
          )}

          {activeTab === 'PINNED_ORCHESTRATOR' && (
            <form
              onSubmit={(ev) => void handleSubmitPinnedAgent(ev)}
              className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Pin Universal Skill Orchestrator in Gemini Enterprise
                  </h3>
                  <p className="text-xs text-slate-500">
                    Registers the ADK Orchestrator via{' '}
                    <code>agents-cli publish gemini-enterprise</code> & sets{' '}
                    <code>defaultPinned: true</code> alongside Deep Research.
                  </p>
                </div>
                <span className="rounded-lg bg-emerald-50 px-2.5 py-1 font-mono text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  defaultPinned: true
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Target GE App Engine ID
                  <input
                    type="text"
                    value={pinEngineId}
                    onChange={(e) => setPinEngineId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                    required
                  />
                </label>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Pinned Assistant Display Name
                  <input
                    type="text"
                    value={pinDisplayName}
                    onChange={(e) => setPinDisplayName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                    required
                  />
                </label>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 sm:col-span-2">
                  OAuth 2.0 Passthrough Authorization ID (--authorization-id)
                  <input
                    type="text"
                    value={pinAuthId}
                    onChange={(e) => setPinAuthId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                    required
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4" />
                {submitting
                  ? 'Publishing & Pinning via agents-cli...'
                  : 'Publish & Pin Orchestrator in Gemini Enterprise'}
              </button>

              {pinnedAgentResult && (
                <div className="mt-4 space-y-2.5 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 text-xs dark:border-emerald-900/60 dark:bg-emerald-950/30">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-900 dark:text-emerald-200">
                      Pinned Assistant Registered ({pinnedAgentResult.status})
                    </span>
                    <span className="font-mono text-[11px] text-emerald-700 dark:text-emerald-300">
                      {pinnedAgentResult.engine_id}
                    </span>
                  </div>
                  <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-slate-950 p-2.5 font-mono text-[11px] text-emerald-300">
                    {pinnedAgentResult.agents_cli_command}
                  </pre>
                  <div>
                    <p className="font-semibold text-slate-700 dark:text-slate-200">
                      Synced Starter Prompts (
                      {pinnedAgentResult.starter_prompts.length}):
                    </p>
                    <ul className="mt-1 list-disc space-y-1 pl-4 text-[11px] text-slate-600 dark:text-slate-300">
                      {pinnedAgentResult.starter_prompts.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Right Column: Plan-Before-Apply Review Gate & Live Terminal Logs */}
        <div className="space-y-4 lg:col-span-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                <Server className="h-4 w-4 text-indigo-600" />
                Provisioning Jobs & Approval Gate ({jobs.length})
              </h3>
            </div>

            {jobs.length === 0 ? (
              <p className="mt-4 text-xs text-slate-500">
                No Terraform provisioning runs yet. Submit a stack on the left
                to generate an isolated Terraform execution plan.
              </p>
            ) : (
              <div className="mt-3 space-y-2.5">
                {jobs.map((job) => {
                  const isSelected = selectedJob?.job_id === job.job_id;
                  return (
                    <div
                      key={job.job_id}
                      onClick={() => setSelectedJobId(job.job_id)}
                      className={`cursor-pointer rounded-xl border p-3 transition ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30'
                          : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                            {job.title}
                          </p>
                          <p className="font-mono text-[11px] text-slate-500">
                            {job.job_id} • Workspace: {job.workspace_key} •{' '}
                            {job.state_backend_type}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                            job.status === 'SUCCEEDED'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : job.status === 'PENDING_APPROVAL'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : job.status === 'FAILED' ||
                                    job.status === 'REJECTED'
                                  ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                                  : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {job.status}
                        </span>
                      </div>

                      {job.status === 'PENDING_APPROVAL' && (
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-300/80 bg-amber-50/90 p-2.5 dark:border-amber-800 dark:bg-amber-950/50">
                          <span className="text-[11px] font-semibold text-amber-900 dark:text-amber-200">
                            Terraform Plan ready. Workspace lock held until
                            Admin decision:
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                void onApproveJob(job.job_id);
                              }}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Approve & Apply Plan
                            </button>
                            <button
                              type="button"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                void onRejectJob(job.job_id);
                              }}
                              className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Reject & Unlock
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {selectedJob && (
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-slate-100 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-emerald-400" />
                  <span className="font-mono text-xs font-semibold">
                    Terraform Console — {selectedJob.workspace_key}
                  </span>
                </div>
                <span className="font-mono text-[11px] text-slate-400">
                  Prefix: {selectedJob.state_prefix}
                </span>
              </div>
              <pre className="mt-3 max-h-72 overflow-y-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-emerald-300">
                {selectedJob.log_lines.join('\n')}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
