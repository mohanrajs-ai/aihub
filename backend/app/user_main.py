"""Standalone FastAPI entrypoint for the User Portal deployment."""

import pathlib

import fastapi

from app import main


def create_user_app(
    static_dir: pathlib.Path | None = None,
) -> fastapi.FastAPI:
    """Creates the standalone User Portal FastAPI application instance.

    Args:
        static_dir: Optional override directory for compiled User Portal assets.

    Returns:
        Configured User Portal FastAPI application.
    """
    return main.create_app(static_dir=static_dir, portal_mode="user")


app = create_user_app()
