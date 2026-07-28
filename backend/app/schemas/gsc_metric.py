from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional

class GscMetricBase(BaseModel):
    page_url: str
    keyword: Optional[str] = None
    clicks: int = 0
    impressions: int = 0
    position: Optional[float] = None
    ctr: Optional[float] = None

class GscMetricCreate(GscMetricBase):
    site_id: UUID
    time: datetime

class GscMetricRead(GscMetricBase):
    id: UUID
    site_id: UUID
    time: datetime

    class Config:
        from_attributes = True