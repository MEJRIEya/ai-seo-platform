from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional


class AdminUserRead(BaseModel):
    id: UUID
    email: str
    full_name: Optional[str] = None
    is_active: bool
    is_admin: bool
    created_at: datetime
    sites_count: int

    class Config:
        from_attributes = True


class AdminSiteRead(BaseModel):
    id: UUID
    domain: str
    gsc_property_url: Optional[str] = None
    ga4_property_id: Optional[str] = None
    created_at: datetime
    owner_email: str

    class Config:
        from_attributes = True


class AdminStats(BaseModel):
    total_users: int
    active_users: int
    total_sites: int
    total_recommendations: int
    recommendations_open: int


class UserStatusUpdate(BaseModel):
    is_active: bool