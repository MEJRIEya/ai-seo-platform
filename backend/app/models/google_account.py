import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, ARRAY
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base

class GoogleAccount(Base):
    __tablename__ = "google_accounts"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)

    google_email: Mapped[str] = mapped_column(String)
    access_token: Mapped[str] = mapped_column(String)   # à chiffrer en prod, voir plus bas
    refresh_token: Mapped[str] = mapped_column(String)
    scopes: Mapped[list[str]] = mapped_column(ARRAY(String))
    token_expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    connected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)