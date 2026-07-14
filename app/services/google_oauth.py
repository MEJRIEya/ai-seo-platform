from google_auth_oauthlib.flow import Flow
from app.core.config import settings
from datetime import timezone
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests


SCOPES = [
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/analytics.readonly",
    "https://www.googleapis.com/auth/webmasters.readonly",
]

def build_flow(state: str | None = None) -> Flow:
    """Construit un Flow OAuth Google configuré avec nos identifiants."""
    client_config = {
        "web": {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [settings.GOOGLE_REDIRECT_URI],
        }
    }
    flow = Flow.from_client_config(
        client_config,
        scopes=SCOPES,
        state=state,
        redirect_uri=settings.GOOGLE_REDIRECT_URI,
        autogenerate_code_verifier=False,  # ← désactive PKCE, inutile pour un client confidentiel
    )
    return flow


def get_authorization_url(state: str) -> str:
    """Génère l'URL vers laquelle rediriger l'utilisateur pour le consentement Google."""
    flow = build_flow(state=state)
    auth_url, _ = flow.authorization_url(
        access_type="offline",       # indispensable pour obtenir un refresh_token
        include_granted_scopes="true",
        prompt="consent",            # force le renvoi d'un refresh_token même si déjà autorisé avant
    )
    return auth_url



def exchange_code_for_tokens(code: str, state: str) -> dict:
    """Échange le code temporaire reçu de Google contre les tokens d'accès."""
    flow = build_flow(state=state)
    flow.fetch_token(code=code)
    creds = flow.credentials

    expires_at = creds.expiry
    if expires_at is not None and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    return {
        "access_token": creds.token,
        "refresh_token": creds.refresh_token,
        "scopes": creds.scopes or SCOPES,  # fallback si Google ne renvoie rien
        "expires_at": expires_at,
    }

LOGIN_SCOPES = ["openid", "https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/userinfo.profile"]


def build_login_flow(state: str | None = None) -> Flow:
    """Flow OAuth dédié à la connexion (login), distinct de celui pour GA4/GSC."""
    client_config = {
        "web": {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [settings.GOOGLE_LOGIN_REDIRECT_URI],
        }
    }
    flow = Flow.from_client_config(
        client_config,
        scopes=LOGIN_SCOPES,
        state=state,
        redirect_uri=settings.GOOGLE_LOGIN_REDIRECT_URI,
        autogenerate_code_verifier=False,
    )
    return flow


def get_login_authorization_url(state: str) -> str:
    flow = build_login_flow(state=state)
    auth_url, _ = flow.authorization_url(include_granted_scopes="true", prompt="select_account")
    return auth_url


def exchange_login_code(code: str, state: str) -> dict:
    """Échange le code, vérifie l'identité, retourne email/sub/nom."""
    flow = build_login_flow(state=state)
    flow.fetch_token(code=code)

    id_info = google_id_token.verify_oauth2_token(
        flow.credentials.id_token,
        google_requests.Request(),
        settings.GOOGLE_CLIENT_ID,
    )

    return {
        "google_sub": id_info["sub"],
        "email": id_info["email"],
        "full_name": id_info.get("name"),
    }