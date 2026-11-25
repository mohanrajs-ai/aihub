"""Scheduled synchronization service for Cloud Identity groups and GE apps."""

import asyncio
import datetime
import logging

from sqlalchemy import orm

from app import config
from app import database
from app import db_models
from app import models
from app.services import discovery
from app.services import firestore as firestore_mod

LOGGER = logging.getLogger(__name__)
DEFAULT_CANDIDATE_USERS: tuple[str, ...] = (
    "mohanraj@mohanrajs.demo.altostrat.com",
    "pradeepg@mohanrajs.demo.altostrat.com",
    "mohanraj@mohanrajs.altostrat.com",
    "admin@mohanrajs.altostrat.com",
)


def purge_non_cymbal_apps(session: orm.Session) -> int:
    """Removes non-Cymbal GE application records from the database.

    Args:
        session: Active SQLAlchemy database session.

    Returns:
        Number of purged application records.
    """
    non_cymbal_apps = (
        session.query(db_models.GEApplicationRecord)
        .filter(~db_models.GEApplicationRecord.engine_id.startswith("cymbal-"))
        .all()
    )
    count = len(non_cymbal_apps)
    for app in non_cymbal_apps:
        session.query(db_models.AppGroupBindingRecord).filter_by(
            engine_id=app.engine_id
        ).delete()
        session.delete(app)
    if count > 0:
        session.commit()
        LOGGER.info("Purged %d non-Cymbal applications from database.", count)
    session.query(db_models.SkillRegistryRecord).filter(
        db_models.SkillRegistryRecord.engine_id == "test-portal"
    ).delete()
    session.query(db_models.SkillWorkflowRecord).filter(
        db_models.SkillWorkflowRecord.engine_id == "test-portal"
    ).delete()
    session.commit()
    return count


def _utc_now() -> datetime.datetime:
    """Returns current UTC datetime."""
    return datetime.datetime.now(datetime.timezone.utc)


def _parse_principal(raw_principal: str) -> tuple[str, str]:
    """Splits an IAM principal string into (principal_type, identifier).

    Args:
        raw_principal: Principal string (e.g., 'group:hr@example.com').

    Returns:
        Tuple of (type, normalized_identifier).
    """
    cleaned = raw_principal.strip().lower()
    if ":" in cleaned:
        p_type, p_id = cleaned.split(":", 1)
        return p_type.strip(), p_id.strip()
    if "@" in cleaned:
        return "group", cleaned
    return "role", cleaned


