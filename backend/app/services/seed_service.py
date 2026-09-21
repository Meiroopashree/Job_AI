from app.auth.jwt_handler import hash_password
from app.db.database import SessionLocal
from app.models.user_model import User
from app.models.profile_model import Profile

DEMO_EMAIL = "demo@jobai.app"
DEMO_PASSWORD = "demo1234"

_DEMO_PROFILES = [
    {
        "file_name": "Senior-Fullstack-Engineer.pdf",
        "location": "Austin, TX, USA",
        "name": "Priya Sharma",
        "years_of_experience": 8,
        "profile_summary": (
            "Senior full-stack engineer with 8 years building fast, reliable web platforms. "
            "Comfortable across the stack, from Python APIs to React frontends on AWS."
        ),
        "title": "Software Engineer",
        "skills": [
            "Python", "FastAPI", "Django", "React", "TypeScript", "Node.js",
            "PostgreSQL", "Redis", "Docker", "Kubernetes", "AWS", "REST APIs",
            "GraphQL", "CI/CD", "Microservices",
        ],
        "experience": [
            {"title": "Senior Software Engineer", "company": "TechNova", "years": "2020-2025",
             "points": ["Led migration to FastAPI microservices", "Cut p95 latency 40%", "Mentored 4 juniors"]},
            {"title": "Full Stack Engineer", "company": "CloudPeak", "years": "2016-2020",
             "points": ["Built React + Django platforms", "Shipped 15+ client features"]},
        ],
        "education": [{"degree": "B.S. Computer Science", "school": "University of Texas at Austin"}],
    },
    {
        "file_name": "Data-Scientist-Resume.pdf",
        "location": "Seattle, WA, USA",
        "name": "Arjun Mehta",
        "years_of_experience": 6,
        "profile_summary": (
            "Data scientist focused on turning messy data into product decisions. "
            "Experience with recommendation systems, forecasting, and experimentation."
        ),
        "title": "Data Scientist",
        "skills": [
            "Python", "Pandas", "NumPy", "Scikit-learn", "SQL", "Machine Learning",
            "Deep Learning", "TensorFlow", "PyTorch", "Statistics", "A/B Testing",
            "Feature Engineering", "Data Visualization", "Airflow", "Spark",
        ],
        "experience": [
            {"title": "Data Scientist", "company": "Insightly", "years": "2021-2025",
             "points": ["Built churn model improving retention 12%", "Designed 30+ A/B tests"]},
            {"title": "Data Analyst", "company": "RetailHub", "years": "2019-2021",
             "points": ["Automated reporting pipelines", "Forecasted demand for 200 SKUs"]},
        ],
        "education": [{"degree": "M.S. Data Science", "school": "University of Washington"}],
    },
    {
        "file_name": "Product-Manager-CV.pdf",
        "location": "New York, NY, USA",
        "name": "Sana Kapoor",
        "years_of_experience": 7,
        "profile_summary": (
            "Product manager who ships. Led cross-functional teams from zero-to-one launches "
            "to mature growth roadmaps at B2C companies."
        ),
        "title": "Product Manager",
        "skills": [
            "Product Strategy", "Roadmapping", "Agile", "Scrum", "Jira",
            "User Research", "Analytics", "SQL", "Wireframing", "Figma",
            "Stakeholder Management", "OKRs", "Go-to-market", "KPI Tracking",
        ],
        "experience": [
            {"title": "Senior Product Manager", "company": "Loop", "years": "2021-2025",
             "points": ["Grew core feature adoption 35%", "Led quarter zero-to-one launch"]},
            {"title": "Product Manager", "company": "Brightly", "years": "2018-2021",
             "points": ["Ran experiment framework used by 40 PMs"]},
        ],
        "education": [{"degree": "B.A. Economics", "school": "NYU Stern"}],
    },
]


def seed_demo() -> dict:
    """Create (once) a demo user and a set of realistic resumes so the product
    is explorable out of the box. Safe to call repeatedly."""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == DEMO_EMAIL).first()
        user_created = user is None
        if not user:
            user = User(email=DEMO_EMAIL, password_hash=hash_password(DEMO_PASSWORD))
            db.add(user)
            db.commit()
            db.refresh(user)

        added = 0
        for item in _DEMO_PROFILES:
            exists = (
                db.query(Profile)
                .filter(Profile.user_id == user.id, Profile.file_name == item["file_name"])
                .first()
            )
            if exists:
                continue
            db.add(Profile(
                user_id=user.id,
                file_name=item["file_name"],
                personal_info={
                    "name": item["name"],
                    "location": item["location"],
                },
                profile_summary=item["profile_summary"],
                skills=item["skills"],
                experience=item["experience"],
                education=item["education"],
                years_of_experience=item["years_of_experience"],
            ))
            added += 1
        db.commit()

        return {
            "email": user.email,
            "password": DEMO_PASSWORD,
            "user_created": user_created,
            "profiles_added": added,
        }
    finally:
        db.close()