from sqlalchemy import Column, Integer, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from app.db.database import Base


class AlertLog(Base):
    __tablename__ = "alert_logs"
    __table_args__ = (
        UniqueConstraint("profile_id", "job_id", name="uq_profile_job_alert"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    profile_id = Column(Integer, ForeignKey("profiles.id"), index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), index=True)
    sent_at = Column(DateTime(timezone=True), server_default=func.now())