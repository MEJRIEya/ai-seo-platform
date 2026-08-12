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
    """Génère l'URL de consentement Google. Le token est passé en query
    car cette route est appelée via une vraie navigation de navigateur,
    qui ne peut pas envoyer de header Authorization personnalisé."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
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
    await redis_client.setex(f"oauth_state:{state}", 600, str(current_user.id))

    auth_url = get_authorization_url(state=state)
    return RedirectResponse(auth_url)


@router.get("/callback")
async def google_callback(code: str, state: str, db: AsyncSession = Depends(get_db)):
    user_id = await redis_client.get(f"oauth_state:{state}")
    if user_id is None:
        raise HTTPException(status_code=400, detail="State invalide ou expiré")
    await redis_client.delete(f"oauth_state:{state}")

    tokens = exchange_code_for_tokens(code=code, state=state)
    email = tokens.get("email", "")

    # Cherche un compte existant avec le même email pour cet utilisateur
    existing = await db.execute(
        select(GoogleAccount).where(
            GoogleAccount.user_id == user_id,
            GoogleAccount.google_email == email,
        )
    )
    google_account = existing.scalar_one_or_none()

    if google_account:
        # Met à jour les tokens plutôt que de dupliquer
        google_account.access_token = tokens["access_token"]
        google_account.refresh_token = tokens["refresh_token"]
        google_account.scopes = tokens["scopes"]
        google_account.token_expires_at = tokens["expires_at"]
    else:
        google_account = GoogleAccount(
            user_id=user_id,
            google_email=email,
            access_token=tokens["access_token"],
            refresh_token=tokens["refresh_token"],
            scopes=tokens["scopes"],
            token_expires_at=tokens["expires_at"],
        )
        db.add(google_account)

    await db.commit()
    await db.refresh(google_account)

    return RedirectResponse(f"{settings.FRONTEND_URL}/dashboard/settings?google_connected=true")


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
        {"id": str(acc.id), "google_email": acc.google_email, "connected_at": acc.connected_at}
        for acc in accounts
    ]