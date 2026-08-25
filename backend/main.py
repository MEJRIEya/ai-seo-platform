import sys
import os
from contextlib import asynccontextmanager

BASE_DIR = os.path.dirname(os.path.abspath(__file__))      # .../ai-seo-platform/backend
ROOT_DIR = os.path.dirname(BASE_DIR)                        # .../ai-seo-platform

sys.path.insert(0, BASE_DIR)
sys.path.insert(0, ROOT_DIR)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import engine, Base
import app.models  # Charge tous les modèles SQLAlchemy

from app.routers import (
    recommendations,
    auth,
    google,
    site,
    analytics,
    auth_google,
    reports,
    billing,
    admin
)
from app.routers.core_web_vitals import router as core_web_vitals_router


# 1. Définition du Lifespan AVANT l'instanciation de FastAPI
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Les tables sont déjà gérées par Alembic, mais ce bloc assure la compatibilité
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


# 2. Instanciation de FastAPI avec lifespan
app = FastAPI(
    title="AI SEO Platform",
    description="Plateforme d'analyse SEO avec IA en quasi temps réel",
    version="0.1.0",
    docs_url="/docs",
    lifespan=lifespan
)

# Configuration CORS
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://ai-seo-platform-zn35.onrender.com",   # Sans slash final
    "https://ai-seo-platform-zn35.onrender.com/",  # Avec slash final
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(reports.router)
app.include_router(admin.router)
app.include_router(auth.router)
app.include_router(google.router)
app.include_router(site.router)
app.include_router(analytics.router)
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