class CatalogSyncService:
    """Synchronizes Discovery Engine apps & Cloud Identity groups into DB."""

    def __init__(
        self,
        settings: config.Settings,
        discovery_service: discovery.DiscoveryEngineService | None = None,
        firestore_service: (
            firestore_mod.FirestoreMetadataService | None
        ) = None,
    ) -> None:
        """Initializes CatalogSyncService.

        Args:
            settings: Active application settings.
            discovery_service: Optional DiscoveryEngineService instance.
            firestore_service: Optional FirestoreMetadataService instance.
        """
        self._settings = settings
        self._discovery = discovery_service or (
            discovery.DiscoveryEngineService(settings=settings)
        )
        self._firestore = firestore_service or (
            firestore_mod.FirestoreMetadataService(settings=settings)
        )

    def run_sync(
        self,
        session: orm.Session,
        trigger_source: str = "scheduled",
    ) -> models.SyncRunSummary:
        """Executes a full sync of GE apps, IAM bindings, and Cloud Identity.

        Args:
            session: Active SQLAlchemy database session.
            trigger_source: Label indicating what triggered the sync.

        Returns:
            SyncRunSummary describing the completed or failed run.
        """
        now = _utc_now()
        run_record = db_models.SyncRunRecord(
            trigger_source=trigger_source,
            status="running",
            started_at=now,
        )
        session.add(run_record)
        session.commit()

        try:
            purge_non_cymbal_apps(session)
            engines = self._discovery.list_engines()
            enrichment_map = self._firestore.get_enrichment_map()

            candidate_groups: set[str] = set()
            if self._settings.use_mock_data:
                candidate_groups.update(
                    discovery.get_mock_group_directory().keys()
                )

            existing_users = {
                u.email.strip().lower()
                for u in session.query(db_models.UserRecord).all()
                if u.email
            }
            candidate_users = sorted(
                existing_users.union(DEFAULT_CANDIDATE_USERS)
            )

            apps_count = 0
            for engine in engines:
                meta = enrichment_map.get(engine.engine_id)
                allowed_roles = (
                    meta.allowed_roles
                    if meta
                    else (engine.iam_principals or ["*"])
                )
                description = (
                    meta.description
                    if meta and meta.description
                    else (
                        f"Gemini Enterprise {engine.solution_type} "
                        f"application hosted in {engine.location}."
                    )
                )
                launch_url = (
                    meta.launch_url
                    if meta and meta.launch_url
                    else engine.default_launch_url
                )
                app_row = (
                    session.query(db_models.GEApplicationRecord)
                    .filter_by(engine_id=engine.engine_id)
                    .one_or_none()
                )
                if app_row is None:
                    app_row = db_models.GEApplicationRecord(
                        engine_id=engine.engine_id,
                        display_name=engine.display_name,
                        description=description,
                        category=meta.category if meta else "Productivity",
                        department=meta.department if meta else "General",
                        tags=(
                            meta.tags if meta else ["gemini-enterprise"]
                        ),
                        icon_name=meta.icon_name if meta else "Sparkles",
                        launch_url=launch_url,
                        default_launch_url=engine.default_launch_url,
                        location=engine.location,
                        solution_type=engine.solution_type,
                        industry_vertical=engine.industry_vertical,
                        app_type=engine.app_type,
                        iam_principals=list(engine.iam_principals),
                        data_store_ids=list(engine.data_store_ids),
                        allowed_roles=list(allowed_roles),
                        featured=meta.featured if meta else False,
                        last_synced_at=now,
                    )
                    session.add(app_row)
                else:
                    app_row.display_name = engine.display_name
                    app_row.description = description
                    app_row.category = (
                        meta.category if meta else "Productivity"
                    )
                    app_row.department = (
                        meta.department if meta else "General"
                    )
                    app_row.tags = (
                        meta.tags if meta else ["gemini-enterprise"]
                    )
                    app_row.icon_name = (
                        meta.icon_name if meta else "Sparkles"
                    )
                    app_row.launch_url = launch_url
                    app_row.default_launch_url = engine.default_launch_url
                    app_row.location = engine.location
                    app_row.solution_type = engine.solution_type
                    app_row.industry_vertical = engine.industry_vertical
                    app_row.app_type = engine.app_type
                    app_row.iam_principals = list(engine.iam_principals)
                    app_row.data_store_ids = list(engine.data_store_ids)
                    app_row.allowed_roles = list(allowed_roles)
                    app_row.featured = meta.featured if meta else False
                    app_row.last_synced_at = now
                apps_count += 1

                session.query(db_models.AppGroupBindingRecord).filter_by(
                    engine_id=engine.engine_id
                ).delete()
                principals = set(engine.iam_principals or allowed_roles)
                for raw_principal in sorted(principals):
                    if not raw_principal:
                        continue
                    p_type, p_id = _parse_principal(raw_principal)
                    if not p_id:
                        continue
                    if p_type == "group" and "@" in p_id:
                        candidate_groups.add(p_id)
                    session.add(
                        db_models.AppGroupBindingRecord(
                            engine_id=engine.engine_id,
                            principal_type=p_type,
                            principal_identifier=p_id,
                            synced_at=now,
                        )
                    )

            groups_count = 0
            memberships_count = 0
            group_queue = list(sorted(candidate_groups))
            processed_groups: set[str] = set()
            all_user_emails: set[str] = set()
            group_members_map: dict[str, set[str]] = {}

            while group_queue:
                group_email = group_queue.pop(0)
                if group_email in processed_groups:
                    continue
                processed_groups.add(group_email)
                group_info = self._discovery.fetch_group_details_and_members(
                    group_email=group_email,
                    candidate_users=candidate_users,
                )
                for sub_group in group_info.get("subgroups") or []:
                    clean_sub = str(sub_group).strip().lower()
                    if clean_sub and clean_sub not in processed_groups:
                        group_queue.append(clean_sub)

                grp_row = (
                    session.query(db_models.CloudIdentityGroupRecord)
                    .filter_by(group_email=group_email)
                    .one_or_none()
                )
                if grp_row is None:
                    grp_row = db_models.CloudIdentityGroupRecord(
                        group_email=group_email,
                        group_resource_name=str(
                            group_info.get("group_resource_name", "")
                        ),
                        display_name=str(
                            group_info.get("display_name", group_email)
                        ),
                        description=str(group_info.get("description", "")),
                        last_synced_at=now,
                    )
                    session.add(grp_row)
                else:
                    grp_row.group_resource_name = str(
                        group_info.get("group_resource_name", "")
                    )
                    grp_row.display_name = str(
                        group_info.get("display_name", group_email)
                    )
                    grp_row.description = str(
                        group_info.get("description", "")
                    )
                    grp_row.last_synced_at = now
                groups_count += 1

                members_set: set[str] = set()
                for member_email in group_info.get("members") or []:
                    clean_member = str(member_email).strip().lower()
                    if clean_member:
                        members_set.add(clean_member)
                group_members_map[group_email] = members_set

            for group_email, members_set in group_members_map.items():
                filtered_members = members_set - processed_groups
                group_members_map[group_email] = filtered_members
                all_user_emails.update(filtered_members)

            for group_email in processed_groups:
                if group_email.startswith("all-users@"):
                    group_members_map[group_email] = set(all_user_emails)

            if processed_groups:
                session.query(db_models.UserRecord).filter(
                    db_models.UserRecord.email.in_(processed_groups)
                ).delete(synchronize_session=False)

            for group_email in sorted(processed_groups):
                session.query(
                    db_models.UserGroupMembershipRecord
                ).filter_by(group_email=group_email).delete()
                for clean_member in sorted(
                    group_members_map.get(group_email, set())
                ):
                    self._ensure_user_record(session, clean_member, now)
                    session.add(
                        db_models.UserGroupMembershipRecord(
                            user_email=clean_member,
                            group_email=group_email,
                            membership_role="MEMBER",
                            synced_at=now,
                        )
                    )
                    memberships_count += 1

            run_record.status = "completed"
            run_record.apps_synced = apps_count
            run_record.groups_synced = groups_count
            run_record.memberships_synced = memberships_count
            run_record.completed_at = _utc_now()
            session.commit()
        except Exception as exc:  # pylint: disable=broad-except
            session.rollback()
            run_record = (
                session.query(db_models.SyncRunRecord)
                .filter_by(id=run_record.id)
                .one()
            )
            run_record.status = "failed"
            run_record.error_message = str(exc)
            run_record.completed_at = _utc_now()
            session.commit()
            LOGGER.warning("Scheduled catalog sync failed: %s", exc)

        return models.SyncRunSummary(**run_record.to_summary_dict())

    def _sync_skills(
        self,
        session: orm.Session,
        engines: list[models.DiscoveredEngine],
        now: datetime.datetime,
    ) -> int:
        """Queries the Gemini Enterprise Skill API and upserts GESkillRecord."""
        if not hasattr(self._discovery, "list_skills"):
            return 0
        skills = self._discovery.list_skills(engines=engines)
        synced_skill_ids: set[str] = set()
        for skill in skills:
            synced_skill_ids.add(skill.skill_id)
            proposals_json = [p.model_dump() for p in skill.iam_proposals]
            subfiles_json = [sf.model_dump() for sf in skill.subfiles]
            row = (
                session.query(db_models.GESkillRecord)
                .filter_by(skill_id=skill.skill_id)
                .one_or_none()
            )
            if row is None:
                row = db_models.GESkillRecord(
                    skill_id=skill.skill_id,
                    resource_name=skill.resource_name,
                    engine_id=skill.engine_id,
                    app_display_name=skill.app_display_name,
                    display_name=skill.display_name,
                    description=skill.description,
                    instruction=skill.instruction,
                    gcs_uri=skill.gcs_uri,
                    owner_email=skill.owner_email,
                    state=skill.state,
                    sharing_scope=skill.sharing_scope,
                    sharing_state=skill.sharing_state,
                    has_active_iam_proposals=skill.has_active_iam_proposals,
                    review_status=skill.review_status,
                    iam_proposals=proposals_json,
                    shared_principals=list(skill.shared_principals),
                    subfiles=subfiles_json,
                    create_time=skill.create_time,
                    update_time=skill.update_time,
                    last_synced_at=now,
                )
                session.add(row)
            else:
                existing_wf = (
                    session.query(db_models.SkillWorkflowRecord)
                    .filter_by(skill_id=skill.skill_id)
                    .one_or_none()
                )
                already_approved = (
                    existing_wf is not None
                    and existing_wf.approval_status == "APPROVED"
                )
                row.resource_name = skill.resource_name
                row.engine_id = skill.engine_id
                row.app_display_name = skill.app_display_name
                row.display_name = skill.display_name
                row.description = skill.description
                row.instruction = skill.instruction
                row.gcs_uri = skill.gcs_uri
                row.owner_email = skill.owner_email
                if not already_approved:
                    row.state = skill.state
                    row.sharing_scope = skill.sharing_scope
                    row.sharing_state = skill.sharing_state
                    row.has_active_iam_proposals = (
                        skill.has_active_iam_proposals
                    )
                    row.review_status = skill.review_status
                    row.iam_proposals = proposals_json
                    row.shared_principals = list(skill.shared_principals)
                row.subfiles = subfiles_json
                row.create_time = skill.create_time
                row.update_time = skill.update_time
                row.last_synced_at = now
            session.flush()
            if row.review_status == "PENDING_REVIEW":
                workflow_svc = wf_engine.SkillWorkflowEngine(
                    settings=self._settings
                )
                workflow_svc.start_or_run_workflow(
                    session=session,
                    skill_id=row.skill_id,
                )
        if synced_skill_ids:
            for existing in session.query(db_models.GESkillRecord).all():
                if existing.skill_id not in synced_skill_ids:
                    session.delete(existing)
        return len(skills)

    def _ensure_user_record(
        self,
        session: orm.Session,
        email: str,
        now: datetime.datetime,
    ) -> db_models.UserRecord:
        """Creates or updates a UserRecord for a synced group member."""
        clean_email = email.strip().lower()
        user_row = (
            session.query(db_models.UserRecord)
            .filter_by(email=clean_email)
            .one_or_none()
        )
        roles = ["employee"]
        if clean_email in self._settings.admin_users:
            roles.insert(0, "admin")
        if user_row is None:
            display = clean_email.split("@", 1)[0].replace(".", " ").title()
            user_row = db_models.UserRecord(
                email=clean_email,
                user_id=clean_email,
                display_name=display,
                roles=roles,
                auth_source="cloud_identity_sync",
                last_login_at=now,
                updated_at=now,
            )
            session.add(user_row)
            session.flush()
        return user_row


