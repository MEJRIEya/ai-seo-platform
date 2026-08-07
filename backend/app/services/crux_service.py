"""
Service d'accès à la Chrome UX Report (CrUX) API pour récupérer les
Core Web Vitals (LCP, INP, CLS) d'une page.

Doc officielle : https://developer.chrome.com/docs/crux/api
"""
import requests
from app.core.config import settings

CRUX_ENDPOINT = "https://chromeuxreport.googleapis.com/v1/records:queryRecord"

# Seuils officiels Google pour classer chaque métrique (en millisecondes, sauf CLS sans unité)
SEUILS = {
    "largest_contentful_paint": {"good": 2500, "needs_improvement": 4000},
    "interaction_to_next_paint": {"good": 200, "needs_improvement": 500},
    "cumulative_layout_shift": {"good": 0.10, "needs_improvement": 0.25},
    "first_contentful_paint": {"good": 1800, "needs_improvement": 3000},
}


def _classer(metrique: str, valeur) -> str:
    """Classe une valeur p75 en 'good' / 'needs_improvement' / 'poor'."""
    seuils = SEUILS.get(metrique)
    if not seuils:
        return "unknown"

    valeur = float(valeur)  # CrUX renvoie parfois le CLS sous forme de string ("0.05")

    if valeur <= seuils["good"]:
        return "good"
    if valeur <= seuils["needs_improvement"]:
        return "needs_improvement"
    return "poor"


def _appeler_crux(payload: dict) -> dict | None:
    """Appelle l'API CrUX avec le payload donné. Retourne None si pas de données (404 ou erreur)."""
    try:
        response = requests.post(
            CRUX_ENDPOINT,
            params={"key": settings.CRUX_API_KEY},
            json=payload,
            timeout=10,
        )

        if response.status_code == 404:
            # Pas assez de trafic Chrome réel pour cette URL/origine sur les 28 derniers jours
            return None

        if response.status_code == 400:
            # URL/origine mal formée (souvent une URL relative ou invalide) -> on l'ignore
            return None

        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as exc:
        print(f"Erreur lors de l'appel CrUX pour {payload}: {exc}")
        return None


def _extraire_metrics(record: dict, niveau: str) -> dict:
    """Transforme la réponse brute CrUX en dict simplifié et classé."""
    metrics = record.get("record", {}).get("metrics", {})
    resultat = {"niveau": niveau}

    mapping = {
        "largest_contentful_paint": "lcp",
        "interaction_to_next_paint": "inp",
        "cumulative_layout_shift": "cls",
        "first_contentful_paint": "fcp",
    }

    for cle_crux, cle_courte in mapping.items():
        donnees = metrics.get(cle_crux)
        if donnees and "percentiles" in donnees:
            valeur_p75 = float(donnees["percentiles"]["p75"])
            resultat[cle_courte] = valeur_p75
            resultat[f"{cle_courte}_categorie"] = _classer(cle_crux, valeur_p75)
        else:
            resultat[cle_courte] = None
            resultat[f"{cle_courte}_categorie"] = None

    return resultat


def obtenir_core_web_vitals(url: str, form_factor: str | None = None) -> dict | None:
    """
    Récupère les Core Web Vitals pour une URL précise, avec 3 niveaux de fallback :

    1. CrUX au niveau de la page précise (données réelles, le plus précis)
    2. CrUX au niveau de l'origine/domaine (données réelles, moins précis mais
       plus de volume disponible)
    3. PageSpeed Insights / Lighthouse (test synthétique en labo, fonctionne
       même sans aucun trafic réel, mais moins représentatif de l'expérience
       utilisateur réelle)

    form_factor: "PHONE", "DESKTOP", "TABLET", ou None pour tous appareils confondus.

    Retourne None seulement si les 3 niveaux échouent (cas rare, ex: site injoignable).
    """
    payload = {"url": url}
    if form_factor:
        payload["formFactor"] = form_factor

    record = _appeler_crux(payload)
    if record is not None:
        return _extraire_metrics(record, niveau="page")

    # ---- Fallback 1 : essai au niveau de l'origine ----
    from urllib.parse import urlparse
    parsed = urlparse(url)
    origin = f"{parsed.scheme}://{parsed.netloc}"

    payload_origin = {"origin": origin}
    if form_factor:
        payload_origin["formFactor"] = form_factor

    record_origin = _appeler_crux(payload_origin)
    if record_origin is not None:
        return _extraire_metrics(record_origin, niveau="origin")

    # ---- Fallback 2 : PageSpeed Insights (test en labo, pas de données réelles) ----
    from app.services.psi_service import obtenir_core_web_vitals_labo
    strategy = "mobile" if form_factor != "DESKTOP" else "desktop"
    return obtenir_core_web_vitals_labo(url, strategy=strategy)