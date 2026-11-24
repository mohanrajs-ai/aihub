"""Unit tests for standalone User Portal backend (`backend-user`)."""

import pathlib

import pytest
from fastapi import testclient

from app import database
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


def test_user_backend_serves_user_routes_and_omits_admin_routes() -> None:
    """Verifies backend-user exposes user APIs and returns 404 for admin APIs."""
    app = main.create_app()
    client = testclient.TestClient(app)

    health_res = client.get("/api/v1/health")
    assert health_res.status_code == 200
    assert health_res.json()["portal_mode"] == "user"

    apps_res = client.get("/api/v1/apps")
    assert apps_res.status_code == 200

    # Admin provisioning, sync, and skill approval endpoints do not exist in backend-user
    assert client.get("/api/v1/admin/provisioning/jobs").status_code == 404
    assert client.post("/api/v1/sync").status_code == 404
    assert (
        client.post("/api/v1/workflows/skills/test-skill/approve").status_code
        == 404
    )


def test_user_backend_codebase_excludes_admin_files() -> None:
    """Verifies backend-user physically excludes admin provisioning & sync files."""
    assert not (BACKEND_USER_ROOT / "app" / "routers" / "provisioning.py").exists()
    assert not (BACKEND_USER_ROOT / "app" / "routers" / "sync.py").exists()
    assert not (
        BACKEND_USER_ROOT / "app" / "services" / "terraform_runner.py"
    ).exists()

    dockerfile_user = (PROJECT_ROOT / "Dockerfile.user").read_text(
        encoding="utf-8"
    )
    assert "backend-user" in dockerfile_user
    assert "frontend-user" in dockerfile_user
