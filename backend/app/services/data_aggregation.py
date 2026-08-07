import uuid
from datetime import datetime, timedelta, timezone
from collections import defaultdict
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.ga4_metric import Ga4Metric
from app.models.gsc_metric import GscMetric


def agreger_donnees_site(site_id: uuid.UUID, db: Session, days: int = 30) -> dict:
    """
    Récupère les métriques GA4 + GSC des `days` derniers jours pour un site,
    et les résume en un JSON compact prêt à envoyer à Grok.

    Compare la première moitié de la période à la seconde moitié pour détecter
    des tendances (pages/requêtes en hausse ou en baisse), à la manière de
    l'onglet "Insights" de Google Search Console.
    """
    now = datetime.now(timezone.utc)
    period_start = now - timedelta(days=days)
    mid_point = now - timedelta(days=days // 2)

    # ---------- GA4 : pages en hausse / en baisse de trafic ----------
    ga4_rows = db.execute(
        select(Ga4Metric).where(
            Ga4Metric.site_id == site_id,
            Ga4Metric.time >= period_start
        )
    ).scalars().all()

    sessions_recent = defaultdict(int)
    sessions_ancien = defaultdict(int)

    for row in ga4_rows:
        if row.time >= mid_point:
            sessions_recent[row.page_url] += row.sessions
        else:
            sessions_ancien[row.page_url] += row.sessions

    pages_en_baisse = []
    pages_en_hausse = []

    toutes_les_urls = set(sessions_ancien.keys()) | set(sessions_recent.keys())

    for url in toutes_les_urls:
        sessions_avant = sessions_ancien.get(url, 0)
        sessions_apres = sessions_recent.get(url, 0)

        if sessions_avant > 0:
            variation_pct = round(((sessions_apres - sessions_avant) / sessions_avant) * 100, 1)
        elif sessions_apres > 0:
            # nouvelle page qui n'existait pas avant -> hausse "infinie", on l'ignore du calcul en %
            continue
        else:
            continue

        entry = {
            "url": url,
            "trafic_avant": sessions_avant,
            "trafic_maintenant": sessions_apres,
            "variation_pct": variation_pct
        }

        if variation_pct <= -20:
            pages_en_baisse.append(entry)
        elif variation_pct >= 20 and sessions_apres >= 3:
            # seuil mini de 3 sessions pour éviter le bruit statistique sur petits volumes
            pages_en_hausse.append(entry)

    pages_en_baisse.sort(key=lambda x: x["variation_pct"])
    pages_en_hausse.sort(key=lambda x: x["variation_pct"], reverse=True)

    # ---------- GSC : mots-clés sous-performants + tendances ----------
    gsc_rows = db.execute(
        select(GscMetric).where(
            GscMetric.site_id == site_id,
            GscMetric.time >= period_start
        )
    ).scalars().all()

    agg_par_mot_cle = defaultdict(lambda: {
        "clicks": 0, "impressions": 0, "positions": [],
        "clicks_avant": 0, "clicks_apres": 0
    })

    for row in gsc_rows:
        if not row.keyword:
            continue
        entry = agg_par_mot_cle[row.keyword]
        entry["clicks"] += row.clicks
        entry["impressions"] += row.impressions
        if row.position is not None:
            entry["positions"].append(float(row.position))

        if row.time >= mid_point:
            entry["clicks_apres"] += row.clicks
        else:
            entry["clicks_avant"] += row.clicks

    mots_cles_sous_performants = []
    requetes_tendance_hausse = []
    requetes_tendance_baisse = []

    for keyword, data in agg_par_mot_cle.items():
        if data["impressions"] == 0 or not data["positions"]:
            continue
        position_moyenne = round(sum(data["positions"]) / len(data["positions"]), 1)
        ctr_reel = round((data["clicks"] / data["impressions"]) * 100, 2)

        if position_moyenne <= 10 and ctr_reel < 2.0:
            mots_cles_sous_performants.append({
                "mot_cle": keyword,
                "position": position_moyenne,
                "ctr": ctr_reel,
                "impressions": data["impressions"]
            })

        # ---- tendance clics avant/après (comme "Trending up/down" GSC) ----
        clics_avant, clics_apres = data["clicks_avant"], data["clicks_apres"]
        if clics_avant >= 3:  # seuil mini pour éviter le bruit
            variation_pct = round(((clics_apres - clics_avant) / clics_avant) * 100, 1)
            trend_entry = {
                "mot_cle": keyword,
                "clics_avant": clics_avant,
                "clics_apres": clics_apres,
                "variation_pct": variation_pct
            }
            if variation_pct >= 20:
                requetes_tendance_hausse.append(trend_entry)
            elif variation_pct <= -20:
                requetes_tendance_baisse.append(trend_entry)

    mots_cles_sous_performants.sort(key=lambda x: x["impressions"], reverse=True)
    requetes_tendance_hausse.sort(key=lambda x: x["variation_pct"], reverse=True)
    requetes_tendance_baisse.sort(key=lambda x: x["variation_pct"])

    return {
        "periode": f"{period_start.strftime('%d/%m/%Y')} - {now.strftime('%d/%m/%Y')}",
        "pages_en_baisse": pages_en_baisse[:10],
        "pages_en_hausse": pages_en_hausse[:10],
        "mots_cles_sous_performants": mots_cles_sous_performants[:10],
        "requetes_tendance_hausse": requetes_tendance_hausse[:10],
        "requetes_tendance_baisse": requetes_tendance_baisse[:10],
    }