import uuid
from datetime import datetime
from sqlalchemy import String, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class Site(Base):
    __tablename__ = "sites"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)

    # Nullable : audit free = pas encore de Google connecté
    google_account_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("google_accounts.id"),
        nullable=True,
        index=True,
    )

    domain: Mapped[str] = mapped_column(String, index=True)

    # Nullable : GSC / GA4 viennent après (plan payant)
    gsc_property_url: Mapped[str | None] = mapped_column(String, nullable=True)
    ga4_property_id: Mapped[str | None] = mapped_column(String, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )