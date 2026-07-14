from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.site import SiteCreate, SiteRead
from sqlalchemy import text

router = APIRouter(prefix="/sites", tags=["Sites"])

@router.post("/", response_model=SiteRead)
async def create_site(site: SiteCreate, db: AsyncSession = Depends(get_db)):
    # Pour l'instant on fait une insertion simple
    query = text("""
        INSERT INTO sites (user_id, google_account_id, domain, gsc_property_url, ga4_property_id)
        VALUES (:user_id, :google_account_id, :domain, :gsc_property_url, :ga4_property_id)
        RETURNING id, user_id, google_account_id, domain, gsc_property_url, ga4_property_id, created_at
    """)
    
    result = await db.execute(query, site.dict())
    await db.commit()
    new_site = result.fetchone()
    
    return new_site

@router.get("/")
async def get_sites(db: AsyncSession = Depends(get_db)):
    result = await db.execute(text("SELECT * FROM sites"))
    return result.fetchall()