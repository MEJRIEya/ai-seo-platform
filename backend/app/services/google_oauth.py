from google_auth_oauthlib.flow import Flow
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests
from datetime import datetime, timedelta, timezone
from app.core.config import settings

# Scopes pour GSC + GA4 (connexion données)
SCOPES = [
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/analytics.readonly",
    "https://www.googleapis.com/auth/webmasters.readonly",
]

# Scopes pour login uniquement
LOGIN_SCOPES = [
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
]


def build_flow(state: str | None = None) -> Flow:
    """Flow OAuth pour connecter GSC / GA4."""
    client_config = {
        "web": {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [settings.GOOGLE_REDIRECT_URI],
        }
    }
    return Flow.from_client_config(
        client_config,
        scopes=SCOPES,
        state=state,
        redirect_uri=settings.GOOGLE_REDIRECT_URI,
        autogenerate_code_verifier=False,
    )


def get_authorization_url(state: str) -> str:
    """URL de consentement Google pour GSC/GA4."""
    flow = build_flow(state=state)
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
    )
    return auth_url


def exchange_code_for_tokens(code: str, state: str) -> dict:
    """Échange le code contre access_token + refresh_token (GSC/GA4)."""
    flow = build_flow(state=state)
    flow.fetch_token(code=code)

    credentials = flow.credentials
    expires_at = None
    if credentials.expiry:
        expires_at = credentials.expiry
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

    email = ""
    if credentials.id_token:
        try:
            id_info = google_id_token.verify_oauth2_token(
                credentials.id_token,
                google_requests.Request(),
                settings.GOOGLE_CLIENT_ID,
            )
            email = id_info.get("email", "")
        except Exception:
            pass

    return {
        "access_token": credentials.token,
        "refresh_token": credentials.refresh_token,
        "scopes": " ".join(credentials.scopes or []),
        "expires_at": expires_at,
        "email": email,
    }


def build_login_flow(state: str | None = None) -> Flow:
    """Flow OAuth dédié au login utilisateur."""
    client_config = {
        "web": {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [settings.GOOGLE_LOGIN_REDIRECT_URI],
        }
    }
    return Flow.from_client_config(
        client_config,
        scopes=LOGIN_SCOPES,
        state=state,
        redirect_uri=settings.GOOGLE_LOGIN_REDIRECT_URI,
        autogenerate_code_verifier=False,
    )


def get_login_authorization_url(state: str) -> str:
    flow = build_login_flow(state=state)
    auth_url, _ = flow.authorization_url(prompt="select_account")
    return auth_url


def exchange_login_code(code: str, state: str) -> dict:
    """Échange le code login → email / sub / nom."""
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