import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Sidebar } from '../components/Sidebar';
import { SkillsSection } from '../components/SkillsSection';
import { DiscoveredSkill } from '../types/catalog';

const MOCK_SKILLS: DiscoveredSkill[] = [
  {
    skill_id: 'service-desk-app-01:16453101121688192599',
    resource_name:
      'projects/720923281941/locations/global/collections/default_collection/engines/service-desk-app-01/assistants/default_assistant/agents/16453101121688192599',
    engine_id: 'service-desk-app-01',
    app_display_name: 'Gemini Service Desk App',
    display_name: 'daily-morning-summary',
    description:
      'Compiles a concise morning briefing synthesizing Outlook Calendar, Email, and Teams.',
    instruction: '# Daily Morning Summary\n\nStep 1: Fetch calendar.',
    gcs_uri: 'gs://bucket/daily-morning-summary/',
    owner_email: 'admin@mohanrajs.altostrat.com',
    state: 'DISABLED',
    sharing_scope: 'RESTRICTED',
    sharing_state: 'PENDING',
    has_active_iam_proposals: true,
    review_status: 'PENDING_REVIEW',
    iam_proposals: [
      {
        proposal_id: '8420372054855937333',
        principal: 'user:mohanraj@mohanrajs.altostrat.com',
        role: 'roles/discoveryengine.agentUser',
        state: 'ACTIVE',
        create_time: '2026-11-02T12:59:45.647329Z',
        expire_time: '2026-12-17T12:59:44.681804149Z',
      },
    ],
    shared_principals: ['user:admin@mohanrajs.altostrat.com'],
    subfiles: [{ file_name: 'SKILL.md', mime_type: 'text/markdown' }],
    create_time: '2026-10-31T12:08:33.345419Z',
    update_time: '2026-10-31T12:08:33.345419Z',
    workflow: {
      workflow_id: 'wf-service-desk-app-01-16453101121688192599',
      skill_id: 'service-desk-app-01:16453101121688192599',
      engine_id: 'service-desk-app-01',
      skill_display_name: 'daily-morning-summary',
      owner_email: 'admin@mohanrajs.altostrat.com',
      current_stage: 'AWAITING_INFOSEC_APPROVAL',
      status: 'AWAITING_APPROVAL',
      eval_score: 100,
      eval_status: 'PASSED',
      eval_report: {
        agent_id: 'skill-eval-agent',
        score: 100,
        passed: true,
        summary: 'Passed 6-rubric benchmark.',
        six_rubric_benchmark: {
          overall_weighted_score_100: 95.2,
          certification_tier: 'PLATINUM_TIER_1',
          agents_cli_eval_dataset: {
            schema_version: 'agent-platform-eval-v1',
            eval_cases: [
              {
                eval_case_id: 'daily-morning-summary__golden_path_1',
                prompt: {
                  role: 'user',
                  parts: [
                    {
                      text: 'Execute daily-morning-summary on cymbal-service-desk-app.',
                    },
                  ],
                },
                rubric_groups: ['multi_turn_task_success'],
              },
            ],
          },
        },
      },
      infosec_risk_level: 'LOW',
      infosec_status: 'PASSED',
      approval_status: 'PENDING',
      approved_by: '',
      approval_notes: '',
      registry_id: '',
      shared_in_ge: false,
      shared_principals: [],
    },
  },
];

