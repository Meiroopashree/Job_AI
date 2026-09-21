import os
import time
import threading
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer
from pydantic import BaseModel
from typing import Optional

from sqlalchemy import or_

from app.db.database import SessionLocal
from app.models.job_model import Job
from app.models.profile_model import Profile
from app.models.application_model import Application
from app.models.job_pref_model import JobBookmark, JobExclusion
from app.models.scrape_job_model import ScrapeJob
from app.services.job_normalizer import normalize_job, extract_skills
from app.services.job_service import save_job, deduplicate_jobs, flag_near_duplicates
from app.services.profile_scrape_service import get_scraper_health
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


class ProfileScrapeRequest(BaseModel):
    profile_id: Optional[int] = None


def _candidate(job) -> dict:
    return {
        "id": job.id,
        "title": job.title,
        "company": job.company,
        "location": job.location,
        "description": job.description,
        "skills": job.skills or [],
        "apply_url": job.apply_url,
        "salary_min": job.salary_min,
        "salary_max": job.salary_max,
        "salary_interval": job.salary_interval,
        "salary_currency": job.salary_currency,
        "date_posted": job.date_posted,
        "source": job.source,
        "country": job.country,
        "is_remote": bool(job.is_remote),
        "duplicate_of": job.duplicate_of,
        "embedding": job.embedding,
    }


def _profile_data(profile) -> dict:
    return {
        "skills": profile.skills or [],
        "experience": profile.experience,
        "education": profile.education,
        "years_of_experience": profile.years_of_experience,
        "profile_summary": (profile.profile_summary or "") if isinstance(profile.profile_summary, str) else "",
        "location": (profile.personal_info or {}).get("location") if isinstance(profile.personal_info, dict) else None,
    }


def _user_excluded_ids(db, user_id: int) -> set:
    return {
        row[0]
        for row in db.query(JobExclusion.job_id).filter(JobExclusion.user_id == user_id).all()
    }


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
                "is_remote": bool(saved_job.is_remote),
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


@router.post("/dedupe")
def flag_duplicates_endpoint():
    db = SessionLocal()
    try:
        flagged = flag_near_duplicates(db)
        return {"message": "Near-duplicate postings flagged", "flagged": flagged}
    finally:
        db.close()


@router.post("/backfill-locations")
def backfill_locations_endpoint():
    from app.services.job_service import _classify_location

    db = SessionLocal()
    try:
        jobs = db.query(Job).all()
        updated = 0
        for job in jobs:
            loc = _classify_location(job.location)
            if job.country != loc["country"] or job.is_remote != loc["is_remote"]:
                job.country = loc["country"]
                job.is_remote = loc["is_remote"]
                updated += 1
        db.commit()
        return {"message": "Job locations backfilled", "updated": updated}
    finally:
        db.close()


@router.post("/embeddings")
def embed_jobs_endpoint(limit: int = 1000, force: bool = False):
    from app.ai.embeddings import fetch_embeddings

    db = SessionLocal()
    try:
        query = db.query(Job)
        if not force:
            query = query.filter(Job.embedding.is_(None))
        jobs = query.order_by(Job.id.asc()).limit(max(1, min(limit, 5000))).all()

        updated = 0
        failed = 0
        for start in range(0, len(jobs), 20):
            batch = jobs[start:start + 20]
            texts = [f"{j.title} {j.company} {' '.join(j.skills or [])} {j.description or ''}"[:4000] for j in batch]
            vectors = fetch_embeddings(texts)
            if not vectors:
                failed += len(batch)
                continue
            for job, vec in zip(batch, vectors):
                if vec:
                    job.embedding = vec
                    updated += 1
                else:
                    failed += 1
            db.commit()

        remaining = (
            db.query(Job).filter(Job.embedding.is_(None)).count()
            if not force else 0
        )
        return {"message": "Embeddings backfilled", "updated": updated, "failed": failed, "remaining": remaining}
    finally:
        db.close()


@router.get("/scraper-health")
def scraper_health():
    return get_scraper_health()


