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


class GscSummary(BaseModel):
    total_clicks: int
    total_impressions: int
    avg_position: Optional[float] = None
    avg_ctr: Optional[float] = None

class Ga4Summary(BaseModel):
    total_sessions: int
    total_users: int
    total_pageviews: int

class TopPageGsc(BaseModel):
    page_url: str
    clicks: int
    impressions: int

class TopPageGa4(BaseModel):
    page_url: str
    sessions: int
    pageviews: int

class DailyTrend(BaseModel):
    date: str
    clicks: int
    sessions: int

class SiteReport(BaseModel):
    site: str
    period_days: int
    gsc_summary: GscSummary
    ga4_summary: Ga4Summary
    top_pages_gsc: list[TopPageGsc]
    top_pages_ga4: list[TopPageGa4]
    daily_trend: list[DailyTrend]
