# Implementation Plan: Cymbal GCP Console UI Redesign & Project Cutover

## Phase 1: Backend Cymbal Project Cutover, Database Cleanup & Agents/MCP Endpoints [checkpoint: 3d9df36]
- [x] Task: Write backend unit tests for Cymbal config defaults, non-Cymbal DB purge, and /api/v1/agents & /api/v1/mcp-servers endpoints [3345406]
- [x] Task: Update backend/app/config.py, firestore.py, sync.py, and routers to default to cymbal-app-514110 and expose live Cymbal Agents & MCP Connector endpoints [3d9df36]
- [x] Task: Execute database cleanup and sync so only cymbal-app-514110 apps, connectors, and groups exist in the database [3d9df36]
- [x] Task: Phase 1 Verification & Checkpoint (Refer to workflow.md) [3d9df36]

## Phase 2: Google Cloud Console UI Layout & Left Sidebar (Apps, Skills, Agents, MCP) [checkpoint: d2fa1e4]
- [x] Task: Write frontend unit tests (Vitest) for Google Cloud Console Header, Sidebar (Apps, Skills, Agents, MCP navigation), AgentsView, and McpServersView [d2fa1e4]
- [x] Task: Implement Google Cloud Console Header (Cymbal project selector pill, Google Cloud branding, Cymbal role switcher) and Sidebar (Apps, Skills, Agents, MCP) [d2fa1e4]
- [x] Task: Implement live AgentsView and McpServersView components and wire into App.tsx navigation [d2fa1e4]
- [x] Task: Phase 2 Verification & Checkpoint (Vitest suite + production Vite build) [d2fa1e4]

## Phase 3: Minimizable Side Panel with Header, Expandable Search Bar & Universal Card/List View Toggle (Connectors/MCP) [checkpoint: 05af174]
- [x] Task: Write unit tests for Connectors/MCP label, minimizable Sidebar with header, expandable Search bar, and Card/List view switcher across all panels [3c2852d]
- [x] Task: Update Sidebar.tsx with header, minimize/expand rail toggle, and Connectors/MCP navigation label [3c2852d]
- [x] Task: Update SearchFilterBar.tsx, CatalogGrid.tsx, App.tsx, SkillsSection.tsx, AgentsView.tsx, and McpServersView.tsx with expandable search bars and Card/List view toggle options [3c2852d]
- [x] Task: Rename sidebar navigation items and section headings to GE App Hub, Skill Registry, Agent Registry, and Connector/MCP [5a03c15]
- [x] Task: Change top portal name to GE AI Hub and parameterize brand logo with Tech Mahindra default [be75209]
- [x] Task: Right-align project pill in top header, move logged-in username below it with a user dropdown menu (Preview Role + Sign Out), remove DB sync badge, and make List View the default view across all panels [2464844]
- [x] Task: Deduplicate skills across target GE apps and aggregate shared GE apps and shared agents per unique skill [05af174]
- [x] Task: Phase 3 Verification & Checkpoint (Vitest suite + production Vite build) [05af174]
