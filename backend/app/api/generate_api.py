from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.models.profile_model import Profile
from app.models.job_model import Job
from app.models.user_model import User
from app.auth.jwt_handler import get_current_user
from app.services.generate_service import generate_cover_letter, generate_tailored_resume
from app.ai.mistral_client import MistralError

router = APIRouter(prefix="/generate", tags=["Generate"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_profile_or_404(profile_id: int, user_id: int, db: Session):
    profile = db.query(Profile).filter(
        Profile.id == profile_id,
        Profile.user_id == user_id,
    ).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


def profile_to_dict(profile: Profile):
    return {
        "personal_info": profile.personal_info,
        "links": profile.links,
        "profile_summary": profile.profile_summary,
        "skills": profile.skills or [],
        "languages": profile.languages or [],
        "certifications": profile.certifications or [],
        "achievements": profile.achievements or [],
        "experience": profile.experience or [],
        "education": profile.education or [],
        "courses": profile.courses or [],
        "years_of_experience": profile.years_of_experience,
        "experience_summary": profile.experience_summary,
    }


def job_to_dict(job: Job):
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
    }


class GenerateRequest(BaseModel):
    profile_id: int
    job_id: int


@router.post("/cover-letter")
def cover_letter_endpoint(req: GenerateRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = get_profile_or_404(req.profile_id, user.id, db)
    job = db.query(Job).filter(Job.id == req.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    try:
        letter = generate_cover_letter(profile_to_dict(profile), job_to_dict(job))
    except MistralError as e:
        status = e.status_code if e.status_code in (429, 500, 502, 503, 504) else 502
        raise HTTPException(status_code=status, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Cover letter generation failed: {e}")

    return {
        "profile_id": req.profile_id,
        "job_id": req.job_id,
        "cover_letter": letter,
    }


@router.post("/tailored-resume")
def tailored_resume_endpoint(req: GenerateRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = get_profile_or_404(req.profile_id, user.id, db)
    job = db.query(Job).filter(Job.id == req.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    try:
        resume_data = generate_tailored_resume(profile_to_dict(profile), job_to_dict(job))
    except MistralError as e:
        status = e.status_code if e.status_code in (429, 500, 502, 503, 504) else 502
        raise HTTPException(status_code=status, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Tailored resume generation failed: {e}")

    ats_resume_data = resume_data.get("ats_resume_data") or resume_data

    return {
        "profile_id": req.profile_id,
        "job_id": req.job_id,
        "ats_resume_data": ats_resume_data,
    }