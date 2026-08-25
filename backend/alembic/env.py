import asyncio
from logging.config import fileConfig
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import pool
from alembic import context

from app.core.database import Base
from app.core.config import settings
import app.models  # force l'import de tous les modèles

# Configuration de la section Alembic
config = context.config

# 1. Nettoyage et transformation de la chaîne de connexion
db_url = settings.DATABASE_URL or ""
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

# Injection de l'URL avec le bon driver (+asyncpg) dans la config Alembic
config.set_main_option("sqlalchemy.url", db_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline():
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online():
    # SSL conditionnel pour l'environnement distant Render
    connect_args = {}
    if "render.com" in db_url and "dpg-" not in db_url:
        connect_args = {"ssl": "require"}

    # Utilisation de create_async_engine au lieu d'async_engine_from_config
    connectable = create_async_engine(
        db_url,
        poolclass=pool.NullPool,
        connect_args=connect_args
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())