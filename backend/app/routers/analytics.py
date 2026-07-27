from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.core.database import get_db
from app.utils.auth import get_current_user
from app.models.user import User
from app.models.site import Site
from app.models.seo_metric import SeoMetric
from app.schemas.seo_metric import SeoMetricCreate, SeoMetricRead
from uuid import UUID

from app.services.google_service import GoogleService
from app.models.google_account import GoogleAccount


router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.post("/metrics", response_model=SeoMetricRead, status_code=201)
async def add_seo_metrics(
    metric: SeoMetricCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    site_result = await db.execute(
        select(Site).where(Site.id == metric.site_id, Site.user_id == current_user.id)
    )
    if not site_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Site non trouvé ou non autorisé")

    new_metric = SeoMetric(
        site_id=metric.site_id,
        time=metric.time,
        page_url=metric.page_url,
        keyword=metric.keyword,
        clicks=metric.clicks,
        impressions=metric.impressions,
        position=metric.position,
        ctr=metric.ctr,
    )

    db.add(new_metric)
    await db.commit()
    await db.refresh(new_metric)
    return new_metric


@router.get("/sites/{site_id}/metrics", response_model=list[SeoMetricRead])
async def get_site_metrics(
    site_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = 100
):
    site_result = await db.execute(
        select(Site).where(Site.id == site_id, Site.user_id == current_user.id)
    )
    if not site_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Site non trouvé")

    result = await db.execute(
        select(SeoMetric)
        .where(SeoMetric.site_id == site_id)
        .order_by(desc(SeoMetric.time))
        .limit(limit)
    )
    return result.scalars().all()


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

        metric = SeoMetric(
            time=datetime.strptime(date_str, "%Y-%m-%d"),
            site_id=site.id,
            page_url=page_url,
            keyword=keyword,
            clicks=row.get("clicks", 0),
            impressions=row.get("impressions", 0),
            position=row.get("position", 0),
            ctr=row.get("ctr", 0),
        )
        db.add(metric)
        inserted_count += 1

    await db.commit()

    return {
        "status": "success",
        "site": site.domain,
        "rows_fetched": len(rows),
        "rows_inserted": inserted_count,
        "message": "Données importées et sauvegardées avec succès"
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
        metric = SeoMetric(
            time=datetime.strptime(row["date"], "%Y%m%d"),
            site_id=site.id,
            page_url=row["page_path"],
            keyword=None,  # GA4 n'a pas de notion de mot-clé
            sessions=row["sessions"],
            users=row["users"],
            pageviews=row["pageviews"],
        )
        db.add(metric)
        inserted_count += 1

    await db.commit()

    return {
        "status": "success",
        "site": site.domain,
        "rows_fetched": len(rows),
        "rows_inserted": inserted_count,
        "message": "Données GA4 importées et sauvegardées avec succès"
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
        metric = SeoMetric(
            time=datetime.strptime(row["date"], "%Y%m%d"),
            site_id=site.id,
            page_url=row["page_path"],
            keyword=None,  # GA4 n'a pas de notion de mot-clé
            sessions=row["sessions"],
            users=row["users"],
            pageviews=row["pageviews"],
        )
        db.add(metric)
        inserted_count += 1

    await db.commit()

    return {
        "status": "success",
        "site": site.domain,
        "rows_fetched": len(rows),
        "rows_inserted": inserted_count,
        "message": "Données GA4 importées et sauvegardées avec succès"
    }
