from pydantic import BaseModel
from typing import Optional


class GscSummary(BaseModel):
    total_clicks: int
    total_impressions: int
    avg_position: Optional[float] = None
    avg_ctr: Optional[float] = None


class Ga4Summary(BaseModel):
    total_sessions: int
    total_users: int
    total_pageviews: int


class TopKeywordGsc(BaseModel):
    keyword: str
    clicks: int
    position: Optional[float] = None


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
    gsc_summary: GscSummary
    ga4_summary: Ga4Summary
    top_keywords_gsc: list[TopKeywordGsc]
    top_pages_gsc: list[TopPageGsc]
    top_pages_ga4: list[TopPageGa4]
    daily_trend: list[DailyTrend]