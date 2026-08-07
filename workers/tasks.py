import uuid
from app.core.celery_app import celery_app
from app.core.database import SessionLocal
from app.services.grok_service import analyser_donnees_seo_mock as analyser_donnees_seo, parser_reponse_grok
from app.services.data_aggregation import agreger_donnees_site
from app.models.recommendation import Recommendation, Severity


@celery_app.task
def generer_recommandations_task(site_id: str):
    db = SessionLocal()
    try:
        site_uuid = uuid.UUID(site_id)

        # 1. Agrège les vraies données GA4 + GSC pour ce site
        donnees_resumees = agreger_donnees_site(site_uuid, db)
        print("=" * 50)
        print("DONNÉES AGRÉGÉES:", donnees_resumees)
        print("=" * 50)

        # 2. Envoie à Grok (ou au mock pour l'instant)
        reponse_brute = analyser_donnees_seo(donnees_resumees)
        rapport = parser_reponse_grok(reponse_brute)

        # 3. Stocke les recommandations
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