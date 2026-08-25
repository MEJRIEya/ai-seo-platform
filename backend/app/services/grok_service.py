import re
import json
import logging
from openai import OpenAI
from app.core.config import settings
from app.schemas.recommendation import RapportIA

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """Tu es un expert SEO. Analyse les données fournies et génère
un diagnostic avec des recommandations priorisées.

Réponds UNIQUEMENT en JSON valide, avec cette structure exacte :
{
  "diagnostics": [
    {
      "title": "titre court et actionnable",
      "reasoning": "explication détaillée du problème détecté",
      "severity": "critical | important | opportunity",
      "estimated_impact": "estimation courte de l'impact, ou null"
    }
  ]
}
Ne renvoie rien d'autre que ce JSON."""


def _get_llm_client() -> tuple[OpenAI, str, str]:
    """
    Retourne (client, model, provider_name).
    Priorité : openrouter (ox-alpha) → xai → erreur.
    """
    provider = (getattr(settings, "LLM_PROVIDER", None) or "openrouter").lower().strip()

    if provider == "openrouter":
        api_key = getattr(settings, "OPENROUTER_API_KEY", None) or ""
        if not api_key:
            raise RuntimeError("OPENROUTER_API_KEY manquante")
        base_url = getattr(settings, "OPENROUTER_BASE_URL", None) or "https://openrouter.ai/api/v1"
        model = getattr(settings, "OPENROUTER_MODEL", None) or "stealth/ox-alpha"
        client = OpenAI(
            api_key=api_key,
            base_url=base_url,
            default_headers={
                "HTTP-Referer": getattr(settings, "FRONTEND_URL", "http://localhost:3000"),
                "X-Title": "AI SEO Platform",
            },
        )
        return client, model, "openrouter"

    if provider == "xai":
        api_key = getattr(settings, "XAI_API_KEY", None) or ""
        if not api_key or api_key in ("missing", "your_key", "changez_moi"):
            raise RuntimeError("XAI_API_KEY manquante ou non configurée")
        base_url = getattr(settings, "XAI_BASE_URL", None) or "https://api.x.ai/v1"
        model = getattr(settings, "XAI_MODEL", None) or "grok-4.6"
        client = OpenAI(api_key=api_key, base_url=base_url)
        return client, model, "xai"

    raise RuntimeError(f"LLM_PROVIDER inconnu: {provider} (utiliser openrouter|xai)")


def analyser_donnees_seo_mock(donnees_resumees: dict) -> str:
    """Mock intelligent à partir des données agrégées (coût nul)."""
    diagnostics = []
    pages_en_baisse = donnees_resumees.get("pages_en_baisse", []) or []
    mots_cles = donnees_resumees.get("mots_cles_sous_performants", []) or []

    for page in pages_en_baisse[:3]:
        baisse_pct = page.get("baisse_pct", 0) or 0
        severity = "critical" if baisse_pct <= -50 else "important"
        diagnostics.append({
            "title": f"Chute de trafic sur {page.get('url', 'page inconnue')}",
            "reasoning": (
                f"Le trafic de cette page est passé de {page.get('trafic_avant', '?')} à "
                f"{page.get('trafic_maintenant', '?')} sessions sur la période analysée, "
                f"soit une baisse de {abs(baisse_pct)}%. Cela peut indiquer une perte "
                f"de positionnement, un problème technique (indexation, erreur 404/500), "
                f"ou un changement d'intérêt pour ce contenu."
            ),
            "severity": severity,
            "estimated_impact": (
                f"Récupération potentielle de {page.get('trafic_avant', '?')} "
                f"sessions/période si corrigé"
            ),
        })

    for mc in mots_cles[:3]:
        diagnostics.append({
            "title": f"CTR faible pour le mot-clé \"{mc.get('mot_cle', '?')}\"",
            "reasoning": (
                f"Ce mot-clé génère {mc.get('impressions', 0)} impressions avec une position "
                f"moyenne de {mc.get('position', '?')}, mais un CTR de seulement {mc.get('ctr', '?')}%. "
                f"Une meilleure balise title ou meta-description pourrait améliorer "
                f"significativement le taux de clic malgré une bonne position."
            ),
            "severity": "opportunity",
            "estimated_impact": (
                f"Gain potentiel de clics sur {mc.get('impressions', 0)} impressions/mois"
            ),
        })

    if not diagnostics:
        diagnostics.append({
            "title": "Aucune anomalie détectée sur la période",
            "reasoning": (
                "Aucune baisse de trafic significative ni mot-clé sous-performant "
                "n'a été détecté dans les données disponibles pour ce site sur la période analysée."
            ),
            "severity": "opportunity",
            "estimated_impact": None,
        })

    return json.dumps({"diagnostics": diagnostics}, ensure_ascii=False)


def analyser_donnees_seo(donnees_resumees: dict) -> str:
    """
    Appelle le LLM configuré (OpenRouter ox-alpha par défaut, ou xAI).
    Lève une Exception en cas d'échec.
    """
    client, model, provider = _get_llm_client()

    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": json.dumps(donnees_resumees, ensure_ascii=False, default=str),
            },
        ],
        temperature=0.3,
        max_tokens=2000,
    )

    content = response.choices[0].message.content
    if not content or not str(content).strip():
        raise RuntimeError(f"Réponse {provider} vide (model={model})")

    return str(content)


def analyser_donnees_seo_safe(donnees_resumees: dict) -> tuple[str, str]:
    """
    Tente le LLM réel, sinon fallback mock.
    Retourne (contenu_brut, source) avec source = openrouter | xai | mock.
    Ne lève JAMAIS d'exception.
    """
    try:
        text = analyser_donnees_seo(donnees_resumees)
        provider = (getattr(settings, "LLM_PROVIDER", None) or "openrouter").lower().strip()
        source = provider if provider in ("openrouter", "xai") else "llm"
        logger.info("LLM API OK — source=%s", source)
        return text, source
    except Exception as e:
        logger.warning("LLM indisponible (%s) — fallback mock", e)
        try:
            return analyser_donnees_seo_mock(donnees_resumees or {}), "mock"
        except Exception as e2:
            logger.exception("Mock également en échec: %s", e2)
            return json.dumps({
                "diagnostics": [{
                    "title": "Analyse indisponible temporairement",
                    "reasoning": (
                        "Ni l'API LLM ni le moteur local n'ont pu produire un diagnostic. "
                        "Réessayez plus tard."
                    ),
                    "severity": "opportunity",
                    "estimated_impact": None,
                }]
            }, ensure_ascii=False), "mock"


def parser_reponse_grok(contenu_brut: str) -> RapportIA:
    """Parse JSON → RapportIA. Fallback mock si parse échoue."""
    try:
        text = (contenu_brut or "").strip()
        fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
        if fence:
            text = fence.group(1).strip()

        match = re.search(r"\{.*\}", text, re.DOTALL)
        if not match:
            raise ValueError("Aucun JSON trouvé dans la réponse")

        return RapportIA.model_validate_json(match.group(0))
    except Exception as e:
        logger.warning("Parse LLM échoué (%s) — RapportIA mock minimal", e)
        mock_json = analyser_donnees_seo_mock({})
        return RapportIA.model_validate_json(mock_json)