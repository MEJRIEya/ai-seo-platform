import asyncio
import logging
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.core.celery_app import celery_app
from app.core.config import settings
from app.models.audit import Audit
from app.models.site import Site
from app.services.pagespeed_service import run_pagespeed
from app.services.psi_service import run_pagespeed  


logger = logging.getLogger(__name__)

SYNC_DB_URL = settings.DATABASE_URL.replace("+asyncpg", "").replace(
    "postgresql+asyncpg", "postgresql"
)
# Si déjà postgresql:// après replace asyncpg :
if SYNC_DB_URL.startswith("postgresql+"):
    SYNC_DB_URL = settings.DATABASE_URL.replace("+asyncpg", "")

engine = create_engine(SYNC_DB_URL)


def _run_async(coro):
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # Sous Windows / certains contextes Celery
            return asyncio.run(coro)
    except RuntimeError:
        pass
    return asyncio.run(coro)


@celery_app.task(name="app.tasks.audit.run_free_audit_task")
def run_free_audit_task(audit_id: str):
    with Session(engine) as db:
        audit = db.get(Audit, UUID(audit_id))
        if not audit:
            logger.error("Audit %s introuvable", audit_id)
            return

        site = db.get(Site, audit.site_id)
        if not site:
            audit.status = "failed"
            audit.error_message = "Site introuvable"
            db.commit()
            return

        audit.status = "running"
        db.commit()

        try:
            url = site.domain        # PLUS besoin de _run_async pour PSI :
            mobile = run_pagespeed(url, "mobile")
            desktop = run_pagespeed(url, "desktop")


            sm = mobile["summary"]
            sd = desktop["summary"]

            audit.psi_mobile = mobile
            audit.psi_desktop = desktop
            audit.score_performance_mobile = sm.get("performance")
            audit.score_performance_desktop = sd.get("performance")
            audit.score_seo = sm.get("seo") or sd.get("seo")

            scores = [
                s
                for s in [
                    audit.score_performance_mobile,
                    audit.score_performance_desktop,
                    audit.score_seo,
                ]
                if s is not None
            ]
            audit.score_global = int(sum(scores) / len(scores)) if scores else None
            audit.status = "done"
            audit.finished_at = datetime.now(timezone.utc)
            db.commit()
            logger.info("Audit free OK site=%s audit=%s", site.domain, audit_id)
        except Exception as e:
            logger.exception("Audit failed %s", audit_id)
            audit.status = "failed"
            audit.error_message = str(e)[:2000]
            audit.finished_at = datetime.now(timezone.utc)
            db.commit()