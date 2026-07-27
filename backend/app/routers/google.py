import secrets
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.utils.auth import get_current_user
from app.models.user import User
from app.models.google_account import GoogleAccount
from app.services.google_oauth import get_authorization_url, exchange_code_for_tokens

router = APIRouter(prefix="/google", tags=["Google OAuth"])

_pending_states: dict[str, str] = {}


@router.get("/connect")
async def google_connect(current_user: User = Depends(get_current_user)):
    """Génère l'URL de consentement Google et redirige l'utilisateur dessus."""
    state = secrets.token_urlsafe(24)
    _pending_states[state] = str(current_user.id)

    auth_url = get_authorization_url(state=state)
    return RedirectResponse(auth_url)


@router.get("/callback")
async def google_callback(code: str, state: str, db: AsyncSession = Depends(get_db)):
    """Google redirige ici après consentement de l'utilisateur."""
    user_id = _pending_states.pop(state, None)
    if user_id is None:
        raise HTTPException(status_code=400, detail="State invalide ou expiré")

    tokens = exchange_code_for_tokens(code=code, state=state)

    google_account = GoogleAccount(
        user_id=user_id,
        google_email="",
        access_token=tokens["access_token"],
        refresh_token=tokens["refresh_token"],
        scopes=tokens["scopes"],
        token_expires_at=tokens["expires_at"],
    )
    db.add(google_account)
    await db.commit()
    await db.refresh(google_account)

    return {
    "message": "Google account connected successfully!",
    "google_account_id": str(google_account.id),
    "google_email": google_account.google_email,
    "status": "success"
}