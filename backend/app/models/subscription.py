import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class Subscription(Base):
    __tablename__ = "subscriptions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), unique=True, index=True)

    plan: Mapped[str] = mapped_column(String, default="free")  # "free" | "pro"
    status: Mapped[str] = mapped_column(String, default="active")  # active | trialing | past_due | canceled

    stripe_customer_id: Mapped[str] = mapped_column(String, nullable=True)
    stripe_subscription_id: Mapped[str] = mapped_column(String, nullable=True)
    current_period_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)

    # Empêche un utilisateur de relancer plusieurs essais gratuits
    has_used_trial: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)