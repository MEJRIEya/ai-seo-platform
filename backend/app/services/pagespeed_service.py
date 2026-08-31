import httpx
from app.core.config import settings

PSI_URL = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"

CATEGORIES = ["PERFORMANCE", "SEO", "ACCESSIBILITY", "BEST_PRACTICES"]

def _extract_summary(data: dict) -> dict:
    cats = data.get("lighthouseResult", {}).get("categories", {})
    audits = data.get("lighthouseResult", {}).get("audits", {})

    def score(name: str):
        c = cats.get(name, {})
        s = c.get("score")
        return int(round(s * 100)) if s is not None else None

    def metric(audit_id: str):
        a = audits.get(audit_id, {})
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
        "final_url": data.get("lighthouseResult", {}).get("finalUrl"),
        "fetch_time": data.get("analysisUTCTimestamp"),
    }

async def run_pagespeed(url: str, strategy: str = "mobile") -> dict:
    """strategy: mobile | desktop"""
    if not url.startswith("http"):
        url = "https://" + url

    params = {
        "url": url,
        "strategy": strategy,
        "category": CATEGORIES,
        "key": settings.GOOGLE_PSI_API_KEY,
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        r = await client.get(PSI_URL, params=params)
        r.raise_for_status()
        raw = r.json()

    return {
        "summary": _extract_summary(raw),
        "raw_categories": raw.get("lighthouseResult", {}).get("categories", {}),
        # évite de stocker tout le JSON Lighthouse (très gros) si tu veux :
        # "raw": raw,
    }