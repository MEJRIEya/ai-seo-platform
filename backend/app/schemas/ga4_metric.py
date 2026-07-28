from pydantic import BaseModel
from uuid import UUID
from datetime import datetime

class Ga4MetricBase(BaseModel):
    page_url: str
    sessions: int = 0
    users: int = 0
    pageviews: int = 0

class Ga4MetricCreate(Ga4MetricBase):
    site_id: UUID
    time: datetime

class Ga4MetricRead(Ga4MetricBase):
    id: UUID
    site_id: UUID
    time: datetime

    class Config:
        from_attributes = True