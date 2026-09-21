from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta, timezone
import time

from sqlalchemy import or_

from app.db.database import SessionLocal
from app.models.job_model import Job
from app.models.profile_model import Profile
from app.models.application_model import Application
from app.services.job_normalizer import normalize_job, extract_skills
from app.services.job_service import save_job, deduplicate_jobs
from app.scraper.linkedin_scraper import scrape_linkedin_jobs
from app.scraper.indeed_scraper import scrape_indeed_jobs
from app.models.user_model import User
from app.auth.jwt_handler import get_current_user

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
                    "salary_min": j.salary_min,
                    "salary_max": j.salary_max,
                    "salary_interval": j.salary_interval,
                    "salary_currency": j.salary_currency,
                    "date_posted": j.date_posted,
                    "source": j.source,
                    "created_at": str(j.created_at),
                }
                for j in jobs
            ],
        }
    finally:
        db.close()


@router.get("/recommended")
def recommended_jobs(
    user: User = Depends(get_current_user),
    profile_id: Optional[int] = None,
    limit: int = 5,
    days: int = 30,
):
    from app.services.matching_service import match_profile_to_jobs

    db = SessionLocal()
    try:
        profile_query = db.query(Profile).filter(Profile.user_id == user.id)
        if profile_id:
            profile_query = profile_query.filter(Profile.id == profile_id)
        profile = profile_query.order_by(Profile.id.desc()).first()
        if not profile:
            return {
                "profile_found": False,
                "profile": None,
                "results": [],
                "total_jobs": 0,
                "total_pages": 0,
            }

        cutoff = datetime.now(timezone.utc) - timedelta(days=max(1, min(days, 365)))
        applied_ids = {
            row[0]
            for row in db.query(Application.job_id).filter(Application.user_id == user.id).all()
        }
        jobs = (
            db.query(Job)
            .filter(Job.created_at >= cutoff)
            .order_by(Job.created_at.desc())
            .limit(200)
            .all()
        )
        candidates = [
            {
                "id": j.id,
                "title": j.title,
                "company": j.company,
                "location": j.location,
                "description": j.description,
                "skills": j.skills or [],
                "apply_url": j.apply_url,
                "salary_min": j.salary_min,
                "salary_max": j.salary_max,
                "salary_interval": j.salary_interval,
                "salary_currency": j.salary_currency,
                "date_posted": j.date_posted,
                "source": j.source,
            }
            for j in jobs
            if j.id not in applied_ids
        ]

        profile_info = {"id": profile.id, "file_name": profile.file_name or ""}

        if not candidates:
            return {"profile_found": True, "profile": profile_info, "results": [], "total_jobs": 0, "total_pages": 0}

        profile_data = {
            "skills": profile.skills or [],
            "experience": profile.experience,
            "education": profile.education,
            "years_of_experience": profile.years_of_experience,
            "profile_summary": (profile.profile_summary or "") if isinstance(profile.profile_summary, str) else "",
            "location": (profile.personal_info or {}).get("location") if isinstance(profile.personal_info, dict) else None,
        }

        matched = match_profile_to_jobs(profile_data, candidates, page=1, limit=max(1, min(limit, 10)))
        return {"profile_found": True, "profile": profile_info, **matched}
    finally:
        db.close()


@router.post("/backfill")
def backfill_job_skills(force: bool = False):
    db = SessionLocal()
    try:
        jobs = db.query(Job).all()
        updated = 0
        for job in jobs:
            if job.skills and not force:
                continue
            text = f"{job.title or ''} {job.description or ''}"
            skills = list(dict.fromkeys(extract_skills(text)))
            job.skills = skills
            updated += 1
        db.commit()
        return {"message": "Skills backfilled", "updated": updated}
    finally:
        db.close()


@router.post("/backfill/descriptions")
def backfill_job_descriptions(limit: int = 20):
    from app.services.job_description_backfill import (
        extract_skills_for_job,
        fetch_job_description,
    )

    db = SessionLocal()
    try:
        jobs = (
            db.query(Job)
            .filter(or_(Job.description.is_(None), Job.description == ""))
            .order_by(Job.id.asc())
            .limit(max(1, min(limit, 50)))
            .all()
        )

        updated = 0
        skipped = 0
        failed = 0
        for job in jobs:
            if not job.apply_url:
                skipped += 1
                continue
            try:
                desc = fetch_job_description(job.apply_url)
                if not desc:
                    skipped += 1
                    continue
                job.description = desc
                if not job.skills:
                    job.skills = extract_skills_for_job(job.title, desc)
                updated += 1
            except Exception:
                failed += 1
            time.sleep(0.5)
        db.commit()

        remaining = (
            db.query(Job)
            .filter(or_(Job.description.is_(None), Job.description == ""))
            .count()
        )
        return {
            "message": "Descriptions backfill complete",
            "updated": updated,
            "skipped": skipped,
            "failed": failed,
            "remaining": remaining,
        }
    finally:
        db.close()


@router.get("/auto-scrape/status")
def auto_scrape_status():
    from app.services.auto_scrape_service import get_status
    return get_status()


@router.post("/auto-scrape/run")
def trigger_auto_scrape(user: User = Depends(get_current_user)):
    from app.services.auto_scrape_service import trigger_auto_scrape
    return trigger_auto_scrape()


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
            "salary_min": job.salary_min,
            "salary_max": job.salary_max,
            "salary_interval": job.salary_interval,
            "salary_currency": job.salary_currency,
            "date_posted": job.date_posted,
            "source": job.source,
            "created_at": str(job.created_at),
        }
    finally:
        db.close()
