from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

Base = declarative_base()

# 1. Traitement de l'URL Async
database_url = settings.DATABASE_URL
if database_url and database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif database_url and database_url.startswith("postgresql://"):
    database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)

# 2. Ajout de l'argument SSL pour asyncpg (nécessaire sur Render)
connect_args = {}
if "onrender.com" in database_url or "render" in database_url:
    connect_args = {"ssl": "require"}

engine = create_async_engine(
    database_url, 
    echo=settings.DEBUG,
    connect_args=connect_args
)

AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

# 3. Traitement de l'URL Sync (ex: pour Alembic)
database_url_sync = settings.DATABASE_URL_SYNC
if database_url_sync and database_url_sync.startswith("postgres://"):
    database_url_sync = database_url_sync.replace("postgres://", "postgresql://", 1)

engine_sync = create_engine(database_url_sync, echo=settings.DEBUG)
SessionLocal = sessionmaker(bind=engine_sync)