"""Unit tests for standalone User Portal backend and database (`backend-user`)."""

import pathlib

import pytest
from fastapi import testclient

from app import config
from app import database
from app import db_models
from app import main
from app import sync_job

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

    me_std = client.get(
        "/api/v1/me",
        headers={
            "X-Dev-User-Email": "pradeepg@mohanrajs.demo.altostrat.com",
            "X-Dev-User-Role": "employee",
        },
    )
    assert me_std.status_code == 200
    assert me_std.json()["license_type"] == "standard"

    me_plus = client.get(
        "/api/v1/me",
        headers={
            "X-Dev-User-Email": "mohanraj@mohanrajs.demo.altostrat.com",
            "X-Dev-User-Role": "engineering",
        },
    )
    assert me_plus.status_code == 200
    assert me_plus.json()["license_type"] == "plus"

    req_apps = client.get("/api/v1/apps/requestable")
    assert req_apps.status_code == 200
    assert req_apps.json()["total"] >= 1

    create_req = client.post(
        "/api/v1/apps/access-requests",
        json={
            "request_type": "AGY_LICENSE",
            "target_id": "agy-plus",
            "target_name": "Gemini Enterprise Plus (AGY)",
        },
    )
    assert create_req.status_code == 201
    assert create_req.json()["status"] == "PENDING_APPROVAL"

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
    assert "access_requests" in db_models.Base.metadata.tables


def test_sync_job_and_gcp_deployment_manifests(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Verifies Cloud Run sync_job entrypoint, 2-secret OAuth/SSL config, cloudbuild.yaml, and Terraform stack."""
    monkeypatch.setenv(
        "GOOGLE_OAUTH_CREDENTIALS",
        '{"web":{"client_id":"cid-from-secret.apps.googleusercontent.com","client_secret":"GOCSPX-secret"}}',
    )
    settings = config.get_settings()
    assert settings.google_client_id == "cid-from-secret.apps.googleusercontent.com"
    assert settings.google_client_secret == "GOCSPX-secret"

    result = sync_job.run_sync_job()
    assert result["status"] == "completed"
    assert result["trigger_source"] == "cloud_run_job"

    cloudbuild_user = (PROJECT_ROOT / "cloudbuild.yaml").read_text(
        encoding="utf-8"
    )
    assert "Dockerfile" in cloudbuild_user
    assert "ge-user-portal-repo" in cloudbuild_user
    assert "availableSecrets" in cloudbuild_user
    assert "ge-oauth-credentials" in cloudbuild_user
    assert "_SSL_CERTIFICATE_ID" in cloudbuild_user
    assert "_SSL_SECRET" not in cloudbuild_user

    deploy_script = (
        PROJECT_ROOT / "deploy" / "deploy_user_portal_gcp.sh"
    ).read_text(encoding="utf-8")
    assert "GCS_SOURCE_BUCKET" not in deploy_script
    assert "artifactregistry.googleapis.com" in deploy_script
    assert "ge-oauth-credentials" in deploy_script
    assert "SSL_CERTIFICATE_ID" in deploy_script
    assert "_SSL_SECRET" not in deploy_script

    tf_main = (
        PROJECT_ROOT / "deploy" / "terraform" / "main.tf"
    ).read_text(encoding="utf-8")
    assert "ge-user-portal-web" in tf_main
    assert "ge-user-portal-sync-job" in tf_main
    assert "geapphub-user-pg" in tf_main
    assert "INTERNAL_MANAGED" in tf_main
    assert "sa-user-portal-web" in tf_main
    assert "sa-user-portal-sync" in tf_main
    assert "google_artifact_registry_repository" in tf_main
    assert "resolved_ssl_certificate_id" in tf_main
    assert "GOOGLE_OAUTH_CREDENTIALS" in tf_main
    assert "user_portal_source_bucket" not in tf_main
    assert "google_privateca_ca_pool" not in tf_main
    assert "google_certificate_manager_certificate" not in tf_main
    assert "google_dns_managed_zone" not in tf_main
    assert "google_dns_record_set" not in tf_main


def test_user_backend_codebase_excludes_admin_and_duplicate_files() -> None:
    """Verifies user-portal/backend physically excludes admin, skills, agents, and mcp routers."""
    assert not (BACKEND_USER_ROOT / "app" / "routers" / "provisioning.py").exists()
    assert not (BACKEND_USER_ROOT / "app" / "routers" / "sync.py").exists()
    assert not (BACKEND_USER_ROOT / "app" / "routers" / "skills.py").exists()
    assert not (BACKEND_USER_ROOT / "app" / "routers" / "agents.py").exists()
    assert not (BACKEND_USER_ROOT / "app" / "routers" / "mcp_servers.py").exists()
    assert not (BACKEND_USER_ROOT / "skill_workflow_service").exists()
    assert not (
        BACKEND_USER_ROOT / "app" / "services" / "terraform_runner.py"
    ).exists()
    assert not (
        BACKEND_USER_ROOT / "app" / "services" / "ge_agent_publisher.py"
    ).exists()

    dockerfile_user = (PROJECT_ROOT / "Dockerfile").read_text(
        encoding="utf-8"
    )
    assert "backend" in dockerfile_user
    assert "frontend" in dockerfile_user
