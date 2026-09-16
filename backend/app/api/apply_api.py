from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.models.job_model import Job
from app.models.profile_model import Profile
from app.models.user_model import User
from app.auth.jwt_handler import get_current_user
from app.services.apply_service import build_fill_fields

router = APIRouter(prefix="/apply", tags=["Apply"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _job_dict(job: Job, full: bool = True) -> dict:
    return {
        "id": job.id,
        "title": job.title,
        "company": job.company,
        "location": job.location,
        "description": job.description if full else (job.description or "")[:500],
        "skills": job.skills or [],
        "apply_url": job.apply_url or "",
        "salary_min": job.salary_min,
        "salary_max": job.salary_max,
        "salary_interval": job.salary_interval,
        "salary_currency": job.salary_currency,
        "date_posted": job.date_posted,
        "source": job.source,
    }


def _profile_fill_data(profile: Profile, email: str) -> dict:
    return {
        "id": profile.id,
        "file_name": profile.file_name,
        "fields": build_fill_fields(
            {
                "personal_info": profile.personal_info,
                "links": profile.links,
                "profile_summary": profile.profile_summary,
                "skills": profile.skills,
                "languages": profile.languages,
                "certifications": profile.certifications,
                "experience": profile.experience,
                "education": profile.education,
                "years_of_experience": profile.years_of_experience,
            },
            fallback_email=email,
        ),
    }


@router.get("/fill-data/{job_id}")
def get_fill_data(
    job_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    profiles = (
        db.query(Profile)
        .filter(Profile.user_id == user.id)
        .order_by(Profile.id.desc())
        .all()
    )

    return {
        "job": _job_dict(job, full=True),
        "profiles": [_profile_fill_data(p, user.email or "") for p in profiles],
    }