from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.utils.auth import get_current_user
from app.models.user import User
from app.models.site import Site
from app.models.audit import Audit
from app.schemas.audit import AuditStartRequest, AuditStartResponse, AuditRead
from app.services.url_utils import normalize_domain
from app.tasks.audit import run_free_audit_task
from app.tasks.audit import run_free_audit_task


router = APIRouter(prefix="/audit", tags=["Audit"])

FREE_MAX_SITES = 1


@router.post("/start", response_model=AuditStartResponse)
async def start_free_audit(
    body: AuditStartRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        domain = normalize_domain(body.url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # --- Sites de l'utilisateur ---
    result = await db.execute(select(Site).where(Site.user_id == current_user.id))
    sites = list(result.scalars().all())

    existing_site = next((s for s in sites if s.domain == domain), None)

    if existing_site is None:
        if len(sites) >= FREE_MAX_SITES:
            raise HTTPException(
                status_code=403,
                detail={
                    "code": "free_limit_reached",
                    "message": "Le plan gratuit permet 1 seul site. Passez Premium pour en ajouter.",
                },
            )
        existing_site = Site(
            user_id=current_user.id,
            domain=domain,
            gsc_property_url=None,
            ga4_property_id=None,
            # google_account_id=None  # doit être nullable
        )
        db.add(existing_site)
        await db.commit()
        await db.refresh(existing_site)

    # --- Déjà un audit free pour ce user ? ---
    free_q = await db.execute(
        select(Audit).where(
            Audit.user_id == current_user.id,
            Audit.is_free.is_(True),
        )
    )
    free_audit = free_q.scalars().first()

    if free_audit is not None:
        # Déjà consommé : on renvoie l'existant (pas de nouvel appel PSI)
        if free_audit.status in ("pending", "running", "done"):
            return AuditStartResponse(
                site_id=str(free_audit.site_id),
                audit_id=str(free_audit.id),
                domain=domain,
                status=free_audit.status,
                message="Audit gratuit déjà utilisé. Consultez le rapport existant.",
            )
        # Si failed → on autorise 1 relance du même audit free
        free_audit.status = "pending"
        free_audit.error_message = None
        await db.commit()
        await db.refresh(free_audit)
        run_free_audit_task.delay(str(free_audit.id))
        return AuditStartResponse(
            site_id=str(free_audit.site_id),
            audit_id=str(free_audit.id),
            domain=domain,
            status="pending",
            message="Nouvel essai de l'audit gratuit (précédent en échec).",
        )

    # --- Premier audit free ---
    audit = Audit(
        site_id=existing_site.id,
        user_id=current_user.id,
        status="pending",
        is_free=True,
    )
    db.add(audit)
    await db.commit()
    await db.refresh(audit)
    # après db.commit() + refresh(audit) :
    run_free_audit_task.delay(str(audit.id))


    run_free_audit_task.delay(str(audit.id))

    return AuditStartResponse(
        site_id=str(existing_site.id),
        audit_id=str(audit.id),
        domain=existing_site.domain,
        status="pending",
        message="Audit PageSpeed lancé. Les données seront enregistrées en base.",
    )


@router.get("/{audit_id}", response_model=AuditRead)
async def get_audit(
    audit_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Audit).where(
            Audit.id == audit_id,
            Audit.user_id == current_user.id,
        )
    )
    audit = result.scalar_one_or_none()
    if audit is None:
        raise HTTPException(status_code=404, detail="Audit introuvable")

    site_r = await db.execute(select(Site).where(Site.id == audit.site_id))
    site = site_r.scalar_one_or_none()

    return AuditRead(
        id=str(audit.id),
        site_id=str(audit.site_id),
        domain=site.domain if site else None,
        status=audit.status,
        is_free=audit.is_free,
        score_global=audit.score_global,
        score_performance_mobile=audit.score_performance_mobile,
        score_performance_desktop=audit.score_performance_desktop,
        score_seo=audit.score_seo,
        psi_mobile=audit.psi_mobile,
        psi_desktop=audit.psi_desktop,
        onpage=audit.onpage,
        error_message=audit.error_message,
    )


@router.get("/my-latest")
async def my_latest_audit(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Audit)
        .where(Audit.user_id == current_user.id)
        .order_by(Audit.created_at.desc())
        .limit(1)
    )
    audit = result.scalar_one_or_none()
    if not audit:
        return None

    site = await db.get(Site, audit.site_id)
    return {
        "id": str(audit.id),
        "site_id": str(audit.site_id),
        "domain": site.domain if site else None,
        "status": audit.status,
        "is_free": audit.is_free,
        "score_global": audit.score_global,
        "score_performance_mobile": audit.score_performance_mobile,
        "score_performance_desktop": audit.score_performance_desktop,
        "score_seo": audit.score_seo,
        "created_at": audit.created_at,
    }
