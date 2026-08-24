import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.utils.auth import get_current_user
from app.models.user import User
from app.models.site import Site
from app.models.recommendation import Recommendation, Status
from app.tasks.recommendations import generer_recommandations_task
from app.models.subscription import Subscription
from app.core.plans import PLANS

router = APIRouter(prefix="/api", tags=["recommendations"])


async def _get_owned_site(
    site_id: uuid.UUID, current_user: User, db: AsyncSession
) -> Site:
    result = await db.execute(
        select(Site).where(Site.id == site_id, Site.user_id == current_user.id)
    )
    site = result.scalar_one_or_none()
    if site is None:
        raise HTTPException(status_code=404, detail="Site introuvable")
    return site


@router.get("/sites/{site_id}/recommendations")
async def get_recommendations(
    site_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_owned_site(site_id, current_user, db)
    result = await db.execute(
        select(Recommendation).where(Recommendation.site_id == site_id)
    )
    return result.scalars().all()


@router.patch("/recommendations/{rec_id}/status")
async def update_status(
    rec_id: uuid.UUID,
    new_status: Status,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Recommendation).where(Recommendation.id == rec_id)
    )
    rec = result.scalars().first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommandation introuvable")

    await _get_owned_site(rec.site_id, current_user, db)
    rec.status = new_status
    await db.commit()
    await db.refresh(rec)
    return rec


@router.post("/sites/{site_id}/recommendations/generate")
async def trigger_recommendations(
    site_id: uuid.UUID,
    force: bool = Query(
        False,
        description="Si true, supprime les anciennes recommandations et régénère via Grok",
    ),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_owned_site(site_id, current_user, db)

    # Plan free → pas d'IA
    sub_result = await db.execute(
        select(Subscription).where(Subscription.user_id == current_user.id)
    )
    sub = sub_result.scalar_one_or_none()
    plan_key = sub.plan if sub else "free"
    plan_config = PLANS.get(plan_key, PLANS["free"])

    if not plan_config.get("ai_recommendations", False):
        raise HTTPException(
            status_code=403,
            detail=(
                "Les recommandations IA ne sont pas disponibles avec votre plan "
                "actuel. Passez au plan Pro pour y accéder."
            ),
        )

    # Compte les recs existantes (cache)
    count_result = await db.execute(
        select(func.count())
        .select_from(Recommendation)
        .where(Recommendation.site_id == site_id)
    )
    existing_count = count_result.scalar_one() or 0

    # Cache hit : ne pas rappeler Grok / Celery
    if existing_count > 0 and not force:
        return {
            "status": "already_exists",
            "count": existing_count,
            "message": (
                "Des recommandations existent déjà pour ce site. "
                "Utilisez force=true pour régénérer."
            ),
        }

    # force=true → supprimer toutes les anciennes (option A)
    if force and existing_count > 0:
        await db.execute(
            delete(Recommendation).where(Recommendation.site_id == site_id)
        )
        await db.commit()

    generer_recommandations_task.delay(str(site_id), force=force)
    return {
        "status": "tâche lancée",
        "site_id": str(site_id),
        "force": force,
        "replaced": bool(force and existing_count > 0),
    }