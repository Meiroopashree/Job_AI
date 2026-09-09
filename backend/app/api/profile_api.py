from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.models.profile_model import Profile
from app.models.user_model import User
from app.auth.jwt_handler import get_current_user

router = APIRouter(prefix="/upload-resume", tags=["Profile"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def serialize_profile(p: Profile):
    return {
        "id": p.id,
        "file_name": p.file_name,
        "skills": p.skills,
        "years_of_experience": p.years_of_experience,
        "experience_summary": p.experience_summary,
        "created_at": str(p.created_at) if p.created_at else None,
    }


@router.get("/list")
def list_profiles(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profiles = db.query(Profile).filter(Profile.user_id == user.id).order_by(Profile.id.desc()).all()
    return [serialize_profile(p) for p in profiles]


@router.get("/{profile_id}")
def get_profile(profile_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(Profile).filter(Profile.id == profile_id, Profile.user_id == user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return {
        "id": profile.id,
        "file_name": profile.file_name,
        "personal_info": profile.personal_info,
        "links": profile.links,
        "profile_summary": profile.profile_summary,
        "skills": profile.skills,
        "languages": profile.languages,
        "certifications": profile.certifications,
        "achievements": profile.achievements,
        "experience": profile.experience,
        "education": profile.education,
        "courses": profile.courses,
        "years_of_experience": profile.years_of_experience,
        "experience_summary": profile.experience_summary,
    }


class UpdateProfileRequest(BaseModel):
    personal_info: Optional[dict] = None
    links: Optional[dict] = None
    profile_summary: Optional[dict] = None
    skills: Optional[list] = None
    languages: Optional[list] = None
    certifications: Optional[list] = None
    achievements: Optional[list] = None
    experience: Optional[list] = None
    education: Optional[list] = None
    courses: Optional[list] = None


@router.put("/{profile_id}")
def update_profile(
    profile_id: int,
    req: UpdateProfileRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(Profile).filter(Profile.id == profile_id, Profile.user_id == user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    update_data = req.model_dump(exclude_none=True)
    for key, value in update_data.items():
        setattr(profile, key, value)

    db.commit()
    db.refresh(profile)
    return {"message": "Profile updated successfully", "profile_id": profile.id}


@router.delete("/{profile_id}")
def delete_profile(
    profile_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(Profile).filter(Profile.id == profile_id, Profile.user_id == user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    db.delete(profile)
    db.commit()
    return {"message": "Profile deleted successfully"}
