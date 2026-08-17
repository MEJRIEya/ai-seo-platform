import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone

from app.core.database import get_db
from app.core.config import settings
from app.core.plans import PLANS
from app.utils.auth import get_current_user
from app.models.user import User
from app.models.subscription import Subscription
from app.services.stripe_service import get_or_create_customer, create_checkout_session, create_portal_session

router = APIRouter(prefix="/billing", tags=["Billing"])

TRIAL_PERIOD_DAYS = 14


async def _get_or_create_subscription(user: User, db: AsyncSession) -> Subscription:
    result = await db.execute(select(Subscription).where(Subscription.user_id == user.id))
    sub = result.scalar_one_or_none()
    if sub is None:
        sub = Subscription(user_id=user.id, plan="free", status="active")
        db.add(sub)
        await db.commit()
        await db.refresh(sub)
    return sub


async def _get_stripe_customer_id(user: User, sub: Subscription, db: AsyncSession) -> str:
    if sub.stripe_customer_id:
        return sub.stripe_customer_id
    customer_id = get_or_create_customer(user, sub)
    sub.stripe_customer_id = customer_id
    await db.commit()
    return customer_id


@router.get("/plans")
async def list_plans():
    return PLANS


@router.get("/subscription")
async def get_my_subscription(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    sub = await _get_or_create_subscription(current_user, db)
    return {
        "plan": sub.plan,
        "status": sub.status,
        "current_period_end": sub.current_period_end,
        "has_used_trial": sub.has_used_trial,
        "limits": PLANS.get(sub.plan, PLANS["free"]),
    }


@router.post("/checkout")
async def start_checkout(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Abonnement payant classique, sans période d'essai."""
    sub = await _get_or_create_subscription(current_user, db)
    customer_id = await _get_stripe_customer_id(current_user, sub, db)

    checkout_url = create_checkout_session(customer_id, str(current_user.id))
    return {"checkout_url": checkout_url}


@router.post("/start-trial")
async def start_trial(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Démarre un essai gratuit de 14 jours (carte enregistrée, non débitée
    avant la fin de l'essai). Un seul essai autorisé par utilisateur.
    """
    sub = await _get_or_create_subscription(current_user, db)

    if sub.has_used_trial:
        raise HTTPException(status_code=400, detail="Vous avez déjà utilisé votre essai gratuit")

    if sub.plan == "pro":
        raise HTTPException(status_code=400, detail="Vous êtes déjà sur le plan Pro")

    customer_id = await _get_stripe_customer_id(current_user, sub, db)

    # Marqué immédiatement pour éviter les abus (checkout abandonnés + relance)
    sub.has_used_trial = True
    await db.commit()

    checkout_url = create_checkout_session(
        customer_id, str(current_user.id), trial_period_days=TRIAL_PERIOD_DAYS
    )
    return {"checkout_url": checkout_url}


@router.post("/portal")
async def open_billing_portal(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    sub = await _get_or_create_subscription(current_user, db)
    if not sub.stripe_customer_id:
        raise HTTPException(status_code=400, detail="Aucun abonnement Stripe actif")

    portal_url = create_portal_session(sub.stripe_customer_id)
    return {"portal_url": portal_url}


@router.post("/webhook")
async def stripe_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, settings.STRIPE_WEBHOOK_SECRET)
    except (ValueError, stripe.error.SignatureVerificationError):
        raise HTTPException(status_code=400, detail="Signature invalide")

    event_type = event["type"]
    data = event["data"]["object"]

    if event_type == "checkout.session.completed":
        user_id = data["metadata"]["user_id"]
        subscription_id = data["subscription"]

        result = await db.execute(select(Subscription).where(Subscription.user_id == user_id))
        sub = result.scalar_one_or_none()
        if sub:
            sub.stripe_subscription_id = subscription_id
            sub.plan = "pro"
            # Le statut exact (active/trialing) sera fixé juste après par
            # l'événement customer.subscription.updated -> pas de valeur
            # forcée ici pour éviter d'écraser un statut "trialing" par erreur.
            await db.commit()

    elif event_type == "customer.subscription.updated":
        stripe_sub_id = data["id"]
        result = await db.execute(
            select(Subscription).where(Subscription.stripe_subscription_id == stripe_sub_id)
        )
        sub = result.scalar_one_or_none()
        if sub:
            sub.status = data["status"]  # "trialing" | "active" | "past_due" | ...
            period_end = data.get("current_period_end")
            if period_end:
                sub.current_period_end = datetime.fromtimestamp(period_end, tz=timezone.utc)
            await db.commit()

    elif event_type == "customer.subscription.deleted":
        stripe_sub_id = data["id"]
        result = await db.execute(
            select(Subscription).where(Subscription.stripe_subscription_id == stripe_sub_id)
        )
        sub = result.scalar_one_or_none()
        if sub:
            sub.plan = "free"
            sub.status = "canceled"
            await db.commit()

    return {"status": "ok"}