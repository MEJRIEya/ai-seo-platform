from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.schemas.report import SiteReport
from sqlalchemy import func, cast, Date
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

@router.get("/sites/{site_id}/report", response_model=SiteReport)
async def get_site_report(
    site_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    site_result = await db.execute(
        select(Site).where(Site.id == site_id, Site.user_id == current_user.id)
    )
    site = site_result.scalar_one_or_none()
    if not site:
        raise HTTPException(status_code=404, detail="Site non trouvé")

    # ----- Résumé GSC -----
    gsc_result = await db.execute(
        select(
            func.coalesce(func.sum(GscMetric.clicks), 0),
            func.coalesce(func.sum(GscMetric.impressions), 0),
            func.avg(GscMetric.position),
            func.avg(GscMetric.ctr),
        ).where(GscMetric.site_id == site_id)
    )
    gsc_clicks, gsc_impressions, gsc_avg_position, gsc_avg_ctr = gsc_result.one()

    # ----- Résumé GA4 -----
    ga4_result = await db.execute(
        select(
            func.coalesce(func.sum(Ga4Metric.sessions), 0),
            func.coalesce(func.sum(Ga4Metric.users), 0),
            func.coalesce(func.sum(Ga4Metric.pageviews), 0),
        ).where(Ga4Metric.site_id == site_id)
    )
    ga4_sessions, ga4_users, ga4_pageviews = ga4_result.one()

    # ----- Top keywords GSC -----
    top_keywords_result = await db.execute(
        select(
            GscMetric.keyword,
            func.sum(GscMetric.clicks).label("clicks"),
            func.avg(GscMetric.position).label("position"),
        )
        .where(GscMetric.site_id == site_id, GscMetric.keyword.isnot(None))
        .group_by(GscMetric.keyword)
        .order_by(func.sum(GscMetric.clicks).desc())
        .limit(10)
    )
    top_keywords_gsc = [
        {"keyword": row.keyword, "clicks": row.clicks, "position": float(row.position) if row.position else None}
        for row in top_keywords_result.all()
    ]

    # ----- Top pages GSC -----
    top_gsc_result = await db.execute(
        select(
            GscMetric.page_url,
            func.sum(GscMetric.clicks).label("clicks"),
            func.sum(GscMetric.impressions).label("impressions"),
        )
        .where(GscMetric.site_id == site_id)
        .group_by(GscMetric.page_url)
        .order_by(func.sum(GscMetric.clicks).desc())
        .limit(10)
    )
    top_pages_gsc = [
        {"page_url": row.page_url, "clicks": row.clicks, "impressions": row.impressions}
        for row in top_gsc_result.all()
    ]

    # ----- Top pages GA4 -----
    top_ga4_result = await db.execute(
        select(
            Ga4Metric.page_url,
            func.sum(Ga4Metric.sessions).label("sessions"),
            func.sum(Ga4Metric.pageviews).label("pageviews"),
        )
        .where(Ga4Metric.site_id == site_id)
        .group_by(Ga4Metric.page_url)
        .order_by(func.sum(Ga4Metric.sessions).desc())
        .limit(10)
    )
    top_pages_ga4 = [
        {"page_url": row.page_url, "sessions": row.sessions, "pageviews": row.pageviews}
        for row in top_ga4_result.all()
    ]

    # ----- Tendance journalière (clics GSC + sessions GA4, fusionnés par jour) -----
    gsc_trend_result = await db.execute(
        select(
            cast(GscMetric.time, Date).label("day"),
            func.coalesce(func.sum(GscMetric.clicks), 0).label("clicks"),
        )
        .where(GscMetric.site_id == site_id)
        .group_by(cast(GscMetric.time, Date))
    )
    gsc_by_day = {str(row.day): row.clicks for row in gsc_trend_result.all()}

    ga4_trend_result = await db.execute(
        select(
            cast(Ga4Metric.time, Date).label("day"),
            func.coalesce(func.sum(Ga4Metric.sessions), 0).label("sessions"),
        )
        .where(Ga4Metric.site_id == site_id)
        .group_by(cast(Ga4Metric.time, Date))
    )
    ga4_by_day = {str(row.day): row.sessions for row in ga4_trend_result.all()}

    all_days = sorted(set(gsc_by_day.keys()) | set(ga4_by_day.keys()))
    daily_trend = [
        {"date": day, "clicks": gsc_by_day.get(day, 0), "sessions": ga4_by_day.get(day, 0)}
        for day in all_days
    ]

    return {
        "site": site.domain,
        "gsc_summary": {
            "total_clicks": gsc_clicks,
            "total_impressions": gsc_impressions,
            "avg_position": float(gsc_avg_position) if gsc_avg_position else None,
            "avg_ctr": float(gsc_avg_ctr) if gsc_avg_ctr else None,
        },
        "ga4_summary": {
            "total_sessions": ga4_sessions,
            "total_users": ga4_users,
            "total_pageviews": ga4_pageviews,
        },
        "top_keywords_gsc": top_keywords_gsc,
        "top_pages_gsc": top_pages_gsc,
        "top_pages_ga4": top_pages_ga4,
        "daily_trend": daily_trend,
    }