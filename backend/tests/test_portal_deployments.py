"""Unit tests for decoupled User Portal and Admin Console deployments."""

import pathlib

import pytest
from fastapi import testclient

from app import admin_main
from app import database
from app import main
from app import user_main

PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[2]


@pytest.fixture(autouse=True)
def _setup_test_env(monkeypatch: pytest.MonkeyPatch) -> None:
    """Uses isolated in-memory SQLite DB and mock data."""
    monkeypatch.setenv("DATABASE_URL", "sqlite:///:memory:")
    monkeypatch.setenv("USE_MOCK_DATA", "true")
    monkeypatch.setenv("SYNC_ON_STARTUP", "false")
    database.reset_engine_cache()
    database.init_db()


def test_user_portal_app_excludes_admin_provisioning_routes() -> None:
    """Verifies user_main app exposes user routes and omits provisioning."""
    app = user_main.create_user_app()
    client = testclient.TestClient(app)

    health_res = client.get("/api/v1/health")
    assert health_res.status_code == 200
    assert health_res.json()["portal_mode"] == "user"

    apps_res = client.get("/api/v1/apps")
    assert apps_res.status_code == 200

    admin_res = client.get(
        "/api/v1/admin/provisioning/jobs",
        headers={
            "X-Dev-User-Email": "admin@example.com",
            "X-Dev-User-Role": "it-admin",
        },
    )
    assert admin_res.status_code == 404


def test_admin_console_app_exposes_admin_routes() -> None:
    """Verifies admin_main app exposes administrative provisioning and sync."""
    app = admin_main.create_admin_app()
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


def test_separate_dockerfiles_and_compose_exist() -> None:
    """Verifies Dockerfile.user, Dockerfile.admin, and docker-compose.yml."""
    dockerfile_user = PROJECT_ROOT / "Dockerfile.user"
    dockerfile_admin = PROJECT_ROOT / "Dockerfile.admin"
    docker_compose = PROJECT_ROOT / "docker-compose.yml"

    assert dockerfile_user.is_file()
    user_content = dockerfile_user.read_text(encoding="utf-8")
    assert "frontend-user" in user_content
    assert "app.user_main:app" in user_content

    assert dockerfile_admin.is_file()
    admin_content = dockerfile_admin.read_text(encoding="utf-8")
    assert "frontend-admin" in admin_content
    assert "app.admin_main:app" in admin_content

    compose_content = docker_compose.read_text(encoding="utf-8")
    assert "user-portal:" in compose_content
    assert "admin-console:" in compose_content
    assert "Dockerfile.user" in compose_content
    assert "Dockerfile.admin" in compose_content
    assert main.DEFAULT_USER_FRONTEND_DIST.name == "dist"
    assert main.DEFAULT_ADMIN_FRONTEND_DIST.name == "dist"
