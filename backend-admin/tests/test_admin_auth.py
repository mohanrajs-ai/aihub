"""Unit tests for role-based authorization guardrails on admin endpoints."""

import pytest
from fastapi import testclient

from app import auth
from app import database
from app import main
from app import models


@pytest.fixture(autouse=True)
def _setup_test_db(monkeypatch: pytest.MonkeyPatch) -> None:
    """Uses isolated in-memory DB and mock settings."""
    monkeypatch.setenv("DATABASE_URL", "sqlite:///:memory:")
    monkeypatch.setenv("USE_MOCK_DATA", "true")
    monkeypatch.setenv("SYNC_ON_STARTUP", "false")
    database.reset_engine_cache()
    database.init_db()


def test_is_admin_user_detection() -> None:
    """Verifies is_admin_user identifies admin roles and admin email domains."""
    non_admin_user = models.UserContext(
        email="employee@example.com",
        user_id="emp-1",
        roles=["employee", "developer"],
        auth_source="mock",
    )
    assert not auth.is_admin_user(non_admin_user)

    for role in [
        "admin",
        "it-admin",
        "security-reviewer",
        "platform-lead",
        "cloud-architect",
    ]:
        admin_ctx = models.UserContext(
            email="user@example.com",
            user_id="u-1",
            roles=[role, "employee"],
            auth_source="mock",
        )
        assert auth.is_admin_user(admin_ctx), f"Role {role} should be recognized as admin"

    admin_by_email = models.UserContext(
        email="admin@example.com",
        user_id="u-admin",
        roles=["employee"],
        auth_source="mock",
    )
    assert auth.is_admin_user(admin_by_email)


def test_admin_provisioning_endpoints_reject_non_admin() -> None:
    """Verifies that non-admin users cannot access provisioning jobs."""
    client = testclient.TestClient(main.create_app())
    non_admin_headers = {
        "X-Dev-User-Email": "dev@example.com",
        "X-Dev-User-Role": "employee",
    }
    resp = client.get("/api/v1/admin/provisioning/jobs", headers=non_admin_headers)
    assert resp.status_code == 403


def test_sync_trigger_rejects_non_admin() -> None:
    """Verifies POST /api/v1/sync requires admin authorization."""
    client = testclient.TestClient(main.create_app())
    non_admin_headers = {
        "X-Dev-User-Email": "dev@example.com",
        "X-Dev-User-Role": "employee",
    }
    resp = client.post("/api/v1/sync", headers=non_admin_headers)
    assert resp.status_code == 403


def test_sync_trigger_allows_admin() -> None:
    """Verifies POST /api/v1/sync succeeds with an authorized admin role."""
    client = testclient.TestClient(main.create_app())
    admin_headers = {
        "X-Dev-User-Email": "itadmin@example.com",
        "X-Dev-User-Role": "it-admin",
    }
    resp = client.post("/api/v1/sync", headers=admin_headers)
    assert resp.status_code == 200


def test_skill_approval_endpoints_reject_non_admin() -> None:
    """Verifies approving/rejecting skills requires admin role."""
    client = testclient.TestClient(main.create_app())
    non_admin_headers = {
        "X-Dev-User-Email": "dev@example.com",
        "X-Dev-User-Role": "employee",
    }
    resp_approve = client.post(
        "/api/v1/workflows/skills/test-skill/approve",
        headers=non_admin_headers,
    )
    assert resp_approve.status_code == 403

    resp_reject = client.post(
        "/api/v1/workflows/skills/test-skill/reject",
        headers=non_admin_headers,
    )
    assert resp_reject.status_code == 403
