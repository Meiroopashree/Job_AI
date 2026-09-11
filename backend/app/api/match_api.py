from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone

from app.db.database import SessionLocal
from app.models.profile_model import Profile
from app.models.job_model import Job
from app.models.user_model import User
from app.services.matching_service import match_profile_to_jobs
from app.auth.jwt_handler import get_current_user

router = APIRouter()


@router.get("/{profile_id}")
def match_jobs(
    profile_id: int,
    user: User = Depends(get_current_user),
    page: int = 1,
    limit: int = 10,
    days: int = None,
):
    db: Session = SessionLocal()
    try:
        profile = db.query(Profile).filter(
            Profile.id == profile_id,
            Profile.user_id == user.id,
        ).first()

        if not profile:
            return {"error": "Profile not found"}

        job_query = db.query(Job)
        if days:
            cutoff = datetime.now(timezone.utc) - timedelta(days=max(1, min(days, 365)))
            job_query = job_query.filter(Job.created_at >= cutoff)

        jobs = job_query.all()

        profile_data = {
            "skills": profile.skills or [],
            "experience": profile.experience,
            "education": profile.education,
            "years_of_experience": profile.years_of_experience,
            "profile_summary": profile.profile_summary or "",
        }

        job_list = [
            {
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
            }
            for job in jobs
        ]

        return match_profile_to_jobs(profile_data, job_list, page, limit)
    except Exception as e:
        print(f"Match error: {e}")
        return {"error": f"Matching failed: {str(e)}", "results": [], "total_jobs": 0, "total_pages": 0}
    finally:
        db.close()
