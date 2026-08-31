from pydantic import BaseModel, Field
from typing import Any

class AuditStartRequest(BaseModel):
    url: str = Field(..., min_length=3, max_length=255)

class AuditStartResponse(BaseModel):
    site_id: str
    audit_id: str
    domain: str
    status: str
    message: str

class AuditRead(BaseModel):
    id: str
    site_id: str
    domain: str | None = None
    status: str
    is_free: bool
    score_global: int | None = None
    score_performance_mobile: int | None = None
    score_performance_desktop: int | None = None
    score_seo: int | None = None
    psi_mobile: dict[str, Any] | None = None
    psi_desktop: dict[str, Any] | None = None
    onpage: dict[str, Any] | None = None
    error_message: str | None = None

    class Config:
        from_attributes = True