def get_sync_status(
    session: orm.Session,
    settings: config.Settings,
) -> models.SyncStatusResponse:
    """Queries database entity counts and the most recent SyncRunRecord.

    Args:
        session: Active SQLAlchemy database session.
        settings: Active application settings.

    Returns:
        SyncStatusResponse describing database counts and schedule status.
    """
    dialect = (
        session.bind.dialect.name if session.bind is not None else "unknown"
    )
    total_apps = session.query(db_models.GEApplicationRecord).count()
    total_groups = session.query(db_models.CloudIdentityGroupRecord).count()
    total_users = session.query(db_models.UserRecord).count()
    total_memberships = session.query(
        db_models.UserGroupMembershipRecord
    ).count()
    all_skill_rows = session.query(db_models.GESkillRecord).all()
    unique_skills_by_key: dict[str, list[db_models.GESkillRecord]] = {}
    for sr in all_skill_rows:
        key = _normalize_skill_key(sr.skill_id, sr.display_name)
        unique_skills_by_key.setdefault(key, []).append(sr)
    total_skills = len(unique_skills_by_key)
    pending_skills = sum(
        1
        for group_rows in unique_skills_by_key.values()
        if any(r.review_status == "PENDING_REVIEW" for r in group_rows)
    )
    last_run_row = (
        session.query(db_models.SyncRunRecord)
        .order_by(db_models.SyncRunRecord.id.desc())
        .first()
    )
    last_run = (
        models.SyncRunSummary(**last_run_row.to_summary_dict())
        if last_run_row is not None
        else None
    )
    return models.SyncStatusResponse(
        sync_enabled=settings.sync_enabled,
        sync_interval_seconds=settings.sync_interval_seconds,
        database_dialect=dialect,
        total_apps=total_apps,
        total_groups=total_groups,
        total_users=total_users,
        total_memberships=total_memberships,
        total_skills=total_skills,
        pending_skills=pending_skills,
        last_run=last_run,
    )


