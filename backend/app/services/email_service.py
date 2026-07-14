import aiosmtplib
from email.message import EmailMessage
from app.core.config import settings


async def send_email(to: str, subject: str, html_content: str):
    """Envoie un email via Gmail SMTP."""
    message = EmailMessage()
    message["From"] = settings.SMTP_USER
    message["To"] = to
    message["Subject"] = subject
    message.set_content("Votre client email ne supporte pas le HTML.")
    message.add_alternative(html_content, subtype="html")

    await aiosmtplib.send(
        message,
        hostname=settings.SMTP_HOST,
        port=settings.SMTP_PORT,
        start_tls=True,
        username=settings.SMTP_USER,
        password=settings.SMTP_PASSWORD,
    )


async def send_password_reset_email(to: str, reset_token: str):
    reset_link = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
        <h2>Réinitialisation de votre mot de passe</h2>
        <p>Vous avez demandé à réinitialiser votre mot de passe sur Ai SEO plateform.</p>
        <p><a href="{reset_link}" style="background:#22d3ee;color:#04141a;padding:10px 20px;text-decoration:none;border-radius:8px;font-weight:bold;">Réinitialiser mon mot de passe</a></p>
        <p>Ce lien expire dans 30 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
    </div>
    """
    await send_email(to=to, subject="Réinitialisation de votre mot de passe AI SEO Platform", html_content=html)