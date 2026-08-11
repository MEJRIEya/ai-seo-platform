from celery import Celery
from celery.schedules import crontab
from app.core.config import settings

celery_app = Celery(
    "ai_seo_platform",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

celery_app.conf.beat_schedule = {
    "refresh-all-sites-weekly": {
        "task": "app.tasks.analytics.refresh_all_sites_data",
        "schedule": crontab(day_of_week=1, hour=3, minute=0),
    },
}

# Import explicite des modules de tâches, pour que Celery les enregistre correctement
import app.tasks.recommendations
import app.tasks.analytics
import app.tasks.core_web_vitals