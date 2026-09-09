from sqlalchemy.orm import Session
from app.models.profile_model import Profile


def save_profile(db: Session, data: dict):
    profile = Profile(
        user_id=data.get("user_id"),
        file_name=data.get("file_name"),
        personal_info=data.get("personal_info"),
        links=data.get("links"),
        profile_summary=data.get("profile_summary"),
        skills=data.get("skills"),
        languages=data.get("languages"),
        certifications=data.get("certifications"),
        achievements=data.get("achievements"),
        experience=data.get("experience"),
        education=data.get("education"),
        courses=data.get("courses"),
        years_of_experience=data.get("years_of_experience"),
        experience_summary=data.get("experience_summary"),
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile
