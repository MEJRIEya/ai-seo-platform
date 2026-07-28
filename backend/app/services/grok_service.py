import re
import json
from openai import OpenAI
from app.core.config import settings
from app.schemas.recommendation import RapportIA

client = OpenAI(
    api_key=settings.xai_api_key,
    base_url=settings.xai_base_url
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


async def analyser_donnees_seo(donnees_resumees: dict) -> str:
    """Appelle l'API Grok et retourne la réponse brute (texte)."""
    response = client.chat.completions.create(
        model=settings.xai_model,
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