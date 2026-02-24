# backend/app/celery_app.py
from celery import Celery
import os

CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
CELERY_BACKEND_URL = os.getenv("CELERY_BACKEND_URL", "redis://localhost:6379/1")

celery_app = Celery(
    'app',
    broker=CELERY_BROKER_URL,
    backend=CELERY_BACKEND_URL,
    include=['backend.app.tasks']
)

celery_app.conf.task_track_started = True
celery_app.set_default()