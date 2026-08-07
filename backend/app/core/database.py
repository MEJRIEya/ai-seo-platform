from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

Base = declarative_base()

engine = create_async_engine(settings.DATABASE_URL, echo=settings.DEBUG)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


engine_sync = create_engine(settings.DATABASE_URL_SYNC, echo=settings.DEBUG)
SessionLocal = sessionmaker(bind=engine_sync)