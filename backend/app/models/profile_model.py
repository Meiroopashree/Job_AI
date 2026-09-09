from sqlalchemy import Column, Integer, String, JSON, ForeignKey, DateTime
from sqlalchemy.sql import func
from app.db.database import Base


class Profile(Base):
    __tablename__ = "profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    file_name = Column(String, nullable=True)

    personal_info = Column(JSON)
    links = Column(JSON)
    profile_summary = Column(JSON)

    skills = Column(JSON)
    languages = Column(JSON)

    certifications = Column(JSON)
    achievements = Column(JSON)

    experience = Column(JSON)
    education = Column(JSON)
    courses = Column(JSON)

    years_of_experience = Column(Integer)
    experience_summary = Column(JSON)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
