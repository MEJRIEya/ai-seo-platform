from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional

class SiteBase(BaseModel):
    domain: str
    gsc_property_url: str
    ga4_property_id: Optional[str] = None

class SiteCreate(SiteBase):
    user_id: UUID
    google_account_id: UUID

class SiteRead(SiteBase):
    id: UUID
    user_id: UUID
    google_account_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True