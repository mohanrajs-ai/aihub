"""Standalone FastAPI application entrypoint for the User Portal (`backend-user`)."""

import contextlib
import pathlib
from collections import abc

import fastapi
from fastapi import responses
from fastapi import staticfiles
from fastapi.middleware import cors

from app import auth
from app import config
from app import database
from app import models
from app.routers import apps
from app.routers import auth as auth_router
from app.routers import groups as groups_router

PORTAL_ROOT = pathlib.Path(__file__).resolve().parents[2]
DEFAULT_FRONTEND_DIST = PORTAL_ROOT / "frontend" / "dist"


@contextlib.asynccontextmanager
async def _app_lifespan(
    _app: fastapi.FastAPI,
) -> abc.AsyncIterator[None]:
    """Initializes database schema for the User Portal service."""
    database.init_db()
    yield


def create_app(
    static_dir: pathlib.Path | None = None,
) -> fastapi.FastAPI:
    """Creates and configures the standalone User Portal FastAPI application.

    Args:
        static_dir: Optional directory containing compiled User Portal SPA files.

    Returns:
        Configured FastAPI application.
    """
    application = fastapi.FastAPI(
        title="Gemini Enterprise AppHub — User Portal API",
        description=(
            "Standalone User Portal API for discovering and launching "
            "Gemini Enterprise applications."
        ),
        version="0.1.0",
        lifespan=_app_lifespan,
    )

    application.add_middleware(
        cors.CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @application.get("/api/v1/health", tags=["system"])
    def health_check() -> dict[str, str]:
        """Returns service health status and current execution mode."""
        settings = config.get_settings()
        mode = "mock" if settings.use_mock_data else "live"
        return {
            "status": "ok",
            "service": "ge-apphub-backend",
            "portal_mode": "user",
            "mode": mode,
            "gcp_project_id": settings.gcp_project_id,
        }

    @application.get(
        "/api/v1/me",
        response_model=models.UserContext,
        tags=["auth"],
    )
    def get_current_user(
        user: models.UserContext = fastapi.Depends(auth.resolve_current_user),
    ) -> models.UserContext:
        """Returns the resolved identity and roles for the current user."""
        return user

    application.include_router(auth_router.router)
    application.include_router(apps.router)
    application.include_router(groups_router.router)

    resolved_dist = static_dir or DEFAULT_FRONTEND_DIST
    index_html = resolved_dist / "index.html"
    assets_dir = resolved_dist / "assets"
    if assets_dir.is_dir():
        application.mount(
            "/assets",
            staticfiles.StaticFiles(directory=str(assets_dir)),
            name="assets",
        )
    if index_html.is_file():
        @application.get("/", include_in_schema=False)
        def serve_spa_root() -> responses.FileResponse:
            """Serves the compiled User Portal React SPA entrypoint."""
            return responses.FileResponse(str(index_html))

    return application


app = create_app()
