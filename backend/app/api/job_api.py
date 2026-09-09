from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone

from app.db.database import SessionLocal
from app.models.job_model import Job
from app.services.job_normalizer import normalize_job
from app.services.job_service import save_job, deduplicate_jobs
from app.scraper.linkedin_scraper import scrape_linkedin_jobs
from app.scraper.indeed_scraper import scrape_indeed_jobs

router = APIRouter()


class ScrapeRequest(BaseModel):
    platform: str
    search_term: Optional[str] = None
    location: Optional[str] = None
    country: Optional[str] = None
    results_wanted: Optional[int] = 25
    full_description: Optional[bool] = False


@router.post("/scrape")
def scrape_jobs(req: ScrapeRequest):
    if not req.search_term:
        return {"error": "search_term is required"}

    try:
        if req.platform == "linkedin":
            raw_jobs = scrape_linkedin_jobs(
                search_term=req.search_term,
                location=req.location or "",
                results_wanted=req.results_wanted or 25,
                full_description=bool(req.full_description),
            )
        elif req.platform == "indeed":
            raw_jobs = scrape_indeed_jobs(
                search_term=req.search_term,
                location=req.location or "",
                country=req.country or "USA",
                results_wanted=req.results_wanted or 25,
                full_description=bool(req.full_description),
            )
        else:
            return {"error": f"Unsupported platform: {req.platform}"}
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Scraping failed on {req.platform}: {str(e)[:300]}",
        )

    db = SessionLocal()
    saved = []
    try:
        for job in raw_jobs:
            normalized = normalize_job(job)
            saved_job = save_job(db, normalized)
            saved.append({
                "id": saved_job.id,
                "title": saved_job.title,
                "company": saved_job.company,
                "location": saved_job.location,
            })
        db.commit()
    finally:
        db.close()

    return {
        "message": "Jobs scraped successfully",
        "platform": req.platform,
        "count": len(saved),
        "jobs": saved,
    }


@router.get("/stats")
def job_stats():
    db = SessionLocal()
    try:
        total = db.query(Job).count()
        jobs_today = db.query(Job).filter(
            Job.created_at >= datetime.now(timezone.utc).date(),
        ).count()

        return {
            "total_jobs": total,
            "jobs_today": jobs_today,
        }
    finally:
        db.close()


@router.post("/deduplicate")
def deduplicate_jobs_endpoint():
    db = SessionLocal()
    try:
        removed = deduplicate_jobs(db)
        return {"message": "Duplicates removed", "removed": removed}
    finally:
        db.close()


@router.get("/")
def list_jobs():
    db = SessionLocal()
    try:
        jobs = db.query(Job).all()
        return [
            {
                "id": j.id,
                "title": j.title,
                "company": j.company,
                "location": j.location,
                "skills": j.skills,
                "created_at": str(j.created_at),
            }
            for j in jobs
        ]
    finally:
        db.close()
