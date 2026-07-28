from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from uuid import UUID

from app.core.database import get_db
from app.utils.auth import get_current_user
from app.models.user import User
from app.models.site import Site
from app.models.google_account import GoogleAccount
from app.models.gsc_metric import GscMetric
from app.models.ga4_metric import Ga4Metric
from app.services.google_service import GoogleService

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.post("/import/gsc/{site_id}")
async def import_gsc_data(
    site_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    site_result = await db.execute(
        select(Site).where(Site.id == site_id, Site.user_id == current_user.id)
    )
    site = site_result.scalar_one_or_none()
    if not site:
        raise HTTPException(status_code=404, detail="Site non trouvé")

    ga_result = await db.execute(
        select(GoogleAccount).where(GoogleAccount.id == site.google_account_id)
    )
    google_account = ga_result.scalar_one_or_none()
    if not google_account:
        raise HTTPException(status_code=404, detail="Compte Google non trouvé")

    service = GoogleService(google_account)
    rows = await service.import_gsc_data(site.gsc_property_url or f"sc-domain:{site.domain}")

    inserted_count = 0
    for row in rows:
        keys = row.get("keys", [])
        if len(keys) < 3:
            continue

        date_str, page_url, keyword = keys[0], keys[1], keys[2]

        metric = GscMetric(
            time=datetime.strptime(date_str, "%Y-%m-%d"),
            site_id=site.id,
            page_url=page_url,
            keyword=keyword,
            clicks=row.get("clicks", 0),
            impressions=row.get("impressions", 0),
            position=row.get("position"),
            ctr=row.get("ctr"),
        )
        db.add(metric)
        inserted_count += 1

    await db.commit()

    return {
        "status": "success",
        "source": "GSC",
        "site": site.domain,
        "rows_fetched": len(rows),
        "rows_inserted": inserted_count
    }


@router.post("/import/ga4/{site_id}")
async def import_ga4_data(
    site_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    site_result = await db.execute(
        select(Site).where(Site.id == site_id, Site.user_id == current_user.id)
    )
    site = site_result.scalar_one_or_none()
    if not site:
        raise HTTPException(status_code=404, detail="Site non trouvé")

    if not site.ga4_property_id:
        raise HTTPException(status_code=400, detail="Aucune propriété GA4 associée à ce site")

    ga_result = await db.execute(
        select(GoogleAccount).where(GoogleAccount.id == site.google_account_id)
    )
    google_account = ga_result.scalar_one_or_none()
    if not google_account:
        raise HTTPException(status_code=404, detail="Compte Google non trouvé")

    service = GoogleService(google_account)
    rows = await service.import_ga4_data(site.ga4_property_id)

    inserted_count = 0
    for row in rows:
        metric = Ga4Metric(
            time=datetime.strptime(row["date"], "%Y%m%d"),
            site_id=site.id,
            page_url=row["page_path"],
            sessions=row["sessions"],
            users=row["users"],
            pageviews=row["pageviews"],
        )
        db.add(metric)
        inserted_count += 1

    await db.commit()

    return {
        "status": "success",
        "source": "GA4",
        "site": site.domain,
        "rows_fetched": len(rows),
        "rows_inserted": inserted_count
    }


@router.get("/sites/{site_id}/gsc")
async def get_gsc_metrics(
    site_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = 100
):
    result = await db.execute(
        select(GscMetric)
        .where(GscMetric.site_id == site_id)
        .order_by(desc(GscMetric.time))
        .limit(limit)
    )
    return result.scalars().all()


@router.get("/sites/{site_id}/ga4")
async def get_ga4_metrics(
    site_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = 100
):
    result = await db.execute(
        select(Ga4Metric)
        .where(Ga4Metric.site_id == site_id)
        .order_by(desc(Ga4Metric.time))
        .limit(limit)
    )
    return result.scalars().all()