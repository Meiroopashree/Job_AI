from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import time

from sqlalchemy import or_

from app.db.database import SessionLocal
from app.models.job_model import Job
from app.services.job_normalizer import normalize_job, extract_skills
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
    full_description: Optional[bool] = True


@router.post("/scrape")
def scrape_jobs(req: ScrapeRequest):
    if not req.search_term or not req.search_term.strip():
        return {"error": "search_term is required"}

    results_wanted = max(1, min(req.results_wanted or 25, 50))

    raw_jobs = []
    last_error = None
    for attempt in range(2):
        try:
            if req.platform == "linkedin":
                raw_jobs = scrape_linkedin_jobs(
                    search_term=req.search_term,
                    location=req.location or "",
                    results_wanted=results_wanted,
                    full_description=bool(req.full_description),
                )
            elif req.platform == "indeed":
                raw_jobs = scrape_indeed_jobs(
                    search_term=req.search_term,
                    location=req.location or "",
                    country=req.country or "USA",
                    results_wanted=results_wanted,
                    full_description=bool(req.full_description),
                )
            else:
                return {"error": f"Unsupported platform: {req.platform}"}
            break
        except Exception as e:
            last_error = str(e)
            if attempt == 0:
                time.sleep(2)

    if last_error and not raw_jobs:
        raise HTTPException(
            status_code=502,
            detail=f"Scraping failed on {req.platform}: {last_error[:300]}",
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
def list_jobs(
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
    company: Optional[str] = None,
    location: Optional[str] = None,
):
    db = SessionLocal()
    try:
        page = max(1, page)
        limit = max(1, min(limit, 100))

        query = db.query(Job)
        if search and search.strip():
            like = f"%{search.strip()}%"
            query = query.filter(or_(
                Job.title.ilike(like),
                Job.company.ilike(like),
                Job.description.ilike(like),
            ))
        if company and company.strip():
            query = query.filter(Job.company.ilike(f"%{company.strip()}%"))
        if location and location.strip():
            query = query.filter(Job.location.ilike(f"%{location.strip()}%"))

        total_jobs = query.count()
        jobs = query.order_by(Job.created_at.desc()).offset((page - 1) * limit).limit(limit).all()

        return {
            "total_jobs": total_jobs,
            "page": page,
            "limit": limit,
            "total_pages": (total_jobs + limit - 1) // limit,
            "jobs": [
                {
                    "id": j.id,
                    "title": j.title,
                    "company": j.company,
                    "location": j.location,
                    "skills": j.skills,
                    "description": (j.description or "")[:500],
                    "apply_url": j.apply_url,
                    "created_at": str(j.created_at),
                }
                for j in jobs
            ],
        }
    finally:
        db.close()


@router.post("/backfill")
def backfill_job_skills():
    db = SessionLocal()
    try:
        jobs = db.query(Job).all()
        updated = 0
        for job in jobs:
            if job.skills:
                continue
            text = f"{job.title or ''} {job.description or ''}"
            skills = list(dict.fromkeys(extract_skills(text)))
            job.skills = skills
            updated += 1
        db.commit()
        return {"message": "Skills backfilled", "updated": updated}
    finally:
        db.close()


@router.get("/{job_id}")
def get_job(job_id: int):
    db = SessionLocal()
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        return {
            "id": job.id,
            "title": job.title,
            "company": job.company,
            "location": job.location,
            "description": job.description or "",
            "skills": job.skills or [],
            "apply_url": job.apply_url or "",
            "created_at": str(job.created_at),
        }
    finally:
        db.close()
