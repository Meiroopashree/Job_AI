from sqlalchemy import and_, func
from app.models.job_model import Job


def deduplicate_jobs(db):
    subq = db.query(
        Job.title,
        Job.company,
        Job.location,
        Job.description,
        Job.apply_url,
    ).group_by(
        Job.title,
        Job.company,
        Job.location,
        Job.description,
        Job.apply_url,
    ).having(
        func.count(Job.id) > 1
    ).subquery()

    duplicates = db.query(Job).filter(
        and_(
            Job.title == subq.c.title,
            Job.company == subq.c.company,
            Job.location == subq.c.location,
            Job.description == subq.c.description,
            Job.apply_url == subq.c.apply_url,
        )
    ).order_by(Job.id).all()

    grouped = {}
    for job in duplicates:
        key = (job.title, job.company, job.location, job.description, job.apply_url)
        grouped.setdefault(key, []).append(job)

    removed = 0
    for key, jobs in grouped.items():
        keep = jobs[0]
        for job in jobs[1:]:
            db.delete(job)
            removed += 1
    db.commit()
    return removed


def save_job(db, job_data):
    existing = db.query(Job).filter(and_(
        Job.title == job_data["title"],
        Job.company == job_data["company"],
        Job.location == job_data["location"],
        Job.description == job_data["description"],
        Job.apply_url == job_data["apply_url"],
    )).first()

    if existing:
        return existing

    job = Job(
        title=job_data["title"],
        company=job_data["company"],
        location=job_data["location"],
        description=job_data["description"],
        skills=job_data["skills"],
        apply_url=job_data["apply_url"],
        salary_min=job_data.get("salary_min"),
        salary_max=job_data.get("salary_max"),
        salary_interval=job_data.get("salary_interval"),
        salary_currency=job_data.get("salary_currency"),
        date_posted=job_data.get("date_posted"),
        source=job_data.get("source"),
    )

    db.add(job)
    db.commit()
    db.refresh(job)

    return job