@router.get("/")
def list_jobs(
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
    company: Optional[str] = None,
    location: Optional[str] = None,
    posted_days: int = 0,
    min_salary: Optional[float] = None,
    max_salary: Optional[float] = None,
    sort: str = "newest",
):
    db = SessionLocal()
    try:
        page = max(1, page)
        limit = max(1, min(limit, 100))

        query = db.query(Job).filter(Job.duplicate_of.is_(None))
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
        if posted_days and posted_days > 0:
            cutoff = datetime.now(timezone.utc) - timedelta(days=posted_days)
            query = query.filter(Job.created_at >= cutoff)
        if min_salary is not None:
            query = query.filter(or_(
                Job.salary_min.is_(None),
                Job.salary_min >= min_salary,
            ))
        if max_salary is not None:
            query = query.filter(or_(
                Job.salary_max.is_(None),
                Job.salary_max <= max_salary,
            ))

        sort_map = {
            "newest": Job.created_at.desc(),
            "oldest": Job.created_at.asc(),
            "salary_desc": Job.salary_max.desc().nullslast(),
            "salary_asc": Job.salary_max.asc().nullsfirst(),
            "title": Job.title.asc(),
        }
        order = sort_map.get(sort, Job.created_at.desc())

        total_jobs = query.count()
        jobs = query.order_by(order).offset((page - 1) * limit).limit(limit).all()

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
                    "country": j.country,
                    "is_remote": bool(j.is_remote),
                    "created_at": str(j.created_at),
                }
                for j in jobs
            ],
        }
    finally:
        db.close()


@router.get("/bookmarks")
def list_bookmarks(
    user: User = Depends(get_current_user),
):
    db = SessionLocal()
    try:
        rows = (
            db.query(Job)
            .join(JobBookmark, JobBookmark.job_id == Job.id)
            .filter(JobBookmark.user_id == user.id)
            .order_by(JobBookmark.created_at.desc())
            .all()
        )
        return {
            "bookmarks": [
                {
                    "id": j.id,
                    "title": j.title,
                    "company": j.company,
                    "location": j.location,
                    "skills": j.skills or [],
                    "apply_url": j.apply_url,
                    "salary_min": j.salary_min,
                    "salary_max": j.salary_max,
                    "salary_currency": j.salary_currency,
                    "description": (j.description or "")[:500],
                    "source": j.source,
                    "date_posted": j.date_posted,
                }
                for j in rows
            ]
        }
    finally:
        db.close()


@router.post("/{job_id}/bookmark")
def add_bookmark(
    job_id: int,
    user: User = Depends(get_current_user),
):
    db = SessionLocal()
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        if not db.query(JobBookmark).filter(
            JobBookmark.user_id == user.id, JobBookmark.job_id == job_id
        ).first():
            db.add(JobBookmark(user_id=user.id, job_id=job_id))
            db.commit()
        return {"bookmarked": True, "job_id": job_id}
    finally:
        db.close()


@router.delete("/{job_id}/bookmark")
def remove_bookmark(
    job_id: int,
    user: User = Depends(get_current_user),
):
    db = SessionLocal()
    try:
        db.query(JobBookmark).filter(
            JobBookmark.user_id == user.id, JobBookmark.job_id == job_id
        ).delete()
        db.commit()
        return {"bookmarked": False, "job_id": job_id}
    finally:
        db.close()


@router.post("/{job_id}/exclude")
def exclude_job(
    job_id: int,
    user: User = Depends(get_current_user),
):
    db = SessionLocal()
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        if not db.query(JobExclusion).filter(
            JobExclusion.user_id == user.id, JobExclusion.job_id == job_id
        ).first():
            db.add(JobExclusion(user_id=user.id, job_id=job_id))
            db.commit()
        return {"excluded": True, "job_id": job_id}
    finally:
        db.close()


@router.delete("/{job_id}/exclude")
def unexclude_job(
    job_id: int,
    user: User = Depends(get_current_user),
):
    db = SessionLocal()
    try:
        db.query(JobExclusion).filter(
            JobExclusion.user_id == user.id, JobExclusion.job_id == job_id
        ).delete()
        db.commit()
        return {"excluded": False, "job_id": job_id}
    finally:
        db.close()


@router.get("/scrape-recommend/{job_id}")
def scrape_recommend_status(
    job_id: int,
    user: User = Depends(get_current_user),
):
    db = SessionLocal()
    try:
        sj = db.query(ScrapeJob).filter(
            ScrapeJob.id == job_id, ScrapeJob.user_id == user.id
        ).first()
        if not sj:
            raise HTTPException(status_code=404, detail="Job not found")
        result = sj.result or {}
        return {
            "status": sj.status,
            "job_id": sj.id,
            "profile_id": sj.profile_id,
            "added": sj.added_count,
            "counts": sj.counts or {},
            "errors": sj.errors or [],
            "error": sj.error,
            "profile_found": True,
            "profile": {"id": sj.profile_id, "file_name": ""},
            "results": result.get("results", []) if sj.status == "done" else [],
            "total_jobs": result.get("total_jobs", 0),
            "total_pages": result.get("total_pages", 0),
        }
    finally:
        db.close()


