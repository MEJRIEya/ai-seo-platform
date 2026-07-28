from pydantic import BaseModel
from typing import Literal

class DiagnosticIA(BaseModel):
    title: str
    reasoning: str
    severity: Literal["critical", "important", "opportunity"]
    estimated_impact: str | None = None

class RapportIA(BaseModel):
    diagnostics: list[DiagnosticIA]