from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional

class SeoMetricBase(BaseModel):
    page_url: str
    keyword: Optional[str] = None
    clicks: Optional[int] = None
    impressions: Optional[int] = None
    position: Optional[float] = None
    ctr: Optional[float] = None
    sessions: Optional[int] = None
    users: Optional[int] = None
    pageviews: Optional[int] = None

class SeoMetricCreate(SeoMetricBase):
    site_id: UUID
    time: datetime

class SeoMetricRead(SeoMetricBase):
    id: UUID
    site_id: UUID
    time: datetime

    class Config:
        from_attributes = True