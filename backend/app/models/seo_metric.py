import uuid
from datetime import datetime
from sqlalchemy import String, Numeric, Integer, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base

class SeoMetric(Base):
    __tablename__ = "seo_metrics"

    time: Mapped[datetime] = mapped_column(DateTime(timezone=True), primary_key=True)
    site_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("sites.id"), primary_key=True)
    page_url: Mapped[str] = mapped_column(String)
    keyword: Mapped[str] = mapped_column(String, nullable=True)
    clicks: Mapped[int] = mapped_column(Integer)
    impressions: Mapped[int] = mapped_column(Integer)
    position: Mapped[float] = mapped_column(Numeric)
    ctr: Mapped[float] = mapped_column(Numeric)