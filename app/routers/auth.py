from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.schemas.auth import UserRegister, UserRead, Token
from app.utils.security import get_password_hash, verify_password, create_access_token
from app.models.user import User
from app.utils.auth import get_current_user
from app.schemas.auth import UserRegister, UserRead, Token, UserUpdate, PasswordChange
import secrets
import redis.asyncio as redis
from app.schemas.auth import ForgotPasswordRequest, ResetPasswordRequest
from app.services.email_service import send_password_reset_email
from app.core.config import settings



router = APIRouter(prefix="/auth", tags=["Authentification"])

@router.post("/register", response_model=UserRead)
async def register(user: UserRegister, db: AsyncSession = Depends(get_db)):
    # Vérifier si l'email existe déjà
    result = await db.execute(select(User).where(User.email == user.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email déjà utilisé")

    # Créer l'utilisateur
    hashed_password = get_password_hash(user.password)
    
    db_user = User(
        email=user.email,
        full_name=user.full_name,
        password_hash=hashed_password
    )
    
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    
    return db_user

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserRead)
async def read_users_me(current_user: User = Depends(get_current_user)):
    """Retourne les informations de l'utilisateur connecté"""
    return current_user


@router.patch("/me", response_model=UserRead)
async def update_profile(
    updates: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Met à jour les informations de profil de l'utilisateur connecté."""
    if updates.full_name is not None:
        current_user.full_name = updates.full_name

    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.post("/me/change-password")
async def change_password(
    data: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Change le mot de passe de l'utilisateur connecté."""

    # Cas 1 : l'utilisateur a déjà un mot de passe -> on vérifie l'ancien avant de le changer
    if current_user.password_hash is not None:
        if not data.current_password:
            raise HTTPException(status_code=400, detail="Mot de passe actuel requis")
        if not verify_password(data.current_password, current_user.password_hash):
            raise HTTPException(status_code=401, detail="Mot de passe actuel incorrect")

    # Cas 2 : compte créé uniquement via Google (jamais eu de mot de passe) -> pas de vérification nécessaire
    current_user.password_hash = get_password_hash(data.new_password)
    await db.commit()

    return {"message": "Mot de passe mis à jour avec succès"}




redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)


@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    """Envoie un email de réinitialisation si le compte existe."""
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    # Toujours répondre pareil, même si l'email n'existe pas
    # -> évite de révéler si un email est enregistré ou non (protection contre l'énumération)
    if user is not None:
        reset_token = secrets.token_urlsafe(32)
        await redis_client.setex(f"password_reset:{reset_token}", 1800, str(user.id))  # 30 minutes
        await send_password_reset_email(to=user.email, reset_token=reset_token)

    return {"message": "Si cet email existe, un lien de réinitialisation a été envoyé."}


@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    """Applique le nouveau mot de passe si le token est valide."""
    user_id = await redis_client.get(f"password_reset:{data.token}")
    if user_id is None:
        raise HTTPException(status_code=400, detail="Lien invalide ou expiré")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    user.password_hash = get_password_hash(data.new_password)
    await db.commit()

    await redis_client.delete(f"password_reset:{data.token}")

    return {"message": "Mot de passe réinitialisé avec succès"}