from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from app.core.database import get_db
from app.utils.auth import get_current_user
from app.models.user import User
from app.models.site import Site
from app.models.google_account import GoogleAccount
from app.schemas.site import SiteCreate, SiteRead
from app.core.plans import PLANS
from app.models.subscription import Subscription
from fastapi import BackgroundTasks
from app.tasks.analytics import refresh_single_site
from app.tasks.core_web_vitals import generer_core_web_vitals_task
from app.tasks.recommendations import generer_recommandations_task

router = APIRouter(prefix="/sites", tags=["Sites"])





@router.post("/{site_id}/sync", status_code=202)
async def sync_site(
    site_id: UUID,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Site).where(Site.id == site_id, Site.user_id == current_user.id)
    )
    site = result.scalar_one_or_none()
    if site is None:
        raise HTTPException(status_code=404, detail="Site introuvable")

    background_tasks.add_task(refresh_single_site, str(site_id))
    background_tasks.add_task(generer_core_web_vitals_task, str(site_id))
    background_tasks.add_task(generer_recommandations_task, str(site_id))

    return {"status": "sync lancé"}




@router.post("/", response_model=SiteRead, status_code=201)
async def create_site(
    site: SiteCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
   
):
    # Vérifie la limite de sites selon le plan
    sub_result = await db.execute(select(Subscription).where(Subscription.user_id == current_user.id))
    sub = sub_result.scalar_one_or_none()
    plan_key = sub.plan if sub else "free"
    max_sites = PLANS.get(plan_key, PLANS["free"])["max_sites"]

    count_result = await db.execute(select(Site).where(Site.user_id == current_user.id))
    current_count = len(count_result.scalars().all())

    if current_count >= max_sites:
        raise HTTPException(
            status_code=403,
            detail=f"Limite de {max_sites} site(s) atteinte pour votre plan. Passez au plan Pro pour en ajouter plus."
        )

    # Vérifie que le compte Google appartient bien à l'utilisateur connecté
    result = await db.execute(
        select(GoogleAccount).where(
            GoogleAccount.id == site.google_account_id,
            GoogleAccount.user_id == current_user.id,
        )
    )
    google_account = result.scalar_one_or_none()
    if google_account is None:
        raise HTTPException(status_code=404, detail="Compte Google introuvable ou non autorisé")

    new_site = Site(
        user_id=current_user.id,
        google_account_id=site.google_account_id,
        domain=site.domain,
        gsc_property_url=site.gsc_property_url,
        ga4_property_id=site.ga4_property_id,
    )
    db.add(new_site)
    await db.commit()
    await db.refresh(new_site)
    return new_site


@router.get("/", response_model=list[SiteRead])
async def get_sites(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Site).where(Site.user_id == current_user.id))
    return result.scalars().all()


@router.get("/{site_id}", response_model=SiteRead)
async def get_site(
    site_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Site).where(Site.id == site_id, Site.user_id == current_user.id)
    )
    site = result.scalar_one_or_none()
    if site is None:
        raise HTTPException(status_code=404, detail="Site introuvable")
    return site


@router.delete("/{site_id}", status_code=204)
async def delete_site(
    site_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Site).where(Site.id == site_id, Site.user_id == current_user.id)
    )
    site = result.scalar_one_or_none()
    if site is None:
        raise HTTPException(status_code=404, detail="Site introuvable")

    await db.delete(site)
    await db.commit()