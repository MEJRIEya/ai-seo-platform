from fastapi import Depends, HTTPException, status
from app.models.user import User
from app.utils.auth import get_current_user


async def get_current_admin_user(current_user: User = Depends(get_current_user)) -> User:
    """Réutilise get_current_user, puis vérifie le rôle admin."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé aux administrateurs",
        )
    return current_user