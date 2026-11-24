"""User-facing Skill Registry & Submission router for the User Portal (`backend-user`)."""

import fastapi
from sqlalchemy import orm

from app import auth
from app import config
from app import database
from app import db_models
from app import models
from skill_workflow_service import engine as wf_engine
from skill_workflow_service.agents import ge_discovery_llm
from skill_workflow_service.agents import skill_eval_agent

router = fastapi.APIRouter(tags=["skill-workflows"])


@router.get(
    "/api/v1/workflows/skills",
    response_model=models.SkillWorkflowListResponse,
)
def list_skill_workflows(
    session: orm.Session = fastapi.Depends(database.get_db_session),
) -> models.SkillWorkflowListResponse:
    """Lists skill governance workflows."""
    rows = (
        session.query(db_models.SkillWorkflowRecord)
        .order_by(db_models.SkillWorkflowRecord.id.desc())
        .all()
    )
    items = [wf_engine.workflow_record_to_model(r) for r in rows]
    return models.SkillWorkflowListResponse(items=items, total=len(items))


@router.post(
    "/api/v1/workflows/skills/start",
    response_model=models.SkillWorkflowItem,
)
def start_skill_workflow(
    payload: models.SkillWorkflowStartRequest,
    session: orm.Session = fastapi.Depends(database.get_db_session),
) -> models.SkillWorkflowItem:
    """Submits a skill into the governance evaluation queue."""
    eng = wf_engine.SkillWorkflowEngine(settings=config.get_settings())
    try:
        return eng.start_or_run_workflow(
            session=session,
            skill_id=payload.skill_id,
            force_restart=True,
            target_engines=payload.target_engines or None,
            target_agents=payload.target_agents or None,
        )
    except ValueError as exc:
        raise fastapi.HTTPException(
            status_code=404, detail=str(exc)
        ) from exc


@router.get(
    "/api/v1/workflows/skills/{skill_id}",
    response_model=models.SkillWorkflowItem,
)
def get_skill_workflow(
    skill_id: str,
    session: orm.Session = fastapi.Depends(database.get_db_session),
) -> models.SkillWorkflowItem:
    """Returns workflow status and evaluation report for a skill."""
    row = (
        session.query(db_models.SkillWorkflowRecord)
        .filter_by(skill_id=skill_id)
        .one_or_none()
    )
    if row is None:
        eng = wf_engine.SkillWorkflowEngine(settings=config.get_settings())
        try:
            return eng.start_or_run_workflow(
                session=session, skill_id=skill_id
            )
        except ValueError as exc:
            raise fastapi.HTTPException(
                status_code=404, detail=str(exc)
            ) from exc
    return wf_engine.workflow_record_to_model(row)


