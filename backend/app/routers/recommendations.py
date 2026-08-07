import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.models.recommendation import Recommendation, Status
from workers.tasks import generer_recommandations_task

router = APIRouter(prefix="/api", tags=["recommendations"])


@router.get("/sites/{site_id}/recommendations")
async def get_recommendations(site_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Recommendation).filter(Recommendation.site_id == site_id)
    )
    return result.scalars().all()


@router.patch("/recommendations/{rec_id}/status")
async def update_status(rec_id: uuid.UUID, new_status: Status, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Recommendation).filter(Recommendation.id == rec_id)
    )
    rec = result.scalars().first()

    if not rec:
        raise HTTPException(status_code=404, detail="Recommandation introuvable")

    rec.status = new_status
    await db.commit()
    await db.refresh(rec)
    return rec


@router.post("/sites/{site_id}/recommendations/generate")
async def trigger_recommendations(site_id: uuid.UUID):
    generer_recommandations_task.delay(str(site_id))
    return {"status": "tâche lancée", "site_id": str(site_id)}