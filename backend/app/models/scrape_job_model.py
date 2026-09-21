from sqlalchemy import Column, Integer, String, JSON, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.db.database import Base


class ScrapeJob(Base):
    __tablename__ = "scrape_jobs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    profile_id = Column(Integer, ForeignKey("profiles.id"), index=True)
    status = Column(String, default="queued")  # queued | running | done | failed
    error = Column(String, nullable=True)
    counts = Column(JSON, nullable=True)
    errors = Column(JSON, nullable=True)
    added_count = Column(Integer, default=0)
    result = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    started_at = Column(DateTime(timezone=True), nullable=True)
    finished_at = Column(DateTime(timezone=True), nullable=True)