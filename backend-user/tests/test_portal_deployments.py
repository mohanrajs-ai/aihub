"""Unit tests for standalone User Portal backend and database (`backend-user`)."""

import pathlib

import pytest
from fastapi import testclient

from app import config
from app import database
from app import db_models
from app import main

BACKEND_USER_ROOT = pathlib.Path(__file__).resolve().parents[1]
PROJECT_ROOT = BACKEND_USER_ROOT.parent


@pytest.fixture(autouse=True)
def _setup_test_env(monkeypatch: pytest.MonkeyPatch) -> None:
    """Uses isolated in-memory SQLite DB and mock data."""
    monkeypatch.setenv("DATABASE_URL", "sqlite:///:memory:")
    monkeypatch.setenv("USE_MOCK_DATA", "true")
    monkeypatch.setenv("SYNC_ON_STARTUP", "false")
    database.reset_engine_cache()
    database.init_db()


def test_user_backend_serves_only_app_catalog_and_auth_routes() -> None:
    """Verifies backend-user exposes only auth/apps/groups and omits skills/agents/mcp/admin."""
    app = main.create_app()
    client = testclient.TestClient(app)

    health_res = client.get("/api/v1/health")
    assert health_res.status_code == 200
    assert health_res.json()["portal_mode"] == "user"

    apps_res = client.get("/api/v1/apps")
    assert apps_res.status_code == 200

    # Skills, Agents, Connectors/MCP, and Admin routes are omitted from backend-user
    assert client.get("/api/v1/skills").status_code == 404
    assert client.get("/api/v1/agents").status_code == 404
    assert client.get("/api/v1/mcp-servers").status_code == 404
    assert client.get("/api/v1/admin/provisioning/jobs").status_code == 404
    assert client.post("/api/v1/sync").status_code == 404


def test_user_backend_isolated_database_and_schema(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Verifies backend-user uses geapphub_user DB and omits provisioning_jobs."""
    monkeypatch.delenv("DATABASE_URL", raising=False)
    settings = config.get_settings()
    assert settings.database_url.endswith("/geapphub_user")
    assert database._FALLBACK_SQLITE_URL.endswith("geapphub_user.db")
    assert "provisioning_jobs" not in db_models.Base.metadata.tables


def test_user_backend_codebase_excludes_admin_and_duplicate_files() -> None:
    """Verifies backend-user physically excludes admin, skills, agents, and mcp routers."""
    assert not (BACKEND_USER_ROOT / "app" / "routers" / "provisioning.py").exists()
    assert not (BACKEND_USER_ROOT / "app" / "routers" / "sync.py").exists()
    assert not (BACKEND_USER_ROOT / "app" / "routers" / "skills.py").exists()
    assert not (BACKEND_USER_ROOT / "app" / "routers" / "agents.py").exists()
    assert not (BACKEND_USER_ROOT / "app" / "routers" / "mcp_servers.py").exists()
    assert not (BACKEND_USER_ROOT / "skill_workflow_service").exists()
    assert not (
        BACKEND_USER_ROOT / "app" / "services" / "terraform_runner.py"
    ).exists()

    dockerfile_user = (PROJECT_ROOT / "Dockerfile.user").read_text(
        encoding="utf-8"
    )
    assert "backend-user" in dockerfile_user
    assert "frontend-user" in dockerfile_user
