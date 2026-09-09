from sqlalchemy import Column, Integer, JSON, ForeignKey, DateTime, Float, Text
from sqlalchemy.sql import func
from app.db.database import Base


class ATSResult(Base):
    __tablename__ = "ats_results"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("profiles.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    score = Column(Float)
    breakdown = Column(JSON)
    explanation = Column(JSON)
    suggestions = Column(JSON)

    ats_resume_data = Column(JSON, nullable=True)
    ats_resume_score = Column(Float, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