def _process_scrape_job(job_id: int):
    from app.services.matching_service import match_profile_to_jobs
    from app.services.profile_scrape_service import scrape_for_profile

    db = SessionLocal()
    try:
        sj = db.query(ScrapeJob).filter(ScrapeJob.id == job_id).first()
        profile = db.query(Profile).filter(Profile.id == sj.profile_id).first() if sj else None
        if not sj or not profile:
            if sj:
                sj.status = "failed"
                sj.error = "profile missing"
                db.commit()
            return

        sj.status = "running"
        sj.started_at = datetime.now(timezone.utc)
        db.commit()

        new_ids, counts, errors = scrape_for_profile(
            db, profile, per_term=int(os.getenv("SCRAPE_RECOMMEND_PER_TERM", "8")), max_terms=2
        )
        sj.added_count = len(new_ids)

        if new_ids:
            jobs = db.query(Job).filter(Job.id.in_(new_ids)).all()
            candidates = [_candidate(j) for j in jobs]
            matched = match_profile_to_jobs(_profile_data(profile), candidates, page=1, limit=10)
            sj.result = {
                "results": matched.get("results", []),
                "total_jobs": matched.get("total_jobs", 0),
                "total_pages": matched.get("total_pages", 0),
            }

        sj.counts = counts
        sj.errors = errors[:20]
        sj.status = "done"
        sj.finished_at = datetime.now(timezone.utc)
        db.commit()
    except Exception as e:
        try:
            sj = db.query(ScrapeJob).filter(ScrapeJob.id == job_id).first()
            if sj:
                sj.status = "failed"
                sj.error = str(e)[:500]
                sj.finished_at = datetime.now(timezone.utc)
                db.commit()
        except Exception:
            pass
        print(f"[scrape-queue] job {job_id} failed: {e}")
    finally:
        db.close()


@router.post("/scrape-recommend")
def queue_scrape_recommend(req: ProfileScrapeRequest, user: User = Depends(get_current_user)):
    """Queue a tailored scrape for one resume. Runs in the background; poll
    GET /scrape-recommend/{job_id} for the result."""
    db = SessionLocal()
    try:
        profile_query = db.query(Profile).filter(Profile.user_id == user.id)
        if req.profile_id:
            profile_query = profile_query.filter(Profile.id == req.profile_id)
        profile = profile_query.order_by(Profile.id.desc()).first()
        if not profile:
            raise HTTPException(status_code=404, detail="Upload a resume first")

        running = (
            db.query(ScrapeJob)
            .filter(
                ScrapeJob.user_id == user.id,
                ScrapeJob.status.in_(["queued", "running"]),
            )
            .order_by(ScrapeJob.id.desc())
            .first()
        )
        if running:
            return {
                "status": "queued_existing",
                "job_id": running.id,
                "profile_found": True,
                "profile": {"id": profile.id, "file_name": profile.file_name or ""},
            }

        sj = ScrapeJob(user_id=user.id, profile_id=profile.id, status="queued")
        db.add(sj)
        db.commit()
        db.refresh(sj)
        job_record_id = sj.id
        profile_info = {"id": profile.id, "file_name": profile.file_name or ""}
    finally:
        db.close()

    threading.Thread(target=_process_scrape_job, args=(job_record_id,), daemon=True).start()
    return {
        "status": "queued",
        "job_id": job_record_id,
        "profile_found": True,
        "profile": profile_info,
    }


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
        excluded_ids = _user_excluded_ids(db, user.id)
        bookmarked_ids = {
            row[0]
            for row in db.query(JobBookmark.job_id).filter(JobBookmark.user_id == user.id).all()
        }
        jobs = (
            db.query(Job)
            .filter(Job.created_at >= cutoff, Job.duplicate_of.is_(None))
            .order_by(Job.created_at.desc())
            .limit(200)
            .all()
        )
        candidates = [
            _candidate(j)
            for j in jobs
            if j.id not in applied_ids and j.id not in excluded_ids
        ]

        profile_info = {"id": profile.id, "file_name": profile.file_name or ""}

        if not candidates:
            return {"profile_found": True, "profile": profile_info, "results": [], "total_jobs": 0, "total_pages": 0}

        matched = match_profile_to_jobs(_profile_data(profile), candidates, page=1, limit=max(1, min(limit, 10)))
        for item in matched.get("results", []):
            item["bookmarked"] = int(item["job"]["id"]) in bookmarked_ids
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
            "country": job.country,
            "is_remote": bool(job.is_remote),
            "created_at": str(job.created_at),
        }
    finally:
        db.close()