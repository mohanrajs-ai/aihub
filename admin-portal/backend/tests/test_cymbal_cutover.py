"""Unit tests for Cymbal cutover, DB purge, and Agents/MCP APIs."""

import pytest
from fastapi import testclient

from app import config
from app import database
from app import db_models
from app import main
from app.services import sync as sync_service


@pytest.fixture(name="client")
def client_fixture() -> testclient.TestClient:
    """Creates a TestClient with mock/local environment."""
    app = main.create_app()
    return testclient.TestClient(app)


def test_cymbal_config_defaults(monkeypatch: pytest.MonkeyPatch) -> None:
    """Verifies settings default to cymbal-app-514110 and Cymbal admins."""
    monkeypatch.delenv("GCP_PROJECT_ID", raising=False)
    monkeypatch.delenv("ADMIN_USERS", raising=False)
    settings = config.get_settings()
    assert settings.gcp_project_id == "cymbal-app-514110"
    assert "mohanraj@mohanrajs.demo.altostrat.com" in settings.admin_users


def test_purge_non_cymbal_apps_in_sync() -> None:
    """Verifies CatalogSyncService purges non-Cymbal apps from the database."""
    mem_url = "sqlite:///:memory:"
    database.init_db(mem_url)

    with database.session_scope(database_url=mem_url) as session:
        # Seed both a legacy app and a Cymbal app
        legacy_app = db_models.GEApplicationRecord(
            engine_id="finance-app-01",
            display_name="Legacy Finance App",
            description="Old mock app",
            category="Finance",
            department="Finance",
            tags=["legacy"],
            icon_name="Briefcase",
            launch_url="https://example.com/legacy",
            default_launch_url="https://example.com/legacy",
            location="global",
            solution_type="SOLUTION_TYPE_SEARCH",
            iam_principals=["*"],
            data_store_ids=[],
            allowed_roles=["*"],
        )
        cymbal_app = db_models.GEApplicationRecord(
            engine_id="cymbal-finance-app",
            display_name="cymbal Finance & Accounting Assistant",
            description="Cymbal production app",
            category="Finance",
            department="Finance",
            tags=["cymbal"],
            icon_name="Briefcase",
            launch_url="https://example.com/cymbal",
            default_launch_url="https://example.com/cymbal",
            location="global",
            solution_type="SOLUTION_TYPE_SEARCH",
            iam_principals=["*"],
            data_store_ids=[],
            allowed_roles=["*"],
        )
        session.add(legacy_app)
        session.add(cymbal_app)
        session.commit()

        # Purge non-cymbal apps
        purged = sync_service.purge_non_cymbal_apps(session)
        assert purged >= 1

        remaining = [
            row.engine_id
            for row in session.query(db_models.GEApplicationRecord).all()
        ]
        assert "finance-app-01" not in remaining
        assert "cymbal-finance-app" in remaining


def test_get_agents_api(client: testclient.TestClient) -> None:
    """Tests GET /api/v1/agents returns Cymbal ADK agents."""
    resp = client.get("/api/v1/agents")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    orchestrator = next(
        (a for a in data if a["agent_id"] == "universal-skill-orchestrator"),
        None,
    )
    assert orchestrator is not None
    assert (
        "reasoningEngines/8050815728477011968"
        in orchestrator["resource_name"]
    )
    assert orchestrator["status"] == "ACTIVE"
    assert "cymbal-dev-sandbox-app" in orchestrator["pinned_apps"]


def test_get_mcp_servers_api(client: testclient.TestClient) -> None:
    """Tests GET /api/v1/mcp-servers returns Cymbal MCP & Data Connectors."""
    resp = client.get("/api/v1/mcp-servers")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    server_ids = [s["server_id"] for s in data]
    assert "cymbal-sn-fed" in server_ids
    assert "cymbal-jira-fed" in server_ids
    assert "cymbal-confluence-fed" in server_ids
    assert "cymbal-m365-sp" in server_ids

    jira = next(s for s in data if s["server_id"] == "cymbal-jira-fed")
    assert jira["tools_count"] >= 30
    assert jira["status"] == "ACTIVE"
    assert "ACTIONS" in jira["connector_modes"]


def test_deduplicate_skills_across_target_apps() -> None:
    """Verifies list_synced_skills deduplicates skills across target apps."""
    mem_url = "sqlite:///:memory:"
    database.init_db(mem_url)

    with database.session_scope(database_url=mem_url) as session:
        for eng_id in (
            "cymbal-dev-sandbox-app",
            "cymbal-service-desk-app",
            "cymbal-finance-app",
            "cymbal-hr-app",
        ):
            session.add(
                db_models.GESkillRecord(
                    skill_id=f"{eng_id}:daily-morning-summary",
                    resource_name=(
                        f"projects/cymbal-app-514110/engines/{eng_id}/"
                        "skills/daily-morning-summary"
                    ),
                    engine_id=eng_id,
                    app_display_name=eng_id,
                    display_name="daily-morning-summary",
                    description="Daily morning briefing skill.",
                    instruction=(
                        "# Daily Morning Summary\n"
                        "Uses Outlook Calendar and Microsoft Teams."
                    ),
                    owner_email="mohanraj@mohanrajs.demo.altostrat.com",
                    state="ENABLED",
                    sharing_scope="ALL_USERS",
                    sharing_state="SHARED",
                    review_status="APPROVED",
                )
            )
        session.commit()

        result = sync_service.list_synced_skills(session=session)
        assert result.total == 1
        assert result.approved_count == 1
        skill = result.items[0]
        assert skill.display_name == "daily-morning-summary"
        assert skill.shared_apps == [
            "cymbal-dev-sandbox-app",
            "cymbal-finance-app",
            "cymbal-hr-app",
            "cymbal-service-desk-app",
        ]
        assert "universal-skill-orchestrator" in skill.shared_agents
        assert skill.workflow is not None
        assert skill.workflow.target_engines == skill.shared_apps
        assert "universal-skill-orchestrator" in skill.workflow.target_agents