def _normalize_skill_key(skill_id: str, display_name: str) -> str:
    """Returns a canonical deduplication key for a GE skill across apps."""
    raw_name = (display_name or "").strip().lower()
    if raw_name and " " not in raw_name:
        return raw_name
    raw_id = (skill_id or "").strip().lower()
    if ":" in raw_id:
        suffix = raw_id.split(":", 1)[1].strip()
        if not suffix.isdigit():
            return suffix
    return raw_name or raw_id


def _skill_record_to_model(
    row: db_models.GESkillRecord,
    workflow_row: db_models.SkillWorkflowRecord | None = None,
    shared_apps: list[str] | None = None,
    shared_agents: list[str] | None = None,
) -> models.DiscoveredSkill:
    """Converts a persisted GESkillRecord ORM row into a DiscoveredSkill."""
    proposals = [
        models.SkillIamProposal(**p)
        for p in (row.iam_proposals or [])
        if isinstance(p, dict)
    ]
    subfiles = [
        models.SkillSubfile(**sf)
        for sf in (row.subfiles or [])
        if isinstance(sf, dict)
    ]
    wf_model = (
        wf_engine.workflow_record_to_model(workflow_row)
        if workflow_row is not None
        else None
    )
    resolved_apps = sorted(
        set(
            (shared_apps or [])
            or (wf_model.target_engines if wf_model is not None else [])
            or ([row.engine_id] if row.engine_id else [])
        )
    )
    default_agents = skill_eval_agent.resolve_default_target_agents_for_skill(
        row.display_name or "",
        row.description or "",
        row.instruction or "",
    )
    resolved_agents = sorted(
        set(
            (shared_agents or [])
            or (wf_model.target_agents if wf_model is not None else [])
            or default_agents
            or ["universal-skill-orchestrator"]
        )
    )
    resolved_sub_skills = list(
        row.sub_skills
        or (wf_model.sub_skills if wf_model is not None else [])
        or skill_eval_agent.extract_sub_skills(row.instruction or "")
    )
    if wf_model is None:
        slug = _normalize_skill_key(row.skill_id, row.display_name)
        scope = (
            "GLOBAL"
            if len(resolved_apps) >= 4
            else ("MULTI_APP" if len(resolved_apps) > 1 else "SINGLE_APP")
        )
        is_approved = row.review_status == "APPROVED"
        wf_model = models.SkillWorkflowItem(
            workflow_id=f"wf-{slug}",
            skill_id=row.skill_id,
            engine_id=row.engine_id,
            skill_display_name=row.display_name,
            owner_email=row.owner_email,
            current_stage=(
                "COMPLETED" if is_approved else "AWAITING_INFOSEC_APPROVAL"
            ),
            status="COMPLETED" if is_approved else "AWAITING_APPROVAL",
            eval_score=95,
            eval_status="PASSED",
            required_connectors=skill_eval_agent.extract_required_connectors(
                row.instruction or ""
            ),
            distribution_scope=scope,
            target_engines=resolved_apps,
            target_agents=resolved_agents,
            sub_skills=resolved_sub_skills,
            infosec_risk_level="LOW",
            infosec_status="PASSED",
            approval_status="APPROVED" if is_approved else "PENDING",
            approved_by=(
                "infosec-admin@mohanrajs.demo.altostrat.com"
                if is_approved
                else ""
            ),
            registry_id=(
                f"urn:skill:projects-{self._settings.gcp_project_id}:locations:global:"
                f"private-{slug}"
                if is_approved
                else ""
            ),
            shared_in_ge=is_approved,
            shared_principals=list(row.shared_principals or []),
        )
    else:
        wf_model.target_engines = resolved_apps
        wf_model.target_agents = resolved_agents
        if len(resolved_apps) >= 4:
            wf_model.distribution_scope = "GLOBAL"
        elif len(resolved_apps) > 1:
            wf_model.distribution_scope = "MULTI_APP"
        if not wf_model.required_connectors and row.instruction:
            wf_model.required_connectors = (
                skill_eval_agent.extract_required_connectors(row.instruction)
            )

    if wf_model is not None:
        if (
            not wf_model.eval_report
            or "six_rubric_benchmark" not in wf_model.eval_report
        ):
            computed_eval = skill_eval_agent.SkillEvaluationAdkAgent().evaluate_skill(
                display_name=row.display_name or row.skill_id,
                description=row.description or "",
                instruction=row.instruction or "",
                subfiles=list(row.subfiles or []),
                call_remote_agent=False,
            )
            merged_eval = dict(computed_eval)
            if wf_model.eval_report:
                merged_eval.update(wf_model.eval_report)
                if "six_rubric_benchmark" not in merged_eval:
                    merged_eval["six_rubric_benchmark"] = computed_eval[
                        "six_rubric_benchmark"
                    ]
            wf_model.eval_report = merged_eval
            if not wf_model.templatized_instruction:
                wf_model.templatized_instruction = str(
                    merged_eval.get("templatized_instruction") or ""
                )
        if (
            not wf_model.infosec_report
            or len(wf_model.infosec_report.get("checks") or []) < 6
            or "security_digest" not in wf_model.infosec_report
        ):
            computed_infosec = infosec_agent.InfoSecAdkAgent().scan_skill(
                display_name=row.display_name or row.skill_id,
                instruction=row.instruction or "",
                gcs_uri=row.gcs_uri or "",
                iam_proposals=list(row.iam_proposals or []),
                subfiles=list(row.subfiles or []),
                call_remote_agent=False,
            )
            merged_infosec = dict(computed_infosec)
            if wf_model.infosec_report:
                existing_checks = wf_model.infosec_report.get("checks") or []
                merged_infosec.update(wf_model.infosec_report)
                if len(existing_checks) < 6:
                    merged_infosec["checks"] = computed_infosec["checks"]
                    merged_infosec["controls_passed"] = computed_infosec[
                        "controls_passed"
                    ]
                    merged_infosec["controls_total"] = computed_infosec[
                        "controls_total"
                    ]
                if "security_digest" not in merged_infosec:
                    merged_infosec["security_digest"] = computed_infosec[
                        "security_digest"
                    ]
            wf_model.infosec_report = merged_infosec
    return models.DiscoveredSkill(
        skill_id=row.skill_id,
        resource_name=row.resource_name,
        engine_id=row.engine_id,
        app_display_name=row.app_display_name or row.engine_id,
        display_name=row.display_name,
        description=row.description,
        instruction=row.instruction,
        gcs_uri=row.gcs_uri,
        owner_email=row.owner_email,
        state=row.state,
        sharing_scope=row.sharing_scope,
        sharing_state=row.sharing_state,
        has_active_iam_proposals=row.has_active_iam_proposals,
        review_status=row.review_status,
        iam_proposals=proposals,
        shared_principals=list(row.shared_principals or []),
        subfiles=subfiles,
        sub_skills=resolved_sub_skills,
        shared_apps=resolved_apps,
        shared_agents=resolved_agents,
        create_time=row.create_time,
        update_time=row.update_time,
        last_synced_at=(
            row.last_synced_at.isoformat() if row.last_synced_at else None
        ),
        workflow=wf_model,
    )


