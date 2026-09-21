from sqlalchemy import Column, Integer, String, Float, JSON, Boolean, DateTime
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

    salary_min = Column(Float, nullable=True)
    salary_max = Column(Float, nullable=True)
    salary_interval = Column(String, nullable=True)
    salary_currency = Column(String, nullable=True)
    date_posted = Column(String, nullable=True)
    source = Column(String, nullable=True)

    country = Column(String, nullable=True)
    is_remote = Column(Boolean, nullable=False, default=False)
    duplicate_of = Column(Integer, nullable=True, index=True)
    embedding = Column(JSON, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())