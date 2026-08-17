import stripe
from app.core.config import settings

stripe.api_key = settings.STRIPE_SECRET_KEY


def get_or_create_customer(user, subscription) -> str:
    """
    Récupère ou crée le customer Stripe pour cet utilisateur.
    `subscription` est l'objet Subscription déjà chargé côté appelant
    (évite de dépendre d'une relation ORM user.subscription qui n'existe pas).
    """
    if subscription.stripe_customer_id:
        return subscription.stripe_customer_id

    customer = stripe.Customer.create(
        email=user.email,
        name=user.full_name or user.email,
        metadata={"user_id": str(user.id)},
    )
    return customer.id


def create_checkout_session(customer_id: str, user_id: str, trial_period_days: int | None = None) -> str:
    """
    Crée une session Stripe Checkout.
    Si trial_period_days est fourni, la carte est enregistrée mais aucun
    débit n'a lieu avant la fin de la période d'essai.
    """
    subscription_data = {}
    if trial_period_days:
        subscription_data["trial_period_days"] = trial_period_days

    session = stripe.checkout.Session.create(
        customer=customer_id,
        payment_method_types=["card"],
        line_items=[{"price": settings.STRIPE_PRICE_ID_PRO, "quantity": 1}],
        mode="subscription",
        subscription_data=subscription_data or None,
        success_url=f"{settings.FRONTEND_URL}/dashboard/settings?billing=success",
        cancel_url=f"{settings.FRONTEND_URL}/dashboard/settings?billing=cancelled",
        metadata={"user_id": user_id},
    )
    return session.url


def create_portal_session(customer_id: str) -> str:
    session = stripe.billing_portal.Session.create(
        customer=customer_id,
        return_url=f"{settings.FRONTEND_URL}/dashboard/settings",
    )
    return session.url