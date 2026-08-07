import re
import json
from openai import OpenAI
from app.core.config import settings
from app.schemas.recommendation import RapportIA

client = OpenAI(
    api_key=settings.XAI_API_KEY,
    base_url=settings.XAI_BASE_URL
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
    Version temporaire — à utiliser tant que les crédits xAI ne sont pas activés.
    Contrairement à un mock statique, celle-ci construit des diagnostics
    à partir des vraies données agrégées (pages en baisse, mots-clés sous-performants),
    sans jamais appeler l'API Grok. Résultats variables selon le site, coût nul.
    """
    diagnostics = []

    pages_en_baisse = donnees_resumees.get("pages_en_baisse", [])
    mots_cles = donnees_resumees.get("mots_cles_sous_performants", [])

    # --- Diagnostics sur les pages en baisse de trafic (top 3) ---
    for page in pages_en_baisse[:3]:
        baisse_pct = page.get("baisse_pct", 0)
        severity = "critical" if baisse_pct <= -50 else "important"
        diagnostics.append({
            "title": f"Chute de trafic sur {page['url']}",
            "reasoning": (
                f"Le trafic de cette page est passé de {page['trafic_avant']} à "
                f"{page['trafic_maintenant']} sessions sur la période analysée, "
                f"soit une baisse de {abs(baisse_pct)}%. Cela peut indiquer une perte "
                f"de positionnement, un problème technique (indexation, erreur 404/500), "
                f"ou un changement d'intérêt pour ce contenu."
            ),
            "severity": severity,
            "estimated_impact": f"Récupération potentielle de {page['trafic_avant']} sessions/période si corrigé"
        })

    # --- Diagnostics sur les mots-clés sous-performants (top 3 par impressions) ---
    for mc in mots_cles[:3]:
        diagnostics.append({
            "title": f"CTR faible pour le mot-clé \"{mc['mot_cle']}\"",
            "reasoning": (
                f"Ce mot-clé génère {mc['impressions']} impressions avec une position "
                f"moyenne de {mc['position']}, mais un CTR de seulement {mc['ctr']}%. "
                f"Une meilleure balise title ou meta-description pourrait améliorer "
                f"significativement le taux de clic malgré une bonne position."
            ),
            "severity": "opportunity",
            "estimated_impact": f"Gain potentiel de clics sur {mc['impressions']} impressions/mois"
        })

    # --- Fallback si aucune donnée exploitable ---
    if not diagnostics:
        diagnostics.append({
            "title": "Aucune anomalie détectée sur la période",
            "reasoning": (
                "Aucune baisse de trafic significative ni mot-clé sous-performant "
                "n'a été détecté dans les données disponibles pour ce site sur la période analysée."
            ),
            "severity": "opportunity",
            "estimated_impact": None
        })

    return json.dumps({"diagnostics": diagnostics}, ensure_ascii=False)


def analyser_donnees_seo(donnees_resumees: dict) -> str:
    """Appelle l'API Grok et retourne la réponse brute (texte)."""
    response = client.chat.completions.create(
        model=settings.XAI_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": json.dumps(donnees_resumees, ensure_ascii=False)}
        ],
        temperature=0.3,
        max_tokens=2000,
    )
    return response.choices[0].message.content


def parser_reponse_grok(contenu_brut: str) -> RapportIA:
    """Extrait et valide le JSON renvoyé par Grok."""
    match = re.search(r'\{.*\}', contenu_brut, re.DOTALL)
    if not match:
        raise ValueError("Aucun JSON trouvé dans la réponse de Grok")
    return RapportIA.model_validate_json(match.group(0))