from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timedelta, timezone

from app.db.database import SessionLocal
from app.models.profile_model import Profile
from app.models.job_model import Job
from app.models.user_model import User
from app.models.job_pref_model import JobExclusion
from app.services.matching_service import match_profile_to_jobs
from app.auth.jwt_handler import get_current_user

router = APIRouter()


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


@router.get("/{profile_id}")
def match_jobs(
    profile_id: int,
    user: User = Depends(get_current_user),
    page: int = 1,
    limit: int = 10,
    days: Optional[int] = None,
):
    db: Session = SessionLocal()
    try:
        profile = db.query(Profile).filter(
            Profile.id == profile_id,
            Profile.user_id == user.id,
        ).first()

        if not profile:
            return {"error": "Profile not found"}

        job_query = db.query(Job).filter(Job.duplicate_of.is_(None))
        if days:
            cutoff = datetime.now(timezone.utc) - timedelta(days=max(1, min(days, 365)))
            job_query = job_query.filter(Job.created_at >= cutoff)

        jobs = job_query.all()
        excluded_ids = {
            row[0]
            for row in db.query(JobExclusion.job_id).filter(JobExclusion.user_id == user.id).all()
        }

        job_list = [_candidate(job) for job in jobs]

        profile_data = {
            "skills": profile.skills or [],
            "experience": profile.experience,
            "education": profile.education,
            "years_of_experience": profile.years_of_experience,
            "profile_summary": profile.profile_summary or "",
            "location": (profile.personal_info or {}).get("location") if isinstance(profile.personal_info, dict) else None,
        }

        return match_profile_to_jobs(profile_data, job_list, page, limit, excluded_ids=excluded_ids)
    except Exception as e:
        print(f"Match error: {e}")
        return {"error": f"Matching failed: {str(e)}", "results": [], "total_jobs": 0, "total_pages": 0}
    finally:
        db.close()