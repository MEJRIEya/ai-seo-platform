import asyncio
from datetime import datetime, timedelta
from app.core.celery_app import celery_app
from app.core.database import SessionLocal
from app.models.site import Site
from app.models.google_account import GoogleAccount
from app.models.gsc_metric import GscMetric
from app.models.ga4_metric import Ga4Metric
from app.services.google_service import GoogleService


@celery_app.task
def refresh_all_sites_data():
    """Tâche périodique : réimporte GSC + GA4 pour tous les sites."""
    db = SessionLocal()
    try:
        sites = db.query(Site).all()
        for site in sites:
            _refresh_site_gsc(db, site)
            _refresh_site_ga4(db, site)
    finally:
        db.close()


def _refresh_site_gsc(db, site):
    google_account = db.query(GoogleAccount).filter(
        GoogleAccount.id == site.google_account_id
    ).first()
    if not google_account:
        return

    service = GoogleService(google_account)
    try:
        rows = asyncio.run(
            service.import_gsc_data(site.gsc_property_url or f"sc-domain:{site.domain}")
        )

        # Supprime les 30 derniers jours existants avant de réinsérer (évite les doublons)
        cutoff = datetime.utcnow() - timedelta(days=30)
        db.query(GscMetric).filter(
            GscMetric.site_id == site.id, GscMetric.time >= cutoff
        ).delete()

        for row in rows:
            keys = row.get("keys", [])
            if len(keys) < 3:
                continue
            date_str, page_url, keyword = keys[0], keys[1], keys[2]
            db.add(GscMetric(
                time=datetime.strptime(date_str, "%Y-%m-%d"),
                site_id=site.id,
                page_url=page_url,
                keyword=keyword,
                clicks=row.get("clicks", 0),
                impressions=row.get("impressions", 0),
                position=row.get("position"),
                ctr=row.get("ctr"),
            ))
        db.commit()
        print(f"[refresh] GSC OK pour {site.domain} ({len(rows)} lignes)")
    except Exception as e:
        db.rollback()
        print(f"[refresh] Erreur GSC pour {site.domain}: {e}")


def _refresh_site_ga4(db, site):
    if not site.ga4_property_id:
        return

    google_account = db.query(GoogleAccount).filter(
        GoogleAccount.id == site.google_account_id
    ).first()
    if not google_account:
        return

    service = GoogleService(google_account)
    try:
        rows = asyncio.run(service.import_ga4_data(site.ga4_property_id))

        cutoff = datetime.utcnow() - timedelta(days=30)
        db.query(Ga4Metric).filter(
            Ga4Metric.site_id == site.id, Ga4Metric.time >= cutoff
        ).delete()

        for row in rows:
            db.add(Ga4Metric(
                time=datetime.strptime(row["date"], "%Y%m%d"),
                site_id=site.id,
                page_url=row["page_path"],
                sessions=row["sessions"],
                users=row["users"],
                pageviews=row["pageviews"],
            ))
        db.commit()
        print(f"[refresh] GA4 OK pour {site.domain} ({len(rows)} lignes)")
    except Exception as e:
        db.rollback()
        print(f"[refresh] Erreur GA4 pour {site.domain}: {e}")