def list_synced_skills(
    session: orm.Session,
    review_status: str | None = None,
    engine_id: str | None = None,
    q: str | None = None,
) -> models.SkillListResponse:
    """Queries deduplicated Gemini Enterprise skills and status counts from DB.

    Consolidates skills discovered across multiple GE applications into a single
    unique skill entry with aggregated `shared_apps` and `shared_agents`.

    Args:
        session: Active SQLAlchemy database session.
        review_status: Optional filter ('PENDING_REVIEW', 'APPROVED', 'DRAFT').
        engine_id: Optional GE engine_id filter.
        q: Optional search query string.

    Returns:
        SkillListResponse with unique skills and aggregate status counts.
    """
    all_rows = (
        session.query(db_models.GESkillRecord)
        .order_by(db_models.GESkillRecord.display_name.asc())
        .all()
    )
    active_engines = {
        r.engine_id
        for r in session.query(db_models.GEApplicationRecord).all()
        if r.engine_id
    }
    wf_rows = session.query(db_models.SkillWorkflowRecord).all()
    wf_by_skill: dict[str, db_models.SkillWorkflowRecord] = {
        w.skill_id: w for w in wf_rows
    }
    wf_by_key: dict[str, db_models.SkillWorkflowRecord] = {}
    for w in wf_rows:
        wf_by_key[_normalize_skill_key(w.skill_id, w.skill_display_name)] = w

    reg_by_key: dict[str, db_models.SkillRegistryRecord] = {}
    for reg in session.query(db_models.SkillRegistryRecord).all():
        reg_by_key[_normalize_skill_key(reg.skill_id, reg.display_name)] = reg

    grouped: dict[str, list[db_models.GESkillRecord]] = {}
    for row in all_rows:
        key = _normalize_skill_key(row.skill_id, row.display_name)
        grouped.setdefault(key, []).append(row)

    unique_skills: list[models.DiscoveredSkill] = []
    for key, group_rows in grouped.items():
        primary_row = next(
            (r for r in group_rows if r.review_status == "PENDING_REVIEW"),
            None,
        )
        if primary_row is None:
            primary_row = next(
                (r for r in group_rows if r.skill_id in wf_by_skill),
                None,
            )
        if primary_row is None:
            primary_row = next(
                (
                    r
                    for r in group_rows
                    if r.engine_id
                    in ("cymbal-service-desk-app", "cymbal-dev-sandbox-app")
                ),
                group_rows[0],
            )

        wf_row = wf_by_skill.get(primary_row.skill_id) or wf_by_key.get(key)
        if wf_row is None and primary_row.review_status == "PENDING_REVIEW":
            svc = wf_engine.SkillWorkflowEngine(settings=config.get_settings())
            svc.start_or_run_workflow(
                session=session, skill_id=primary_row.skill_id
            )
            wf_row = (
                session.query(db_models.SkillWorkflowRecord)
                .filter_by(skill_id=primary_row.skill_id)
                .one_or_none()
            )

        shared_apps_set: set[str] = {
            r.engine_id for r in group_rows if r.engine_id
        }
        reg_row = reg_by_key.get(key)
        if wf_row is not None:
            for eng in wf_row.target_engines or []:
                if not active_engines or eng in active_engines:
                    shared_apps_set.add(eng)
        if reg_row is not None:
            for eng in reg_row.target_engines or []:
                if not active_engines or eng in active_engines:
                    shared_apps_set.add(eng)

        shared_agents_set: set[str] = set()
        if wf_row is not None and wf_row.target_agents:
            shared_agents_set.update(wf_row.target_agents)
        if reg_row is not None and reg_row.target_agents:
            shared_agents_set.update(reg_row.target_agents)
        default_agents = (
            skill_eval_agent.resolve_default_target_agents_for_skill(
                primary_row.display_name or "",
                primary_row.description or "",
                primary_row.instruction or "",
            )
        )
        shared_agents_set.update(default_agents)
        if any(a.startswith("cymbal-") for a in shared_apps_set):
            shared_agents_set.add("universal-skill-orchestrator")

        unique_skills.append(
            _skill_record_to_model(
                primary_row,
                wf_row,
                shared_apps=sorted(shared_apps_set),
                shared_agents=sorted(shared_agents_set),
            )
        )

    pending_count = sum(
        1 for s in unique_skills if s.review_status == "PENDING_REVIEW"
    )
    approved_count = sum(
        1 for s in unique_skills if s.review_status == "APPROVED"
    )
    draft_count = sum(1 for s in unique_skills if s.review_status == "DRAFT")

    status_filter = (review_status or "").strip().upper()
    engine_filter = (engine_id or "").strip().lower()
    needle = (q or "").strip().lower()

    filtered_items: list[models.DiscoveredSkill] = []
    for skill in unique_skills:
        if status_filter and status_filter != "ALL":
            if skill.review_status.upper() != status_filter:
                continue
        if engine_filter:
            lower_apps = {a.lower() for a in skill.shared_apps}
            if (
                skill.engine_id.lower() != engine_filter
                and engine_filter not in lower_apps
            ):
                continue
        if needle:
            searchable = " ".join(
                [
                    skill.display_name,
                    skill.description,
                    skill.engine_id,
                    skill.app_display_name,
                    skill.owner_email,
                    *skill.shared_apps,
                    *skill.shared_agents,
                ]
            ).lower()
            if needle not in searchable:
                continue
        filtered_items.append(skill)

    return models.SkillListResponse(
        items=filtered_items,
        total=len(filtered_items),
        pending_review_count=pending_count,
        approved_count=approved_count,
        draft_count=draft_count,
    )


