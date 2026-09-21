import re

from sqlalchemy import and_, func, or_
from app.models.job_model import Job
from app.services.location_classifier import detect_country_codes


def _normalize_title(title: str) -> str:
    base = re.sub(r"\([^)]*\)", "", title or "")
    base = re.sub(r"[^a-z0-9 ]", " ", base.lower())
    return " ".join(base.split())


def _company_key(company: str) -> str:
    return re.sub(r"[^a-z0-9 ]", " ", (company or "").lower()).strip()


def find_near_duplicate(db, job_data: dict) -> Job | None:
    """Return an existing job that is near-identical (same company + similar title)."""
    title = job_data.get("title") or ""
    company = _company_key(job_data.get("company"))
    norm = _normalize_title(title)
    if not norm or len(norm) < 6:
        return None
    candidates = (
        db.query(Job)
        .filter(Job.company.isnot(None))
        .filter(or_(Job.duplicate_of.is_(None), Job.id == Job.duplicate_of))
        .order_by(Job.id.desc())
        .limit(200)
        .all()
    )
    for job in candidates:
        if _company_key(job.company) != company:
            continue
        other = _normalize_title(job.title or "")
        if not other:
            continue
        if other == norm or norm in other or other in norm:
            return job
    return None


def flag_near_duplicates(db) -> int:
    """Mark near-identical postings (same company + title) as duplicates.

    The richest job in each group (description + skills + salary) is kept as the
    canonical row; the rest get `duplicate_of` pointing at it. Listings then
    exclude rows flagged this way.
    """
    jobs = db.query(Job).order_by(Job.id.asc()).all()
    groups = {}
    for job in jobs:
        norm = _normalize_title(job.title or "")
        company = _company_key(job.company)
        if not norm or len(norm) < 6 or not company:
            continue
        groups.setdefault((company, norm), []).append(job)

    flagged = 0
    for members in groups.values():
        if len(members) < 2:
            continue
        canon = max(
            members,
            key=lambda x: (
                2 if x.description else (1 if x.skills else 0),
                x.salary_min is not None,
                1 if x.is_remote else 0,
                -x.id,
            ),
        )
        for job in members:
            if job.id == canon.id:
                continue
            if not job.duplicate_of:
                job.duplicate_of = canon.id
                flagged += 1
    db.commit()
    return flagged


def _classify_location(location: str) -> dict:
    text = re.sub(r"[^a-z0-9 ]", " ", (location or "").lower())
    codes = detect_country_codes(location)
    is_remote = bool("remote" in text or ("work from home" in text) or "anywhere" in text)
    return {
        "country": ",".join(sorted(codes)) if codes else None,
        "is_remote": is_remote,
    }


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

    near = find_near_duplicate(db, job_data)
    if near:
        return near

    loc = _classify_location(job_data.get("location"))
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
        country=loc["country"],
        is_remote=loc["is_remote"],
    )

    db.add(job)
    db.commit()
    db.refresh(job)

    return job