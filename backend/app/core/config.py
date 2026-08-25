from pydantic_settings import BaseSettings
import os
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    # Application
    PROJECT_NAME: str = "AI SEO Platform"
    DEBUG: bool = True

    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "changez_moi_avec_une_cle_longue_et_secrete_ici_au_moins_32_caracteres")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 jours

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:password@localhost:5432/aiseo")
    DATABASE_URL_SYNC: str = os.getenv("DATABASE_URL_SYNC", "postgresql+psycopg2://postgres:password@localhost:5432/aiseo")


    LLM_PROVIDER: str = "openrouter"
    OPENROUTER_API_KEY: str 
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    OPENROUTER_MODEL: str = "stealth/ox-alpha"

    # xAI
    XAI_API_KEY: str 
    XAI_BASE_URL: str = "https://api.x.ai/v1"
    XAI_MODEL: str = "grok-2-latest"

    # Redis
    REDIS_URL: str

    # Google OAuth
    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET: str
    GOOGLE_REDIRECT_URI: str
    GOOGLE_LOGIN_REDIRECT_URI: str
    CRUX_API_KEY: str

    STRIPE_SECRET_KEY: str
    STRIPE_PRICE_ID_PRO: str
    STRIPE_WEBHOOK_SECRET: str

    # SMTP
    SMTP_HOST: str
    SMTP_PORT: int
    SMTP_USER: str
    SMTP_PASSWORD: str

    FRONTEND_URL: str

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"
    

    


settings = Settings()