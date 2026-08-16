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


class DailyTrendGsc(BaseModel):
    date: str
    clicks: int


class DailyTrendGa4(BaseModel):
    date: str
    sessions: int


# ==================== RAPPORT GSC ====================

class GscReport(BaseModel):
    site: str
    period: str
    summary: GscSummary
    top_keywords: list[TopKeywordGsc]
    top_pages: list[TopPageGsc]
    daily_trend: list[DailyTrendGsc]


# ==================== RAPPORT GA4 ====================

class Ga4Report(BaseModel):
    site: str
    period: str
    summary: Ga4Summary
    top_pages: list[TopPageGa4]
    daily_trend: list[DailyTrendGa4]



class TopKeywordGscOld(BaseModel):
    keyword: str
    clicks: int
    position: Optional[float] = None


class DailyTrend(BaseModel):
    date: str
    clicks: int
    sessions: int


class SiteReport(BaseModel):
    site: str
    period_days: int = 30
    gsc_summary: GscSummary
    ga4_summary: Ga4Summary
    top_keywords_gsc: list[TopKeywordGsc]
    top_pages_gsc: list[TopPageGsc]
    top_pages_ga4: list[TopPageGa4]
    daily_trend: list[DailyTrend]


# ==================== RAPPORT CORE WEB VITALS ====================

class CwvPageEntry(BaseModel):
    page_url: str
    niveau: Optional[str] = None
    lcp: Optional[float] = None
    lcp_categorie: Optional[str] = None
    inp: Optional[float] = None
    inp_categorie: Optional[str] = None
    cls: Optional[float] = None
    cls_categorie: Optional[str] = None
    fcp: Optional[float] = None
    fcp_categorie: Optional[str] = None


class CwvSummary(BaseModel):
    total_pages_analysees: int
    nb_pages_bonnes: int
    nb_pages_a_ameliorer: int
    nb_pages_faibles: int


class CoreWebVitalsReport(BaseModel):
    site: str
    summary: CwvSummary
    pages: list[CwvPageEntry]


# ==================== RAPPORT RECOMMANDATIONS ====================

class RecommendationEntry(BaseModel):
    title: str
    reasoning: str
    severity: str
    status: str
    estimated_impact: Optional[str] = None


class RecommendationsSummary(BaseModel):
    total: int
    nb_critical: int
    nb_important: int
    nb_opportunity: int
    nb_open: int
    nb_done: int
    nb_dismissed: int


class RecommendationsReport(BaseModel):
    site: str
    summary: RecommendationsSummary
    recommendations: list[RecommendationEntry]