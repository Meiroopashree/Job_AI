import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.resume_api import router as resume_router
from app.api.job_api import router as job_router
from app.api.match_api import router as match_router
from app.api.auth_api import router as auth_router
from app.api.profile_api import router as profile_router
from app.api.ats_api import router as ats_router
from app.db.init_db import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


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
            "/jobs/{job_id}",
            "/match/{profile_id}",
            "/ats/check/{profile_id}",
            "/ats/generate/{profile_id}",
            "/ats/score/{profile_id}",
            "/health",
        ],
    }


@app.get("/health", tags=["System"])
def health():
    return {"status": "ok"}
