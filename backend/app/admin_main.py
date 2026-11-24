"""Standalone FastAPI entrypoint for the Admin Console deployment."""

import pathlib

import fastapi

from app import main


def create_admin_app(
    static_dir: pathlib.Path | None = None,
) -> fastapi.FastAPI:
    """Creates the standalone Admin Console FastAPI application instance.

    Args:
        static_dir: Optional override directory for compiled Admin SPA assets.

    Returns:
        Configured Admin Console FastAPI application.
    """
    return main.create_app(static_dir=static_dir, portal_mode="admin")


app = create_admin_app()
