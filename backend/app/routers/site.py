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

router = APIRouter(prefix="/sites", tags=["Sites"])


@router.post("/", response_model=SiteRead, status_code=201)
async def create_site(
    site: SiteCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
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