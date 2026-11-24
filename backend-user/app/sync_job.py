"""Cloud Run Job CLI entrypoint (`python -m app.sync_job`) for User Portal DB sync.

Triggered every 15 minutes by Cloud Scheduler to synchronize Discovery Engine
applications and Cloud Identity group memberships into `geapphub_user`.
"""

import json
import sys

from app import config
from app import database
from app.services import sync as sync_service


def run_sync_job() -> dict[str, object]:
    """Initializes schema and runs one catalog & group sync pass."""
    settings = config.get_settings()
    database.init_db()
    with database.session_scope() as session:
        svc = sync_service.CatalogSyncService(settings=settings)
        summary = svc.run_sync(session=session, trigger_source="cloud_run_job")
        return summary.model_dump()


def main() -> int:
    """CLI entrypoint for the Cloud Run Job."""
    result = run_sync_job()
    print(json.dumps(result))
    return 0 if result.get("status") == "completed" else 1


if __name__ == "__main__":
    sys.exit(main())
