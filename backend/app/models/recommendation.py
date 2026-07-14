import uuid
from datetime import datetime
from sqlalchemy import String, Text, ForeignKey, DateTime, Enum
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base
import enum

class Severity(str, enum.Enum):
    critical = "critical"
    important = "important"
    opportunity = "opportunity"

class Status(str, enum.Enum):
    open = "open"
    done = "done"
    dismissed = "dismissed"

class Recommendation(Base):
    __tablename__ = "recommendations"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    site_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("sites.id"), index=True)

    title: Mapped[str] = mapped_column(String)
    reasoning: Mapped[str] = mapped_column(Text)
    severity: Mapped[Severity] = mapped_column(Enum(Severity))
    status: Mapped[Status] = mapped_column(Enum(Status), default=Status.open)
    estimated_impact: Mapped[str] = mapped_column(String, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)