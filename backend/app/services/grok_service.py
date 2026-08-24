import re
import json
import logging
from openai import OpenAI
from app.core.config import settings
from app.schemas.recommendation import RapportIA

logger = logging.getLogger(__name__)

client = OpenAI(
    api_key=settings.XAI_API_KEY or "missing",
    base_url=settings.XAI_BASE_URL,
)

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


def analyser_donnees_seo_mock(donnees_resumees: dict) -> str:
    """
    Mock intelligent : diagnostics à partir des vraies données agrégées,
    sans appeler Grok (coût nul).
    """
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
    Appelle l'API Grok (xAI) et retourne le texte brut.
    Lève une Exception si clé manquante, crédits, timeout, HTTP error, etc.
    """
    api_key = getattr(settings, "XAI_API_KEY", None) or ""
    if not api_key or api_key in ("missing", "your_key", "changez_moi"):
        raise RuntimeError("XAI_API_KEY manquante ou non configurée")

    model = getattr(settings, "XAI_MODEL", None) or "grok-2-latest"

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
        raise RuntimeError("Réponse Grok vide")

    return str(content)


def analyser_donnees_seo_safe(donnees_resumees: dict) -> tuple[str, str]:
    """
    Tente le vrai Grok, sinon fallback mock.
    Retourne (contenu_brut, source) avec source = "grok" | "mock".
    Ne lève JAMAIS d'exception.
    """
    try:
        text = analyser_donnees_seo(donnees_resumees)
        logger.info("Grok API OK — source=grok")
        return text, "grok"
    except Exception as e:
        logger.warning("Grok indisponible (%s) — fallback mock", e)
        try:
            return analyser_donnees_seo_mock(donnees_resumees or {}), "mock"
        except Exception as e2:
            logger.exception("Mock également en échec: %s", e2)
            # Ultime secours
            return json.dumps({
                "diagnostics": [{
                    "title": "Analyse indisponible temporairement",
                    "reasoning": (
                        "Ni l'API Grok ni le moteur local n'ont pu produire un diagnostic. "
                        "Réessayez plus tard."
                    ),
                    "severity": "opportunity",
                    "estimated_impact": None,
                }]
            }, ensure_ascii=False), "mock"


def parser_reponse_grok(contenu_brut: str) -> RapportIA:
    """
    Extrait et valide le JSON. En cas d'échec, reconstruit un RapportIA
    minimal pour ne pas faire planter la tâche Celery.
    """
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
        logger.warning("Parse Grok échoué (%s) — RapportIA mock minimal", e)
        mock_json = analyser_donnees_seo_mock({})
        return RapportIA.model_validate_json(mock_json)