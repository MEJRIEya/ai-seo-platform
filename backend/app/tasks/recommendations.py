import uuid
from sqlalchemy import delete

from app.core.celery_app import celery_app
from app.core.database import SessionLocal
from app.services.grok_service import (
    analyser_donnees_seo_mock as analyser_donnees_seo,
    parser_reponse_grok,
)
from app.services.data_aggregation import agreger_donnees_site
from app.models.recommendation import Recommendation, Severity


@celery_app.task
def generer_recommandations_task(site_id: str, force: bool = False):
    """
    Génère des recommandations SEO pour un site.
    Si force=True, supprime d'abord toutes les anciennes (sécurité idempotente).
    """
    db = SessionLocal()
    try:
        site_uuid = uuid.UUID(site_id)

        # Idempotence : au cas où le router n'aurait pas déjà tout effacé
        if force:
            db.execute(
                delete(Recommendation).where(Recommendation.site_id == site_uuid)
            )
            db.commit()

        donnees_resumees = agreger_donnees_site(site_uuid, db)
        reponse_brute = analyser_donnees_seo(donnees_resumees)
        rapport = parser_reponse_grok(reponse_brute)

        for diag in rapport.diagnostics:
            rec = Recommendation(
                site_id=site_uuid,
                title=diag.title,
                reasoning=diag.reasoning,
                severity=Severity(diag.severity),
                estimated_impact=diag.estimated_impact,
            )
            db.add(rec)
        db.commit()
    finally:
        db.close()