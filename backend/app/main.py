import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from apscheduler.schedulers.background import BackgroundScheduler

from app.api.resume_api import router as resume_router
from app.api.job_api import router as job_router
from app.api.match_api import router as match_router
from app.api.auth_api import router as auth_router
from app.api.profile_api import router as profile_router
from app.api.ats_api import router as ats_router
from app.api.applications_api import router as applications_router
from app.api.generate_api import router as generate_router
from app.db.init_db import init_db
from app.services import auto_scrape_service

scheduler = None


def start_scheduler():
    global scheduler
    if not auto_scrape_service.is_enabled():
        print("[scheduler] Auto-scrape disabled, skipping scheduler")
        return
    interval_h = auto_scrape_service.interval_hours()
    scheduler = BackgroundScheduler(timezone="UTC")
    scheduler.add_job(
        auto_scrape_service.run_auto_scrape,
        "interval",
        hours=interval_h,
        id="auto_scrape",
        max_instances=1,
        coalesce=True,
        next_run_time=datetime.now(timezone.utc),
    )
    scheduler.start()
    print(f"[scheduler] Auto-scrape started (now, then every {interval_h}h)")


def stop_scheduler():
    global scheduler
    if scheduler:
        scheduler.shutdown(wait=False)
        scheduler = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    start_scheduler()
    yield
    stop_scheduler()


origins_env = os.getenv("CORS_ORIGINS", "http://localhost:3000")
origins = [o.strip() for o in origins_env.split(",") if o.strip()]

app = FastAPI(title="JobAI API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(resume_router)
app.include_router(profile_router)
app.include_router(job_router, prefix="/jobs", tags=["Jobs"])
app.include_router(match_router, prefix="/match", tags=["Match"])
app.include_router(ats_router)
app.include_router(applications_router)
app.include_router(generate_router)


@app.get("/", tags=["System"])
def root():
    return {
        "name": "JobAI API",
        "version": "1.0.0",
        "status": "ok",
        "endpoints": [
            "/auth/register",
            "/auth/login",
            "/auth/me",
            "/upload-resume",
            "/upload-resume/list",
            "/jobs/scrape",
            "/jobs/",
            "/jobs/stats",
            "/jobs/backfill",
            "/jobs/auto-scrape/status",
            "/jobs/auto-scrape/run",
            "/jobs/{job_id}",
            "/match/{profile_id}",
            "/ats/check/{profile_id}",
            "/ats/generate/{profile_id}",
            "/ats/score/{profile_id}",
            "/applications",
            "/generate/cover-letter",
            "/generate/tailored-resume",
            "/health",
        ],
    }


@app.get("/health", tags=["System"])
def health():
    return {"status": "ok"}
