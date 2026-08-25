import secrets
import redis.asyncio as redis
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.config import settings
from app.models.user import User
from app.services.google_oauth import get_login_authorization_url, exchange_login_code
from app.utils.security import create_access_token


redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)


router = APIRouter(prefix="/auth/google", tags=["Auth Google"])


@router.get("/login")
async def google_login():
    """Redirige vers Google pour se connecter (pas de mot de passe)."""
    state = secrets.token_urlsafe(24)
    await redis_client.setex(f"login_state:{state}", 600, "pending")

    auth_url = get_login_authorization_url(state=state)
    return RedirectResponse(auth_url)


@router.get("/callback")
async def google_login_callback(code: str, state: str, db: AsyncSession = Depends(get_db)):
    """Callback après connexion Google : crée le compte si besoin, renvoie un JWT."""
    exists = await redis_client.get(f"login_state:{state}")
    if exists is None:
        raise HTTPException(status_code=400, detail="State invalide ou expiré")
    await redis_client.delete(f"login_state:{state}")

    identity = exchange_login_code(code=code, state=state)

    result = await db.execute(select(User).where(User.google_sub == identity["google_sub"]))
    user = result.scalar_one_or_none()

    if user is None:
        result = await db.execute(select(User).where(User.email == identity["email"]))
        user = result.scalar_one_or_none()

        if user is not None:
            user.google_sub = identity["google_sub"]
        else:
            user = User(
                email=identity["email"],
                full_name=identity["full_name"],
                google_sub=identity["google_sub"],
                password_hash=None,
            )
            db.add(user)

        await db.commit()
        await db.refresh(user)

    access_token = create_access_token(data={"sub": user.email})

    return RedirectResponse(f"{settings.FRONTEND_URL}/auth/callback?token={access_token}")