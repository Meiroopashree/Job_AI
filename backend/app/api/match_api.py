from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

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
):
    db: Session = SessionLocal()
    try:
        profile = db.query(Profile).filter(
            Profile.id == profile_id,
            Profile.user_id == user.id,
        ).first()

        if not profile:
            return {"error": "Profile not found"}

        jobs = db.query(Job).all()

        profile_data = {
            "skills": profile.skills or [],
            "experience": profile.experience,
            "years_of_experience": profile.years_of_experience,
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
            }
            for job in jobs
        ]

        return match_profile_to_jobs(profile_data, job_list, page, limit)
    except Exception as e:
        print(f"Match error: {e}")
        return {"error": f"Matching failed: {str(e)}", "results": [], "total_jobs": 0, "total_pages": 0}
    finally:
        db.close()
