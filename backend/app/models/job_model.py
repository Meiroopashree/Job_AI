from sqlalchemy import Column, Integer, String, JSON, DateTime
from sqlalchemy.sql import func
from app.db.database import Base


class Job(Base):

    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)

    title = Column(String)
    company = Column(String)
    location = Column(String)
    description = Column(String)

    skills = Column(JSON)   # MUST be JSON
    apply_url = Column(String)

    created_at = Column(DateTime(timezone=True), server_default=func.now())