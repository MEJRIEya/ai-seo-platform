# app/models/audit.py
import uuid
from datetime import datetime
from sqlalchemy import String, Integer, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base

class Audit(Base):
    __tablename__ = "audits"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    site_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("sites.id"), index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)

    status: Mapped[str] = mapped_column(String(32), default="pending")  # pending|running|done|failed
    is_free: Mapped[bool] = mapped_column(Boolean, default=True)

    score_performance_mobile: Mapped[int | None] = mapped_column(Integer, nullable=True)
    score_performance_desktop: Mapped[int | None] = mapped_column(Integer, nullable=True)
    score_seo: Mapped[int | None] = mapped_column(Integer, nullable=True)
    score_global: Mapped[int | None] = mapped_column(Integer, nullable=True)

    psi_mobile: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    psi_desktop: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    onpage: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)