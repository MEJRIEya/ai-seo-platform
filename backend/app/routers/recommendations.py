import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.utils.auth import get_current_user
from app.models.user import User
from app.models.site import Site
from app.models.recommendation import Recommendation, Status
from app.tasks.recommendations import generer_recommandations_task

router = APIRouter(prefix="/api", tags=["recommendations"])


async def _get_owned_site(site_id: uuid.UUID, current_user: User, db: AsyncSession) -> Site:
    """Vérifie que le site appartient bien à l'utilisateur connecté."""
    result = await db.execute(
        select(Site).where(Site.id == site_id, Site.user_id == current_user.id)
    )
    site = result.scalar_one_or_none()
    if not site:
        raise HTTPException(status_code=404, detail="Site non trouvé ou non autorisé")
    return site


@router.get("/sites/{site_id}/recommendations")
async def get_recommendations(
    site_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_owned_site(site_id, current_user, db)

    result = await db.execute(
        select(Recommendation).filter(Recommendation.site_id == site_id)
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
        select(Recommendation)
        .join(Site, Site.id == Recommendation.site_id)
        .where(Recommendation.id == rec_id, Site.user_id == current_user.id)
    )
    rec = result.scalar_one_or_none()

    if not rec:
        raise HTTPException(status_code=404, detail="Recommandation introuvable ou non autorisée")

    rec.status = new_status
    await db.commit()
    await db.refresh(rec)
    return rec


@router.post("/sites/{site_id}/recommendations/generate")
async def trigger_recommendations(
    site_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_owned_site(site_id, current_user, db)

    generer_recommandations_task.delay(str(site_id))
    return {"status": "tâche lancée", "site_id": str(site_id)}