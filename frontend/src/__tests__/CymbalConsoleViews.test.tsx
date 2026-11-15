/**
 * Unit tests for Google Cloud Console Sidebar (Apps, Skills, Agents, Connectors/MCP,
 * header & minimize/expand toggle), expandable SearchFilterBar, CatalogGrid Card/List
 * views, AgentsView Card/List views, and McpServersView Card/List views.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AgentsView } from '../components/AgentsView';
import { CatalogGrid } from '../components/CatalogGrid';
import { McpServersView } from '../components/McpServersView';
import { SearchFilterBar } from '../components/SearchFilterBar';
import { Sidebar } from '../components/Sidebar';
import {
  AgentSummary,
  CatalogApplication,
  McpServerSummary,
} from '../types/catalog';

const SAMPLE_APPS: CatalogApplication[] = [
  {
    engine_id: 'cymbal-service-desk-app',
    display_name: 'Cymbal IT Service Desk Assistant',
    description: 'Federated ITSM search and ticket automation across ServiceNow and Jira.',
    category: 'IT & Operations',
    department: 'IT Service Desk',
    tags: ['servicenow', 'jira', 'itsm'],
    icon_name: 'Headphones',
    launch_url: 'https://vertexaisearch.cloud.google.com/home/cid/cymbal-sd',
    location: 'global',
    solution_type: 'SOLUTION_TYPE_SEARCH',
    allowed_roles: ['group:ge-service-desk-users@mohanrajs.demo.altostrat.com'],
    featured: true,
  },
];

const SAMPLE_AGENTS: AgentSummary[] = [
  {
    agent_id: 'universal-skill-orchestrator',
    display_name: 'Enterprise Skill Orchestrator',
    resource_name:
      'projects/457338748091/locations/us-central1/reasoningEngines/8050815728477011968',
    description:
      'Universal ADK Skill Orchestrator deploying parent skills and sub-skills dynamically on Vertex AI Agent Runtime.',
    deployment_target: 'agent_runtime',
    pinned_apps: [
      'cymbal-dev-sandbox-app',
      'cymbal-service-desk-app',
      'cymbal-finance-app',
      'cymbal-hr-app',
    ],
    starter_prompts: [
      'Search active P0/P1 incidents in ServiceNow and list related Jira tickets',
      'Create a P1 Incident in ServiceNow for Payment Gateway Handshake Timeout',
    ],
    status: 'ACTIVE',
    subskills_count: 8,
    version: '1.4.1',
  },
];

const SAMPLE_MCP_SERVERS: McpServerSummary[] = [
  {
    server_id: 'cymbal-sn-fed',
    display_name: 'ServiceNow ITSM & Knowledge Base',
    data_source: 'servicenow',
    endpoint_uri: 'https://gcpconnector3.service-now.com',
    connector_modes: ['FEDERATED', 'ACTIONS'],
    entities: ['incident', 'catalog', 'knowledge_base'],
    enabled_actions: ['create_incident', 'update_incident', 'search_incidents'],
    tools_count: 18,
    status: 'ACTIVE',
    action_state: 'ACTIVE',
    attached_apps: ['cymbal-dev-sandbox-app', 'cymbal-service-desk-app'],
  },
  {
    server_id: 'cymbal-jira-fed',
    display_name: 'Atlassian Jira Cloud',
    data_source: 'jira',
    endpoint_uri: 'https://mohanrajs-team.atlassian.net',
    connector_modes: ['FEDERATED', 'ACTIONS'],
    entities: ['project', 'issue', 'comment'],
    enabled_actions: ['create_issue', 'update_issue', 'search_issues'],
    tools_count: 36,
    status: 'ACTIVE',
    action_state: 'ACTIVE',
    attached_apps: ['cymbal-dev-sandbox-app', 'cymbal-service-desk-app'],
  },
];

describe('Google Cloud Console Sidebar (GE App Hub, Skill Registry, Agent Registry, Connector/MCP & Minimizable Header)', () => {
  it('renders GE App Hub, Skill Registry, Agent Registry, Connector/MCP labels, side panel header, and minimizes/expands when toggle button is clicked', () => {
    const onSelectSection = vi.fn();
    render(
      <Sidebar
        activeSection="apps"
        onSelectSection={onSelectSection}
        appsCount={4}
        skillsCount={9}
        pendingSkillsCount={0}
        approvedSkillsCount={9}
        agentsCount={1}
        mcpCount={7}
        isAdmin={true}
      />,
    );

    expect(screen.getByText('GE App Hub')).toBeInTheDocument();
    expect(screen.getByText('Skill Registry')).toBeInTheDocument();
    expect(screen.getByText('Agent Registry')).toBeInTheDocument();
    expect(screen.getByText('Connector/MCP')).toBeInTheDocument();

    const mcpBtn = screen.getByRole('button', { name: /Connector\/MCP/i });
    fireEvent.click(mcpBtn);
    expect(onSelectSection).toHaveBeenCalledWith('mcp');

    // Minimize sidebar
    const minimizeBtn = screen.getByRole('button', {
      name: /Minimize sidebar/i,
    });
    fireEvent.click(minimizeBtn);

    // Should now offer Expand sidebar button
    const expandBtn = screen.getByRole('button', {
      name: /Expand sidebar/i,
    });
    expect(expandBtn).toBeInTheDocument();
    fireEvent.click(expandBtn);
    expect(
      screen.getByRole('button', { name: /Minimize sidebar/i }),
    ).toBeInTheDocument();
  });
});

describe('Expandable SearchFilterBar and CatalogGrid Card/List Views', () => {
  it('toggles expandable search drawer and switches between Card view and List view', () => {
    const onViewModeChange = vi.fn();
    render(
      <>
        <SearchFilterBar
          searchQuery=""
          selectedCategory=""
          selectedDepartment=""
          selectedTag=""
          categories={['IT & Operations']}
          departments={['IT Service Desk']}
          totalCount={1}
          filteredCount={1}
          onSearchChange={vi.fn()}
          onCategoryChange={vi.fn()}
          onDepartmentChange={vi.fn()}
          onClearFilters={vi.fn()}
          viewMode="grid"
          onViewModeChange={onViewModeChange}
        />
        <CatalogGrid
          apps={SAMPLE_APPS}
          loading={false}
          onResetFilters={vi.fn()}
          viewMode="list"
        />
      </>,
    );

    const toggleSearchBtn = screen.getByRole('button', {
      name: /Toggle search and filters/i,
    });
    fireEvent.click(toggleSearchBtn);

    const listViewBtn = screen.getByRole('button', { name: /List view/i });
    fireEvent.click(listViewBtn);
    expect(onViewModeChange).toHaveBeenCalledWith('list');

    // Verify list view renders table row with engine_id and Launch App
    expect(
      screen.getByText('Cymbal IT Service Desk Assistant'),
    ).toBeInTheDocument();
    expect(screen.getByText('cymbal-service-desk-app')).toBeInTheDocument();
  });
});

describe('AgentsView Card & List Views with Expandable Search', () => {
  it('renders Cymbal ADK/A2A agents in default List view and switches between Card view and List view', () => {
    render(<AgentsView agents={SAMPLE_AGENTS} loading={false} />);

    expect(
      screen.getByRole('heading', { name: 'Agent Registry' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Enterprise Skill Orchestrator'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('universal-skill-orchestrator'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/reasoningEngines\/8050815728477011968/i),
    ).toBeInTheDocument();

    const cardViewBtn = screen.getByRole('button', { name: /Card view/i });
    fireEvent.click(cardViewBtn);
    expect(
      screen.getByText('Enterprise Skill Orchestrator'),
    ).toBeInTheDocument();

    const listViewBtn = screen.getByRole('button', { name: /List view/i });
    fireEvent.click(listViewBtn);
    expect(
      screen.getByText('universal-skill-orchestrator'),
    ).toBeInTheDocument();
  });
});

describe('McpServersView (Connectors/MCP) Card & List Views with Expandable Search', () => {
  it('renders Connectors/MCP servers in default List view, switches to Card view, and filters by search query', () => {
    render(<McpServersView servers={SAMPLE_MCP_SERVERS} loading={false} />);

    expect(
      screen.getByRole('heading', { name: 'Connector/MCP' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('ServiceNow ITSM & Knowledge Base'),
    ).toBeInTheDocument();
    expect(screen.getByText('Atlassian Jira Cloud')).toBeInTheDocument();
    expect(screen.getByText('cymbal-sn-fed')).toBeInTheDocument();

    const cardViewBtn = screen.getByRole('button', { name: /Card view/i });
    fireEvent.click(cardViewBtn);

    const listViewBtn = screen.getByRole('button', { name: /List view/i });
    fireEvent.click(listViewBtn);
    expect(screen.getByText('cymbal-sn-fed')).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(
      /Filter MCP servers & connectors/i,
    );
    fireEvent.change(searchInput, { target: { value: 'Jira' } });

    expect(
      screen.queryByText('ServiceNow ITSM & Knowledge Base'),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Atlassian Jira Cloud')).toBeInTheDocument();
  });
});
