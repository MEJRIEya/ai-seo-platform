import uuid
from datetime import datetime
from sqlalchemy import String, Numeric, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class CoreWebVital(Base):
    __tablename__ = "core_web_vitals"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    time: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True, default=datetime.utcnow)
    site_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("sites.id"), index=True)

    page_url: Mapped[str] = mapped_column(String, index=True)
    # "page" si les données viennent de l'URL précise, "origin" si fallback sur le domaine entier
    niveau: Mapped[str] = mapped_column(String)

    # Largest Contentful Paint (ms)
    lcp: Mapped[float] = mapped_column(Numeric, nullable=True)
    lcp_categorie: Mapped[str] = mapped_column(String, nullable=True)

    # Interaction to Next Paint (ms)
    inp: Mapped[float] = mapped_column(Numeric, nullable=True)
    inp_categorie: Mapped[str] = mapped_column(String, nullable=True)

    # Cumulative Layout Shift (sans unité)
    cls: Mapped[float] = mapped_column(Numeric, nullable=True)
    cls_categorie: Mapped[str] = mapped_column(String, nullable=True)

    # First Contentful Paint (ms)
    fcp: Mapped[float] = mapped_column(Numeric, nullable=True)
    fcp_categorie: Mapped[str] = mapped_column(String, nullable=True)