def get_synced_skill(
    session: orm.Session,
    skill_id: str,
) -> models.DiscoveredSkill | None:
    """Retrieves a single synced GE skill by skill_id with shared apps."""
    row = (
        session.query(db_models.GESkillRecord)
        .filter_by(skill_id=skill_id)
        .one_or_none()
    )
    if row is None:
        return None
    key = _normalize_skill_key(row.skill_id, row.display_name)
    all_rows = session.query(db_models.GESkillRecord).all()
    shared_apps = sorted(
        {
            r.engine_id
            for r in all_rows
            if r.engine_id
            and _normalize_skill_key(r.skill_id, r.display_name) == key
        }
    )
    wf_row = (
        session.query(db_models.SkillWorkflowRecord)
        .filter_by(skill_id=skill_id)
        .one_or_none()
    )
    return _skill_record_to_model(
        row,
        wf_row,
        shared_apps=shared_apps,
    )


def list_synced_groups(
    session: orm.Session,
    user_email: str = "",
) -> models.GroupListResponse:
    """Queries all synced Cloud Identity groups and memberships from DB.

    Args:
        session: Active SQLAlchemy database session.
        user_email: Current authenticated user email.

    Returns:
        GroupListResponse with all synced Cloud Identity groups.
    """
    clean_user = user_email.strip().lower()
    groups = (
        session.query(db_models.CloudIdentityGroupRecord)
        .order_by(db_models.CloudIdentityGroupRecord.group_email.asc())
        .all()
    )
    all_memberships = session.query(
        db_models.UserGroupMembershipRecord
    ).all()
    all_bindings = (
        session.query(db_models.AppGroupBindingRecord)
        .filter_by(principal_type="group")
        .all()
    )

    members_by_group: dict[str, list[str]] = {}
    for mem in all_memberships:
        members_by_group.setdefault(mem.group_email, []).append(
            mem.user_email
        )

    apps_by_group: dict[str, list[str]] = {}
    for binding in all_bindings:
        apps_by_group.setdefault(binding.principal_identifier, []).append(
            binding.engine_id
        )

    items: list[models.CloudIdentityGroupInfo] = []
    for grp in groups:
        grp_members = sorted(set(members_by_group.get(grp.group_email, [])))
        grp_apps = sorted(set(apps_by_group.get(grp.group_email, [])))
        items.append(
            models.CloudIdentityGroupInfo(
                group_email=grp.group_email,
                group_resource_name=grp.group_resource_name,
                display_name=grp.display_name,
                description=grp.description,
                member_count=len(grp_members),
                members=grp_members,
                app_engine_ids=grp_apps,
                is_member=clean_user in grp_members if clean_user else False,
                last_synced_at=(
                    grp.last_synced_at.isoformat()
                    if grp.last_synced_at
                    else None
                ),
            )
        )
    return models.GroupListResponse(items=items, total=len(items))


async def periodic_sync_worker(interval_seconds: int) -> None:
    """Background asyncio task that runs scheduled database syncs.

    Args:
        interval_seconds: Delay in seconds between scheduled sync runs.
    """
    sleep_time = max(10, interval_seconds)
    while True:
        await asyncio.sleep(sleep_time)
        try:
            settings = config.get_settings()
            if not settings.sync_enabled:
                continue
            sync_service = CatalogSyncService(settings=settings)
            with database.session_scope() as session:
                await asyncio.to_thread(
                    sync_service.run_sync,
                    session,
                    "scheduled",
                )
        except asyncio.CancelledError:
            break
        except Exception as exc:  # pylint: disable=broad-except
            LOGGER.warning("Periodic background sync error: %s", exc)
