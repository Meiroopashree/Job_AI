from app.db.database import Base, engine
from app.models.profile_model import Profile
from app.models.job_model import Job
from app.models.user_model import User
from app.models.ats_model import ATSResult


def init_db():
    Base.metadata.create_all(bind=engine)
    print("Database created successfully")


if __name__ == "__main__":
    init_db()
