import sys
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))      # .../ai-seo-platform/backend
ROOT_DIR = os.path.dirname(BASE_DIR)                        # .../ai-seo-platform

sys.path.insert(0, BASE_DIR)
sys.path.insert(0, ROOT_DIR)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from uuid import UUID

from app.core.database import get_db
from app.utils.auth import get_current_user
from app.models.user import User
from app.models.site import Site
from app.models.seo_metric import SeoMetric
from app.schemas.seo_metric import SeoMetricCreate, SeoMetricRead
from app.routers import recommendations
from app.routers.core_web_vitals import router as core_web_vitals_router

from app.routers.auth import router as auth_router
from app.routers.google import router as google_router

from app.routers.site import router as site_router
from app.routers.analytics import router as analytics_router
from app.routers import auth_google
from app.routers.auth_google import router as auth_google_router  
from app.routers.reports import router as reports_router
from app.routers import billing




app = FastAPI(
    title="AI SEO Platform",
    description="Plateforme d'analyse SEO avec IA en quasi temps réel",
    version="0.1.0",
    docs_url="/docs"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(reports_router)

app.include_router(auth_router)
app.include_router(google_router)
# app.include_router(auth_google_router)
app.include_router(site_router)
app.include_router(analytics_router)
app.include_router(recommendations.router)
app.include_router(core_web_vitals_router)  
app.include_router(auth_google.router)
app.include_router(billing.router)




@app.get("/")
async def root():
    return {
        "message": "✅ AI SEO Platform Backend is running!",
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}