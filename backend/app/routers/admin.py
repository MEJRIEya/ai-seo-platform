from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from uuid import UUID

from app.core.database import get_db
from app.utils.admin_auth import get_current_admin_user
from app.models.user import User
from app.models.site import Site
from app.models.recommendation import Recommendation, Status
from app.schemas.admin import AdminUserRead, AdminSiteRead, AdminStats, UserStatusUpdate

router = APIRouter(prefix="/admin", tags=["Admin"])


# ==================== STATS GLOBALES ====================

@router.get("/stats", response_model=AdminStats)
async def get_admin_stats(
    current_admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    total_users = (await db.execute(select(func.count(User.id)))).scalar_one()
    active_users = (
        await db.execute(select(func.count(User.id)).where(User.is_active == True))
    ).scalar_one()
    total_sites = (await db.execute(select(func.count(Site.id)))).scalar_one()
    total_recs = (await db.execute(select(func.count(Recommendation.id)))).scalar_one()
    open_recs = (
        await db.execute(
            select(func.count(Recommendation.id)).where(Recommendation.status == Status.open)
        )
    ).scalar_one()

    return AdminStats(
        total_users=total_users,
        active_users=active_users,
        total_sites=total_sites,
        total_recommendations=total_recs,
        recommendations_open=open_recs,
    )


# ==================== UTILISATEURS ====================

@router.get("/users", response_model=list[AdminUserRead])
async def list_users(
    current_admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User, func.count(Site.id).label("sites_count"))
        .outerjoin(Site, Site.user_id == User.id)
        .group_by(User.id)
        .order_by(User.created_at.desc())
    )
    rows = result.all()

    return [
        AdminUserRead(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            is_active=user.is_active,
            is_admin=user.is_admin,
            created_at=user.created_at,
            sites_count=sites_count,
        )
        for user, sites_count in rows
    ]


@router.patch("/users/{user_id}/status", response_model=AdminUserRead)
async def update_user_status(
    user_id: UUID,
    payload: UserStatusUpdate,
    current_admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    if user_id == current_admin.id:
        raise HTTPException(
            status_code=400, detail="Vous ne pouvez pas modifier votre propre statut"
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    user.is_active = payload.is_active
    await db.commit()
    await db.refresh(user)

    sites_count = (
        await db.execute(select(func.count(Site.id)).where(Site.user_id == user.id))
    ).scalar_one()

    return AdminUserRead(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active,
        is_admin=user.is_admin,
        created_at=user.created_at,
        sites_count=sites_count,
    )


# ==================== SITES (vue globale) ====================

@router.get("/sites", response_model=list[AdminSiteRead])
async def list_all_sites(
    current_admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Site, User.email)
        .join(User, Site.user_id == User.id)
        .order_by(Site.created_at.desc())
    )
    rows = result.all()

    return [
        AdminSiteRead(
            id=site.id,
            domain=site.domain,
            gsc_property_url=site.gsc_property_url,
            ga4_property_id=site.ga4_property_id,
            created_at=site.created_at,
            owner_email=owner_email,
        )
        for site, owner_email in rows
    ]