import uuid
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.core_web_vital import CoreWebVital
from app.tasks.core_web_vitals import generer_core_web_vitals_task

router = APIRouter(prefix="/api", tags=["core-web-vitals"])


@router.get("/sites/{site_id}/core-web-vitals")
async def get_core_web_vitals(site_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """
    Retourne la dernière mesure Core Web Vitals connue pour chaque page du site.
    """
    sous_requete = (
        select(
            CoreWebVital.page_url,
            func.max(CoreWebVital.time).label("derniere_mesure")
        )
        .where(CoreWebVital.site_id == site_id)
        .group_by(CoreWebVital.page_url)
        .subquery()
    )

    result = await db.execute(
        select(CoreWebVital).join(
            sous_requete,
            (CoreWebVital.page_url == sous_requete.c.page_url)
            & (CoreWebVital.time == sous_requete.c.derniere_mesure)
        ).where(CoreWebVital.site_id == site_id)
    )

    return result.scalars().all()


@router.post("/sites/{site_id}/core-web-vitals/refresh")
async def trigger_core_web_vitals(site_id: uuid.UUID, nb_pages: int = 10):
    """
    Déclenche une nouvelle récupération des Core Web Vitals pour les pages
    les plus visitées du site (tâche asynchrone en arrière-plan).
    """
    generer_core_web_vitals_task.delay(str(site_id), nb_pages)
    return {"status": "tâche lancée", "site_id": str(site_id)}