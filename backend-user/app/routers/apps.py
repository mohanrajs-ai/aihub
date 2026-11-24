"""FastAPI router for Gemini Enterprise application catalog endpoints."""

import datetime
import uuid

import fastapi
from sqlalchemy import orm

from app import auth
from app import config
from app import database
from app import models
from app.services import catalog
from app.services import discovery
from app.services import firestore as firestore_service

router = fastapi.APIRouter(prefix="/api/v1/apps", tags=["catalog"])

_ACCESS_REQUESTS_STORE: list[models.AccessRequestItem] = []


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
) -> list[models.AccessRequestItem]:
    """Lists submitted app and AGY license access requests for the user."""
    clean_email = (user.email or "").strip().lower()
    return [
        req
        for req in _ACCESS_REQUESTS_STORE
        if req.user_email.lower() == clean_email
    ]


@router.post(
    "/access-requests",
    response_model=models.AccessRequestItem,
    status_code=201,
)
def create_access_request(
    payload: models.AccessRequestCreate,
    user: models.UserContext = fastapi.Depends(auth.resolve_current_user),
) -> models.AccessRequestItem:
    """Submits a request for GE Application access or an AGY License."""
    clean_email = (user.email or "employee@enterprise.example.com").strip().lower()
    for existing in _ACCESS_REQUESTS_STORE:
        if (
            existing.user_email.lower() == clean_email
            and existing.request_type == payload.request_type
            and existing.target_id == payload.target_id
        ):
            return existing

    item = models.AccessRequestItem(
        request_id=f"req-{uuid.uuid4().hex[:8]}",
        user_email=clean_email,
        request_type=payload.request_type,
        target_id=payload.target_id,
        target_name=payload.target_name,
        requested_group=payload.requested_group,
        justification=payload.justification,
        status="PENDING_APPROVAL",
        created_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),
    )
    _ACCESS_REQUESTS_STORE.append(item)
    return item
