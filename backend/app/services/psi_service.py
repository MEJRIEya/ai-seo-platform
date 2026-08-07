"""
Service d'accès à l'API PageSpeed Insights (PSI), utilisé en fallback quand
CrUX n'a pas assez de données réelles (cas fréquent pour les sites à faible trafic).

Contrairement à CrUX (données réelles agrégées d'utilisateurs Chrome), PSI lance
un test Lighthouse en direct sur l'URL -> fonctionne pour N'IMPORTE QUEL site,
même sans trafic, mais c'est un test synthétique en labo, pas une mesure réelle,
et c'est plus lent (quelques secondes par appel).

Doc officielle : https://developers.google.com/speed/docs/insights/v5/get-started
"""
import requests
from app.core.config import settings

PSI_ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"

# Mêmes seuils que crux_service.py, réutilisés pour classer les métriques de labo
SEUILS = {
    "largest-contentful-paint": {"good": 2500, "needs_improvement": 4000},
    "cumulative-layout-shift": {"good": 0.10, "needs_improvement": 0.25},
    "first-contentful-paint": {"good": 1800, "needs_improvement": 3000},
    "total-blocking-time": {"good": 200, "needs_improvement": 600},
}


def _classer(audit_id: str, valeur: float) -> str:
    seuils = SEUILS.get(audit_id)
    if not seuils:
        return "unknown"
    valeur = float(valeur)
    if valeur <= seuils["good"]:
        return "good"
    if valeur <= seuils["needs_improvement"]:
        return "needs_improvement"
    return "poor"


def obtenir_core_web_vitals_labo(url: str, strategy: str = "mobile") -> dict | None:
    """
    Lance un test Lighthouse en direct via PageSpeed Insights et retourne
    des métriques de performance équivalentes aux Core Web Vitals.

    Note : Lighthouse ne mesure pas l'INP en conditions de labo (il faut de
    vraies interactions utilisateur pour ça). On utilise le Total Blocking
    Time (TBT) comme proxy d'interactivité, mais ce n'est pas la même métrique.

    strategy: "mobile" ou "desktop"

    Retourne None en cas d'échec (site inaccessible, timeout, erreur API...).
    """
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
        )
    }

    try:
        response = requests.get(
            PSI_ENDPOINT,
            params={
                "url": url,
                "key": settings.CRUX_API_KEY,
                "strategy": strategy,
                "category": "performance",
            },
            headers=headers,
            timeout=30,  # Lighthouse est lent, on laisse large
        )
        if response.status_code != 200:
            print(f"PSI a répondu {response.status_code} pour {url}: {response.text[:500]}")
        response.raise_for_status()
        data = response.json()
    except requests.exceptions.RequestException as exc:
        print(f"Erreur lors de l'appel PageSpeed Insights pour {url}: {exc}")
        return None

    audits = data.get("lighthouseResult", {}).get("audits", {})
    if not audits:
        return None

    resultat = {"niveau": "lab", "strategy": strategy}

    mapping = {
        "largest-contentful-paint": "lcp",
        "cumulative-layout-shift": "cls",
        "first-contentful-paint": "fcp",
        "total-blocking-time": "tbt",  # proxy d'interactivité, PAS l'INP
    }

    for audit_id, cle_courte in mapping.items():
        audit = audits.get(audit_id)
        if audit and audit.get("numericValue") is not None:
            valeur = audit["numericValue"]
            resultat[cle_courte] = valeur
            resultat[f"{cle_courte}_categorie"] = _classer(audit_id, valeur)
        else:
            resultat[cle_courte] = None
            resultat[f"{cle_courte}_categorie"] = None

    return resultat