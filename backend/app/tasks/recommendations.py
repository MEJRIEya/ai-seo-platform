import uuid
import asyncio
from app.core.celery_app import celery_app
from app.core.database import SessionLocal
from app.services.grok_service import analyser_donnees_seo, parser_reponse_grok
from app.models.recommendation import Recommendation


@celery_app.task
def generer_recommandations_task(site_id: str, donnees_resumees: dict):
    db = SessionLocal()
    try:
        # Celery est synchrone -> on execute la partie async avec asyncio.run
        reponse_brute = asyncio.run(analyser_donnees_seo(donnees_resumees))
        rapport = parser_reponse_grok(reponse_brute)

        for diag in rapport.diagnostics:
            rec = Recommendation(
                site_id=uuid.UUID(site_id),
                title=diag.title,
                reasoning=diag.reasoning,
                severity=diag.severity,
                estimated_impact=diag.estimated_impact,
            )
            db.add(rec)

        db.commit()
    finally:
        db.close()