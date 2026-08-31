"""
Service PageSpeed Insights (PSI).
- obtenir_core_web_vitals_labo : métriques labo (LCP, CLS, FCP, TBT)
- run_pagespeed : scores + summary pour l'audit free (mobile/desktop)
"""
from __future__ import annotations

import logging
from typing import Any

import requests

from app.core.config import settings

logger = logging.getLogger(__name__)

PSI_ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"

SEUILS = {
    "largest-contentful-paint": {"good": 2500, "needs_improvement": 4000},
    "cumulative-layout-shift": {"good": 0.10, "needs_improvement": 0.25},
    "first-contentful-paint": {"good": 1800, "needs_improvement": 3000},
    "total-blocking-time": {"good": 200, "needs_improvement": 600},
}


def _api_key() -> str:
    """Priorité : GOOGLE_PSI_API_KEY, sinon CRUX_API_KEY (même clé Google souvent)."""
    key = (
        getattr(settings, "GOOGLE_PSI_API_KEY", None)
        or getattr(settings, "CRUX_API_KEY", None)
        or ""
    )
    key = (key or "").strip()
    if not key:
        raise RuntimeError(
            "Aucune clé PSI : définis GOOGLE_PSI_API_KEY ou CRUX_API_KEY dans .env"
        )
    return key


def _normalize_url(url: str) -> str:
    url = (url or "").strip()
    if not url:
        raise ValueError("URL vide")
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    return url


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


def _call_psi(
    url: str,
    strategy: str = "mobile",
    categories: list[str] | None = None,
    timeout: int = 120,
) -> dict[str, Any]:
    url = _normalize_url(url)
    categories = categories or ["performance"]

    # requests : liste de tuples pour répéter "category"
    params: list[tuple[str, str]] = [
        ("url", url),
        ("key", _api_key()),
        ("strategy", strategy),
    ]
    for cat in categories:
        params.append(("category", cat))

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
        )
    }

    response = requests.get(
        PSI_ENDPOINT,
        params=params,
        headers=headers,
        timeout=timeout,
    )
    if response.status_code != 200:
        logger.error(
            "PSI HTTP %s pour %s: %s",
            response.status_code,
            url,
            response.text[:800],
        )
        response.raise_for_status()

    data = response.json()
    if "lighthouseResult" not in data:
        raise RuntimeError(f"Réponse PSI inattendue: {str(data)[:400]}")
    return data


def obtenir_core_web_vitals_labo(url: str, strategy: str = "mobile") -> dict | None:
    """
    Test Lighthouse labo → LCP, CLS, FCP, TBT.
    Retourne None en cas d'échec.
    """
    try:
        data = _call_psi(url, strategy=strategy, categories=["performance"])
    except Exception as exc:
        logger.warning("PSI labo échoué pour %s: %s", url, exc)
        return None

    audits = data.get("lighthouseResult", {}).get("audits", {}) or {}
    if not audits:
        return None

    resultat: dict[str, Any] = {"niveau": "lab", "strategy": strategy}
    mapping = {
        "largest-contentful-paint": "lcp",
        "cumulative-layout-shift": "cls",
        "first-contentful-paint": "fcp",
        "total-blocking-time": "tbt",
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


def _extract_summary(data: dict) -> dict:
    cats = (data.get("lighthouseResult") or {}).get("categories") or {}
    audits = (data.get("lighthouseResult") or {}).get("audits") or {}

    def score(name: str) -> int | None:
        c = cats.get(name) or {}
        s = c.get("score")
        return int(round(s * 100)) if isinstance(s, (int, float)) else None

    def metric(audit_id: str) -> dict:
        a = audits.get(audit_id) or {}
        return {
            "title": a.get("title"),
            "display": a.get("displayValue"),
            "score": a.get("score"),
            "numeric": a.get("numericValue"),
        }

    return {
        "performance": score("performance"),
        "seo": score("seo"),
        "accessibility": score("accessibility"),
        "best_practices": score("best-practices"),
        "lcp": metric("largest-contentful-paint"),
        "cls": metric("cumulative-layout-shift"),
        "inp": metric("interaction-to-next-paint"),
        "fcp": metric("first-contentful-paint"),
        "tbt": metric("total-blocking-time"),
        "final_url": (data.get("lighthouseResult") or {}).get("finalUrl"),
        "fetch_time": data.get("analysisUTCTimestamp"),
    }


def run_pagespeed(url: str, strategy: str = "mobile") -> dict:
    """
    Pour l'audit free (Celery).
    Retourne {"summary": {...}} — format attendu par app/tasks/audit.py
    """
    data = _call_psi(
        url,
        strategy=strategy,
        categories=["performance", "seo"],
        timeout=180,
    )
    return {"summary": _extract_summary(data)}