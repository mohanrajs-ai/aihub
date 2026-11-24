"""Unit tests for standalone Admin Console backend and database (`backend-admin`)."""

import pathlib

import pytest
from fastapi import testclient

from app import config
from app import database
from app import db_models
from app import main

BACKEND_ADMIN_ROOT = pathlib.Path(__file__).resolve().parents[1]
PROJECT_ROOT = BACKEND_ADMIN_ROOT.parent


@pytest.fixture(autouse=True)
def _setup_test_env(monkeypatch: pytest.MonkeyPatch) -> None:
    """Uses isolated in-memory SQLite DB and mock data."""
    monkeypatch.setenv("DATABASE_URL", "sqlite:///:memory:")
    monkeypatch.setenv("USE_MOCK_DATA", "true")
    monkeypatch.setenv("SYNC_ON_STARTUP", "false")
    database.reset_engine_cache()
    database.init_db()


def test_admin_backend_exposes_admin_routes() -> None:
    """Verifies backend-admin exposes administrative provisioning, sync, and governance."""
    app = main.create_app()
    client = testclient.TestClient(app)

    health_res = client.get("/api/v1/health")
    assert health_res.status_code == 200
    assert health_res.json()["portal_mode"] == "admin"

    admin_res = client.get(
        "/api/v1/admin/provisioning/jobs",
        headers={
            "X-Dev-User-Email": "admin@example.com",
            "X-Dev-User-Role": "it-admin",
        },
    )
    assert admin_res.status_code == 200


def test_admin_backend_isolated_database_and_schema(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Verifies backend-admin uses geapphub_admin DB and includes provisioning_jobs."""
    monkeypatch.delenv("DATABASE_URL", raising=False)
    settings = config.get_settings()
    assert settings.database_url.endswith("/geapphub_admin")
    assert database._FALLBACK_SQLITE_URL.endswith("geapphub_admin.db")
    assert "provisioning_jobs" in db_models.Base.metadata.tables


def test_admin_dockerfile_and_compose_configuration() -> None:
    """Verifies Dockerfile.admin and docker-compose.yml define two separate DBs."""
    dockerfile_admin = (PROJECT_ROOT / "Dockerfile.admin").read_text(
        encoding="utf-8"
    )
    assert "backend-admin" in dockerfile_admin
    assert "frontend-admin" in dockerfile_admin

    compose_content = (PROJECT_ROOT / "docker-compose.yml").read_text(
        encoding="utf-8"
    )
    assert "postgres-user:" in compose_content
    assert "postgres-admin:" in compose_content
    assert "geapphub_user" in compose_content
    assert "geapphub_admin" in compose_content
    assert "user-portal:" in compose_content
    assert "admin-console:" in compose_content
