from sqlalchemy import Column, Integer, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from app.db.database import Base


class JobBookmark(Base):
    __tablename__ = "job_bookmarks"
    __table_args__ = (
        UniqueConstraint("user_id", "job_id", name="uq_user_job_bookmark"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class JobExclusion(Base):
    __tablename__ = "job_exclusions"
    __table_args__ = (
        UniqueConstraint("user_id", "job_id", name="uq_user_job_exclusion"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())