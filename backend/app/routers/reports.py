from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from uuid import UUID
from fastapi.responses import Response

from app.core.database import get_db
from app.utils.auth import get_current_user
from app.models.user import User
from app.models.site import Site
from app.models.core_web_vital import CoreWebVital
from app.models.recommendation import Recommendation
from app.schemas.report import CoreWebVitalsReport, RecommendationsReport
from app.services.pdf_report import generate_cwv_pdf, generate_recommendations_pdf

router = APIRouter(prefix="/analytics", tags=["Analytics"])


async def _get_owned_site(site_id: UUID, current_user: User, db: AsyncSession) -> Site:
    result = await db.execute(
        select(Site).where(Site.id == site_id, Site.user_id == current_user.id)
    )
    site = result.scalar_one_or_none()
    if not site:
        raise HTTPException(status_code=404, detail="Site non trouvé")
    return site


# ==================== RAPPORT CORE WEB VITALS ====================

@router.get("/sites/{site_id}/report/cwv", response_model=CoreWebVitalsReport)
async def get_cwv_report(
    site_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    site = await _get_owned_site(site_id, current_user, db)

    # Dernière mesure connue par page (même logique que le router core_web_vitals existant)
    sous_requete = (
        select(
            CoreWebVital.page_url,
            func.max(CoreWebVital.time).label("derniere_mesure")
        )
        .where(CoreWebVital.site_id == site_id)
        .group_by(CoreWebVital.page_url)
        .subquery()
    )

    result = await db.execute(
        select(CoreWebVital).join(
            sous_requete,
            (CoreWebVital.page_url == sous_requete.c.page_url)
            & (CoreWebVital.time == sous_requete.c.derniere_mesure)
        ).where(CoreWebVital.site_id == site_id)
    )
    entries = result.scalars().all()

    def score_page(cwv) -> str:
        """Détermine la catégorie globale d'une page à partir de ses 4 métriques."""
        categories = [c for c in [cwv.lcp_categorie, cwv.inp_categorie, cwv.cls_categorie, cwv.fcp_categorie] if c]
        if not categories:
            return "unknown"
        if "poor" in categories:
            return "poor"
        if "needs_improvement" in categories:
            return "needs_improvement"
        return "good"

    nb_bonnes = sum(1 for e in entries if score_page(e) == "good")
    nb_a_ameliorer = sum(1 for e in entries if score_page(e) == "needs_improvement")
    nb_faibles = sum(1 for e in entries if score_page(e) == "poor")

    pages = [
        {
            "page_url": e.page_url,
            "niveau": e.niveau,
            "lcp": float(e.lcp) if e.lcp is not None else None,
            "lcp_categorie": e.lcp_categorie,
            "inp": float(e.inp) if e.inp is not None else None,
            "inp_categorie": e.inp_categorie,
            "cls": float(e.cls) if e.cls is not None else None,
            "cls_categorie": e.cls_categorie,
            "fcp": float(e.fcp) if e.fcp is not None else None,
            "fcp_categorie": e.fcp_categorie,
        }
        for e in entries
    ]

    return {
        "site": site.domain,
        "summary": {
            "total_pages_analysees": len(entries),
            "nb_pages_bonnes": nb_bonnes,
            "nb_pages_a_ameliorer": nb_a_ameliorer,
            "nb_pages_faibles": nb_faibles,
        },
        "pages": pages,
    }


@router.get("/sites/{site_id}/report/cwv/pdf")
async def get_cwv_report_pdf(
    site_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    report_data = await get_cwv_report(site_id, current_user, db)
    pdf_bytes = generate_cwv_pdf(report_data)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="rapport-cwv-{report_data["site"]}.pdf"'},
    )


# ==================== RAPPORT RECOMMANDATIONS ====================

@router.get("/sites/{site_id}/report/recommendations", response_model=RecommendationsReport)
async def get_recommendations_report(
    site_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    site = await _get_owned_site(site_id, current_user, db)

    result = await db.execute(
        select(Recommendation)
        .where(Recommendation.site_id == site_id)
        .order_by(Recommendation.created_at.desc())
    )
    recs = result.scalars().all()

    nb_critical = sum(1 for r in recs if r.severity.value == "critical")
    nb_important = sum(1 for r in recs if r.severity.value == "important")
    nb_opportunity = sum(1 for r in recs if r.severity.value == "opportunity")
    nb_open = sum(1 for r in recs if r.status.value == "open")
    nb_done = sum(1 for r in recs if r.status.value == "done")
    nb_dismissed = sum(1 for r in recs if r.status.value == "dismissed")

    recommendations = [
        {
            "title": r.title,
            "reasoning": r.reasoning,
            "severity": r.severity.value,
            "status": r.status.value,
            "estimated_impact": r.estimated_impact,
        }
        for r in recs
    ]

    return {
        "site": site.domain,
        "summary": {
            "total": len(recs),
            "nb_critical": nb_critical,
            "nb_important": nb_important,
            "nb_opportunity": nb_opportunity,
            "nb_open": nb_open,
            "nb_done": nb_done,
            "nb_dismissed": nb_dismissed,
        },
        "recommendations": recommendations,
    }


@router.get("/sites/{site_id}/report/recommendations/pdf")
async def get_recommendations_report_pdf(
    site_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    report_data = await get_recommendations_report(site_id, current_user, db)
    pdf_bytes = generate_recommendations_pdf(report_data)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="rapport-recommandations-{report_data["site"]}.pdf"'},
    )