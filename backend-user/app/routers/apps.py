"""FastAPI router for Gemini Enterprise application catalog endpoints."""

import datetime
import uuid

import fastapi
from sqlalchemy import orm

from app import auth
from app import config
from app import database
from app import db_models
from app import models
from app.services import catalog
from app.services import discovery
from app.services import firestore as firestore_service

router = fastapi.APIRouter(prefix="/api/v1/apps", tags=["catalog"])


def get_catalog_service(
    session: orm.Session = fastapi.Depends(database.get_db_session),
) -> catalog.CatalogService:
    """Provides a configured database-backed CatalogService instance.

    Args:
        session: Active SQLAlchemy database session.

    Returns:
        Configured CatalogService instance.
    """
    settings = config.get_settings()
    disc_service = discovery.DiscoveryEngineService(settings=settings)
    fs_service = firestore_service.FirestoreMetadataService(settings=settings)
    return catalog.CatalogService(
        discovery_service=disc_service,
        firestore_service=fs_service,
        session=session,
    )


@router.get("", response_model=models.CatalogResponse)
def list_apps(
    q: str | None = fastapi.Query(default=None, description="Search query"),
    category: str | None = fastapi.Query(
        default=None,
        description="Filter by business category",
    ),
    department: str | None = fastapi.Query(
        default=None,
        description="Filter by department",
    ),
    tag: str | None = fastapi.Query(
        default=None,
        description="Filter by capability tag",
    ),
    group: str | None = fastapi.Query(
        default=None,
        description="Filter by Cloud Identity group email",
    ),
    user: models.UserContext = fastapi.Depends(auth.resolve_current_user),
    catalog_service: catalog.CatalogService = fastapi.Depends(
        get_catalog_service
    ),
) -> models.CatalogResponse:
    """Returns the role-filtered, searchable list of GE applications."""
    all_visible = catalog_service.list_visible_applications(
        user_roles=user.roles,
        user_email=user.email,
        user_groups=user.groups or None,
    )
    filtered = catalog_service.list_applications(
        user_roles=user.roles,
        query=q,
        category=category,
        department=department,
        tag=tag,
        group=group,
        user_email=user.email,
        user_groups=user.groups or None,
    )
    categories = sorted({item.category for item in all_visible})
    departments = sorted({item.department for item in all_visible})
    groups: set[str] = set(user.groups)
    for item in all_visible:
        for role in item.allowed_roles:
            if role.startswith("group:"):
                groups.add(role.split(":", 1)[1].strip().lower())
    return models.CatalogResponse(
        items=filtered,
        total=len(filtered),
        categories=categories,
        departments=departments,
        groups=sorted(groups),
    )


@router.get("/requestable", response_model=models.CatalogResponse)
def list_requestable_apps(
    user: models.UserContext = fastapi.Depends(auth.resolve_current_user),
    catalog_service: catalog.CatalogService = fastapi.Depends(
        get_catalog_service
    ),
) -> models.CatalogResponse:
    """Returns GE applications that the current user does NOT have access to."""
    user_visible = catalog_service.list_visible_applications(
        user_roles=user.roles,
        user_email=user.email,
        user_groups=user.groups or None,
    )
    authorized_ids = {item.engine_id for item in user_visible}
    all_apps = catalog_service.list_visible_applications(
        user_roles=["__all_apps__"],
        user_email="admin@mohanrajs.demo.altostrat.com",
    )
    ungranted_apps = [
        item for item in all_apps if item.engine_id not in authorized_ids
    ]
    categories = sorted({item.category for item in ungranted_apps})
    departments = sorted({item.department for item in ungranted_apps})
    groups: set[str] = set()
    for item in ungranted_apps:
        for role in item.allowed_roles:
            if role.startswith("group:"):
                groups.add(role.split(":", 1)[1].strip().lower())
    return models.CatalogResponse(
        items=ungranted_apps,
        total=len(ungranted_apps),
        categories=categories,
        departments=departments,
        groups=sorted(groups),
    )


@router.get(
    "/access-requests",
    response_model=list[models.AccessRequestItem],
)
def list_access_requests(
    user: models.UserContext = fastapi.Depends(auth.resolve_current_user),
    session: orm.Session = fastapi.Depends(database.get_db_session),
) -> list[models.AccessRequestItem]:
    """Lists submitted app and AGY license access requests from PostgreSQL."""
    clean_email = (user.email or "").strip().lower()
    rows = (
        session.query(db_models.AccessRequestRecord)
        .filter_by(user_email=clean_email)
        .order_by(db_models.AccessRequestRecord.id.desc())
        .all()
    )
    return [
        models.AccessRequestItem(
            request_id=row.request_id,
            user_email=row.user_email,
            request_type=row.request_type,
            target_id=row.target_id,
            target_name=row.target_name,
            requested_group=row.requested_group,
            justification=row.justification,
            status=row.status,
            created_at=row.created_at.isoformat() if row.created_at else "",
        )
        for row in rows
    ]


@router.post(
    "/access-requests",
    response_model=models.AccessRequestItem,
    status_code=201,
)
def create_access_request(
    payload: models.AccessRequestCreate,
    user: models.UserContext = fastapi.Depends(auth.resolve_current_user),
    session: orm.Session = fastapi.Depends(database.get_db_session),
) -> models.AccessRequestItem:
    """Persists a request for GE Application access or an AGY License in PostgreSQL."""
    clean_email = (user.email or "employee@enterprise.example.com").strip().lower()
    existing = (
        session.query(db_models.AccessRequestRecord)
        .filter_by(
            user_email=clean_email,
            request_type=payload.request_type,
            target_id=payload.target_id,
        )
        .one_or_none()
    )
    if existing is not None:
        return models.AccessRequestItem(
            request_id=existing.request_id,
            user_email=existing.user_email,
            request_type=existing.request_type,
            target_id=existing.target_id,
            target_name=existing.target_name,
            requested_group=existing.requested_group,
            justification=existing.justification,
            status=existing.status,
            created_at=(
                existing.created_at.isoformat() if existing.created_at else ""
            ),
        )

    now = datetime.datetime.now(datetime.timezone.utc)
    record = db_models.AccessRequestRecord(
        request_id=f"req-{uuid.uuid4().hex[:8]}",
        user_email=clean_email,
        request_type=payload.request_type,
        target_id=payload.target_id,
        target_name=payload.target_name,
        requested_group=payload.requested_group,
        justification=payload.justification,
        status="PENDING_APPROVAL",
        created_at=now,
    )
    session.add(record)
    session.commit()
    return models.AccessRequestItem(
        request_id=record.request_id,
        user_email=record.user_email,
        request_type=record.request_type,
        target_id=record.target_id,
        target_name=record.target_name,
        requested_group=record.requested_group,
        justification=record.justification,
        status=record.status,
        created_at=now.isoformat(),
    )
