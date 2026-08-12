import secrets
import redis.asyncio as redis
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import jwt, JWTError

from app.core.database import get_db
from app.core.config import settings
from app.utils.auth import get_current_user
from app.models.user import User
from app.models.google_account import GoogleAccount
from app.services.google_oauth import get_authorization_url, exchange_code_for_tokens

router = APIRouter(prefix="/google", tags=["Google OAuth"])

redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)


@router.get("/connect")
async def google_connect(
    token: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Démarre la connexion Google (GSC/GA4). Token JWT en query car navigation navigateur."""
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        email = payload.get("sub")
        if not email:
            raise HTTPException(status_code=401, detail="Token invalide")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token invalide")

    result = await db.execute(select(User).where(User.email == email))
    current_user = result.scalar_one_or_none()
    if not current_user:
        raise HTTPException(status_code=401, detail="Utilisateur introuvable")

    state = secrets.token_urlsafe(24)
    await redis_client.setex(
        f"google_oauth_state:{state}", 600, str(current_user.id)
    )

    auth_url = get_authorization_url(state=state)
    return RedirectResponse(auth_url)


@router.get("/callback")
async def google_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Callback après consentement Google (tokens GSC/GA4)."""
    user_id = await redis_client.get(f"google_oauth_state:{state}")
    if not user_id:
        raise HTTPException(status_code=400, detail="State invalide ou expiré")
    await redis_client.delete(f"google_oauth_state:{state}")

    tokens = exchange_code_for_tokens(code=code, state=state)

    # Récupère l'email Google si possible
    email = tokens.get("email") or ""

    result = await db.execute(
        select(GoogleAccount).where(
            GoogleAccount.user_id == user_id,
            GoogleAccount.google_email == email,
        )
    )
    google_account = result.scalar_one_or_none()

    if google_account:
        google_account.access_token = tokens["access_token"]
        google_account.refresh_token = tokens.get("refresh_token") or google_account.refresh_token
        google_account.scopes = tokens.get("scopes")
        google_account.token_expires_at = tokens.get("expires_at")
    else:
        google_account = GoogleAccount(
            user_id=user_id,
            google_email=email,
            access_token=tokens["access_token"],
            refresh_token=tokens.get("refresh_token"),
            scopes=tokens.get("scopes"),
            token_expires_at=tokens.get("expires_at"),
        )
        db.add(google_account)

    await db.commit()

    frontend = settings.FRONTEND_URL.rstrip("/")
    return RedirectResponse(
        f"{frontend}/dashboard/settings?google_connected=true"
    )


@router.get("/accounts")
async def list_google_accounts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(GoogleAccount).where(GoogleAccount.user_id == current_user.id)
    )
    accounts = result.scalars().all()
    return [
        {
            "id": str(acc.id),
            "google_email": acc.google_email,
            "connected_at": getattr(acc, "connected_at", None),
        }
        for acc in accounts
    ]