@router.get(
    "/api/v1/registry/skills",
    response_model=models.SkillRegistryListResponse,
)
def list_registry_skills(
    session: orm.Session = fastapi.Depends(database.get_db_session),
) -> models.SkillRegistryListResponse:
    """Lists all vetted and approved skills published in the Skill Registry."""
    rows = (
        session.query(db_models.SkillRegistryRecord)
        .order_by(db_models.SkillRegistryRecord.id.desc())
        .all()
    )
    active_engines = {
        r.engine_id
        for r in session.query(db_models.GEApplicationRecord).all()
        if r.engine_id
    }
    apps_by_skill_slug: dict[str, set[str]] = {}
    for sr in session.query(db_models.GESkillRecord).all():
        slug = (
            sr.skill_id.split(":", 1)[1].strip().lower()
            if ":" in sr.skill_id
            else sr.skill_id.strip().lower()
        )
        name_slug = (sr.display_name or "").strip().lower()
        if sr.engine_id:
            apps_by_skill_slug.setdefault(slug, set()).add(sr.engine_id)
            if name_slug:
                apps_by_skill_slug.setdefault(name_slug, set()).add(
                    sr.engine_id
                )

    seen_slugs: set[str] = set()
    items: list[models.SkillRegistryItem] = []
    for r in rows:
        slug = (
            r.skill_id.split(":", 1)[1].strip().lower()
            if ":" in r.skill_id
            else r.skill_id.strip().lower()
        )
        if slug in seen_slugs:
            continue
        seen_slugs.add(slug)

        discovered_apps = apps_by_skill_slug.get(slug, set())
        merged_engines: set[str] = set(discovered_apps)
        for eng in r.target_engines or ([r.engine_id] if r.engine_id else []):
            if (
                not active_engines
                or not discovered_apps
                or eng in active_engines
            ):
                merged_engines.add(eng)
        if not merged_engines and r.engine_id:
            merged_engines.add(r.engine_id)

        merged_agents: set[str] = set(r.target_agents or [])
        if any(a.startswith("cymbal-") for a in merged_engines):
            merged_agents.add("universal-skill-orchestrator")

        primary_eng = (
            sorted(merged_engines)[0] if merged_engines else r.engine_id
        )
        items.append(
            models.SkillRegistryItem(
                registry_id=r.registry_id,
                skill_id=r.skill_id,
                resource_name=r.resource_name,
                engine_id=primary_eng,
                app_display_name=r.app_display_name,
                display_name=r.display_name,
                description=r.description,
                instruction=r.instruction,
                version=r.version,
                owner_email=r.owner_email,
                eval_score=r.eval_score,
                infosec_risk_level=r.infosec_risk_level,
                approved_by=r.approved_by,
                shared_principals=list(r.shared_principals or []),
                required_connectors=list(r.required_connectors or []),
                target_engines=sorted(merged_engines),
                distributed_apps=list(r.distributed_apps or []),
                target_agents=sorted(merged_agents),
                target_agent_evaluations=list(
                    r.target_agent_evaluations or []
                ),
                distributed_agents=list(r.distributed_agents or []),
                sub_skills=list(r.sub_skills or []),
                published_at=(
                    r.published_at.isoformat() if r.published_at else None
                ),
            )
        )
    return models.SkillRegistryListResponse(items=items, total=len(items))


@router.post(
    "/api/v1/skills/seed-catalog",
    response_model=models.SkillCatalogSeedResponse,
)
def seed_skills_catalog_endpoint(
    session: orm.Session = fastapi.Depends(database.get_db_session),
) -> models.SkillCatalogSeedResponse:
    """Seeds atomic sub-skills and composite parent skills from catalog."""
    seeded = ge_discovery_llm.seed_composite_skills_catalog(session)
    return models.SkillCatalogSeedResponse(
        seeded_skills=seeded,
        total_seeded=len(seeded),
    )


@router.post("/api/v1/skills/{skill_id}/benchmark")
def benchmark_skill_control_plane(
    skill_id: str,
    engine_id: str = "cymbal-service-desk-app",
    session: orm.Session = fastapi.Depends(database.get_db_session),
) -> dict[str, object]:
    """Runs the 6-Rubric Pre-Deploy Benchmark & generates eval dataset."""
    row = (
        session.query(db_models.GESkillRecord)
        .filter_by(skill_id=skill_id)
        .one_or_none()
    )
    if row is None:
        raise fastapi.HTTPException(
            status_code=404, detail=f"Skill '{skill_id}' not found."
        )
    eval_agent = skill_eval_agent.SkillEvaluationAdkAgent()
    return eval_agent.run_six_rubric_benchmark(
        skill_id=row.skill_id,
        display_name=row.display_name,
        description=row.description,
        instruction=row.instruction,
        engine_id=engine_id or row.engine_id,
    )


@router.post(
    "/api/v1/skills/orchestrate",
    response_model=models.SkillOrchestrateResponse,
)
def orchestrate_skill_endpoint(
    payload: models.SkillOrchestrateRequest,
    request: fastapi.Request,
    user: models.UserContext = fastapi.Depends(auth.resolve_current_user),
    session: orm.Session = fastapi.Depends(database.get_db_session),
) -> models.SkillOrchestrateResponse:
    """Executes a Parent Skill and its Sub-Skills via GE :streamAssist."""
    svc = ge_discovery_llm.UniversalSkillOrchestratorService(
        settings=config.get_settings()
    )
    try:
        return svc.orchestrate_skill(
            session=session,
            payload=payload,
            calling_user_email=user.email,
            request_headers=dict(request.headers),
        )
    except ValueError as exc:
        raise fastapi.HTTPException(
            status_code=404, detail=str(exc)
        ) from exc
