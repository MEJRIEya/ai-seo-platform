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
    # important sur Windows parfois
    worker_pool="solo",
)

# Un seul beat_schedule (quasi temps réel = toutes les 15 min)
celery_app.conf.beat_schedule = {
    "refresh-all-sites-every-15-min": {
        "task": "app.tasks.analytics.refresh_all_sites_data",
        "schedule": 15 * 60.0,  # 15 minutes
    },
    # optionnel : gros refresh hebdo la nuit
    "refresh-all-sites-weekly": {
        "task": "app.tasks.analytics.refresh_all_sites_data",
        "schedule": crontab(day_of_week=1, hour=3, minute=0),  # lundi 03:00 UTC
    },
}

# Enregistrement des tasks
import app.tasks.analytics
import app.tasks.recommendations
import app.tasks.core_web_vitals