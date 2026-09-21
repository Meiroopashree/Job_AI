from sqlalchemy import text

from app.db.database import Base, engine
from app.models.profile_model import Profile
from app.models.job_model import Job
from app.models.user_model import User
from app.models.ats_model import ATSResult
from app.models.application_model import Application
from app.models.alert_log_model import AlertLog
from app.models.job_pref_model import JobBookmark, JobExclusion
from app.models.scrape_job_model import ScrapeJob


def _ensure_column(table: str, column: str, ddl: str):
    with engine.connect() as conn:
        exists = conn.execute(
            text(
                "SELECT 1 FROM information_schema.columns "
                "WHERE table_name = :t AND column_name = :c"
            ),
            {"t": table, "c": column},
        ).first()
        if not exists:
            conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {ddl}"))
            conn.commit()
            print(f"Migrated: added {table}.{column}")


def _migrate_job_columns():
    _ensure_column("jobs", "salary_min", "salary_min DOUBLE PRECISION")
    _ensure_column("jobs", "salary_max", "salary_max DOUBLE PRECISION")
    _ensure_column("jobs", "salary_interval", "salary_interval VARCHAR")
    _ensure_column("jobs", "salary_currency", "salary_currency VARCHAR")
    _ensure_column("jobs", "date_posted", "date_posted VARCHAR")
    _ensure_column("jobs", "source", "source VARCHAR")
    _ensure_column("jobs", "country", "country VARCHAR")
    _ensure_column("jobs", "is_remote", "is_remote BOOLEAN NOT NULL DEFAULT FALSE")
    _ensure_column("jobs", "duplicate_of", "duplicate_of INTEGER")
    _ensure_column("jobs", "embedding", "embedding JSON")


def init_db():
    Base.metadata.create_all(bind=engine)
    _migrate_job_columns()
    print("Database created successfully")


if __name__ == "__main__":
    init_db()