describe('Sidebar and SkillsSection', () => {
  it('renders Apps, Skills, and Agents in Sidebar and triggers navigation', () => {
    const onSelect = vi.fn();
    render(
      <Sidebar
        activeSection="apps"
        onSelectSection={onSelect}
        appsCount={7}
        skillsCount={1}
        pendingSkillsCount={1}
      />,
    );

    expect(screen.getByText('GE App Hub')).toBeInTheDocument();
    expect(screen.getByText('Skill Registry')).toBeInTheDocument();
    expect(screen.getByText('Agent Registry')).toBeInTheDocument();
    expect(
      screen.getByText('Pending Skill Share Requests'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText('Skill Registry'));
    expect(onSelect).toHaveBeenCalledWith('skills');

    fireEvent.click(screen.getByText('Agent Registry'));
    expect(onSelect).toHaveBeenCalledWith('agents');
  });

  it('renders Pending Review tab with 6-stage workflow, InfoSec approval, and SKILL.md modal', () => {
    const onApprove = vi.fn();
    render(
      <SkillsSection
        skills={MOCK_SKILLS}
        pendingReviewCount={1}
        approvedCount={0}
        loading={false}
        onApproveSkill={onApprove}
      />,
    );

    expect(screen.getByText('daily-morning-summary')).toBeInTheDocument();
    expect(screen.getByText('1. Trigger')).toBeInTheDocument();
    expect(
      screen.getByText('2. Evaluate (Skill Eval Agent)'),
    ).toBeInTheDocument();
    expect(screen.getByText('3. Agentic InfoSec Review')).toBeInTheDocument();
    expect(screen.getByText('4. InfoSec Approval (Human)')).toBeInTheDocument();
    expect(screen.getByText('5. Publish in Skill Registry')).toBeInTheDocument();
    expect(screen.getByText('6. Share to GE Apps & Agents')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Approve & Publish'));
    expect(onApprove).toHaveBeenCalledWith(
      'service-desk-app-01:16453101121688192599',
    );

    // Click through vertical stages to inspect step details
    fireEvent.click(screen.getByText('1. Trigger'));
    expect(
      screen.getByText(/Stage 1 Details: Trigger & Skill Discovery/i),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText('2. Evaluate (Skill Eval Agent)'));
    expect(
      screen.getByText(/Stage 2 Details: Evaluate \(Skill Eval Agent\)/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Stage 2 Evals Output: 6-Rubric Evaluation Scorecard \(R1–R6\)/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/R1_INSTRUCTION_QUALITY/i)).toBeInTheDocument();
    expect(
      screen.getAllByText(/daily-morning-summary__golden_path_1/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(
        /Execute daily-morning-summary on cymbal-service-desk-app\./i,
      ).length,
    ).toBeGreaterThanOrEqual(1);

    fireEvent.click(screen.getByText('3. Agentic InfoSec Review'));
    expect(
      screen.getByText(/Stage 3 Details: Agentic InfoSec Review/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Stage 3 InfoSec Output: 6-Point Security Control Audit \(IS-1–IS-6\)/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /0 Security Findings or Policy Violations Detected/i,
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText('4. InfoSec Approval (Human)'));
    expect(
      screen.getByText(
        /Reviewer Evidence Summary \(Stage 2 Evals Output & Stage 3 InfoSec Output\)/i,
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText('5. Publish in Skill Registry'));
    expect(
      screen.getByText(/Stage 5 Details: Publish in Skill Registry/i),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText('6. Share to GE Apps & Agents'));
    expect(
      screen.getByText(
        /Stage 6 Details: Shared GE Apps & High-Code Specialized ADK Agents/i,
      ),
    ).toBeInTheDocument();

    // Click View SKILL.md button to view SKILL.md inline
    fireEvent.click(screen.getByText('View SKILL.md'));
    expect(
      screen.getByText(/SKILL\.md Instruction Specification/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/# Daily Morning Summary/i),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText('Inspect SKILL.md & Proposals'));
    expect(
      screen.getByRole('dialog', {
        name: /Skill details for daily-morning-summary/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/# Daily Morning Summary/i).length,
    ).toBeGreaterThanOrEqual(1);

    fireEvent.click(screen.getByLabelText('Close skill details'));

    fireEvent.click(screen.getByRole('tab', { name: /Approved & Shared/i }));
    expect(
      screen.getByText(/No skills found in this view/i),
    ).toBeInTheDocument();
  });

  it('enforces RBAC between End-User AI Skill Hub and Admin Skill Governance Console', () => {
    const onSelect = vi.fn();
    const { rerender } = render(
      <Sidebar
        activeSection="skills"
        onSelectSection={onSelect}
        appsCount={7}
        skillsCount={1}
        pendingSkillsCount={1}
        isAdmin={false}
      />,
    );
    expect(screen.queryByText('Skill Governance')).not.toBeInTheDocument();

    rerender(
      <Sidebar
        activeSection="skills"
        onSelectSection={onSelect}
        appsCount={7}
        skillsCount={1}
        pendingSkillsCount={1}
        isAdmin={true}
      />,
    );
    expect(screen.getByText('Skill Governance')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Skill Governance'));
    expect(onSelect).toHaveBeenCalledWith('skill-governance');

    const approvedSkill: DiscoveredSkill = {
      ...MOCK_SKILLS[0],
      review_status: 'APPROVED',
      workflow: {
        ...MOCK_SKILLS[0].workflow!,
        approval_status: 'APPROVED',
        distribution_scope: 'MULTI_APP',
        target_engines: ['service-desk-app-01', 'finance-app-01'],
        required_connectors: [
          {
            connector_id: 'outlook-calendar',
            display_name: 'Outlook Calendar',
          },
          { connector_id: 'teams', display_name: 'Microsoft Teams' },
        ],
        target_app_evaluations: [
          {
            engine_id: 'service-desk-app-01',
            app_display_name: 'Service Desk App',
            location: 'global',
            connector_readiness: 'READY',
            matched_connectors: ['outlook-calendar', 'teams'],
            missing_connectors: [],
            data_store_count: 10,
            eval_score: 95,
            eval_status: 'PASSED',
            rendered_tokens: 1814,
            optimized_tokens: 1670,
            tokens_saved: 144,
            reduction_pct: 7.9,
            efficiency_grade: 'A',
          },
        ],
      },
    };

    render(
      <SkillsSection
        mode="user-hub"
        skills={[
          approvedSkill,
          {
            ...approvedSkill,
            skill_id: 'cymbal-finance-app:16453101121688192599',
            engine_id: 'cymbal-finance-app',
          },
        ]}
        pendingReviewCount={0}
        approvedCount={1}
        loading={false}
        isAdmin={true}
      />,
    );
    expect(
      screen.getByRole('heading', { name: 'Skill Registry' }),
    ).toBeInTheDocument();
    // Should deduplicate the two per-app skill copies into a single unique skill row
    expect(screen.getAllByText('daily-morning-summary')).toHaveLength(1);
    expect(screen.getByText('cymbal-finance-app')).toBeInTheDocument();
    expect(
      screen.getByText('universal-skill-orchestrator'),
    ).toBeInTheDocument();
    expect(screen.getByText('Outlook Calendar')).toBeInTheDocument();
    expect(screen.getByText('Microsoft Teams')).toBeInTheDocument();
  });
});
