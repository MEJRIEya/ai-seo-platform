import uuid
from datetime import datetime, timedelta, timezone
from collections import defaultdict
from urllib.parse import urljoin
from sqlalchemy import select

from app.core.celery_app import celery_app
from app.core.database import SessionLocal
from app.models.ga4_metric import Ga4Metric
from app.models.core_web_vital import CoreWebVital
from app.models.site import Site
from app.services.crux_service import obtenir_core_web_vitals


def _construire_url_complete(domain: str, page_url: str) -> str:
    """
    Combine le domaine du site avec un chemin de page pour former une URL complète.
    Ex: domain="www.twenty.tn", page_url="/blog/" -> "https://www.twenty.tn/blog/"
    """
    if page_url.startswith("http://") or page_url.startswith("https://"):
        return page_url

    base = domain if domain.startswith("http") else f"https://{domain}"
    if not base.endswith("/"):
        base += "/"

    return urljoin(base, page_url.lstrip("/"))


@celery_app.task
def generer_core_web_vitals_task(site_id: str, nb_pages: int = 10, days: int = 30):
    """
    Récupère les Core Web Vitals (via CrUX) pour les `nb_pages` pages les plus
    visitées d'un site sur les `days` derniers jours, et stocke les résultats.
    """
    db = SessionLocal()
    try:
        site_uuid = uuid.UUID(site_id)

        # 0. Récupérer le domaine du site (nécessaire pour reconstruire des URLs complètes)
        site = db.get(Site, site_uuid)
        if site is None:
            print(f"Site {site_id} introuvable, tâche annulée.")
            return

        period_start = datetime.now(timezone.utc) - timedelta(days=days)

        # 1. Identifier les pages les plus visitées du site (via GA4)
        rows = db.execute(
            select(Ga4Metric).where(
                Ga4Metric.site_id == site_uuid,
                Ga4Metric.time >= period_start
            )
        ).scalars().all()

        sessions_par_page = defaultdict(int)
        for row in rows:
            sessions_par_page[row.page_url] += row.sessions

        top_pages = sorted(
            sessions_par_page.items(), key=lambda x: x[1], reverse=True
        )[:nb_pages]

        if not top_pages:
            print(f"Aucune page trouvée pour le site {site_id}, rien à analyser.")
            return

        # 2. Appeler CrUX pour chaque page (URL complète) et stocker le résultat
        import time
        nb_succes = 0
        for page_url, _sessions in top_pages:
            url_complete = _construire_url_complete(site.domain, page_url)
            resultat = obtenir_core_web_vitals(url_complete)

            if resultat is None:
                print(f"Pas de données CrUX pour {url_complete} (ni page ni origine).")
                continue

            cwv = CoreWebVital(
                site_id=site_uuid,
                page_url=page_url,
                niveau=resultat["niveau"],
                lcp=resultat.get("lcp"),
                lcp_categorie=resultat.get("lcp_categorie"),
                inp=resultat.get("inp"),
                inp_categorie=resultat.get("inp_categorie"),
                cls=resultat.get("cls"),
                cls_categorie=resultat.get("cls_categorie"),
                fcp=resultat.get("fcp"),
                fcp_categorie=resultat.get("fcp_categorie"),
            )
            db.add(cwv)
            nb_succes += 1

            # Petite pause pour éviter de dépasser les quotas de requêtes/seconde
            # de CrUX et PageSpeed Insights
            time.sleep(1)

        db.commit()
        print(f"Core Web Vitals mis à jour pour {nb_succes}/{len(top_pages)} page(s) du site {site_id}.")
    finally:
        db.close()