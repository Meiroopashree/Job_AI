from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.models.alert_log_model import AlertLog
from app.models.job_model import Job
from app.models.profile_model import Profile
from app.models.user_model import User
from app.auth.jwt_handler import get_current_user
from app.services.email_notifier import is_configured, send_email, send_email_with_error
from app.services.matching_service import match_profile_to_jobs

router = APIRouter(prefix="/alerts", tags=["Alerts"])

FRONTEND_URL = "https://job-ai-frontend-beryl.vercel.app"


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _job_dict(job: Job) -> dict:
    return {
        "id": job.id,
        "title": job.title,
        "company": job.company,
        "location": job.location,
        "description": job.description or "",
        "skills": job.skills or [],
        "apply_url": job.apply_url or "",
        "salary_min": job.salary_min,
        "salary_max": job.salary_max,
        "salary_interval": job.salary_interval,
        "salary_currency": job.salary_currency,
        "date_posted": job.date_posted,
        "source": job.source,
    }


def _profile_data(profile: Profile) -> dict:
    return {
        "skills": profile.skills or [],
        "experience": profile.experience,
        "education": profile.education,
        "years_of_experience": profile.years_of_experience,
        "profile_summary": (profile.profile_summary or "") if isinstance(profile.profile_summary, str) else "",
        "location": (profile.personal_info or {}).get("location") if isinstance(profile.personal_info, dict) else None,
    }


@router.get("/status")
def alert_status(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return {"configured": is_configured(), "email": user.email}


@router.post("/test")
def send_test_alert(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not is_configured():
        raise HTTPException(
            status_code=400,
            detail="Email alerts are not configured yet (email env vars missing on the server)",
        )

    ok, error = send_email_with_error(
        user.email,
        "JobAI - test alert",
        "This is a test email from JobAI. Your email job alerts are connected and working.\n\n- JobAI",
    )
    if not ok:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to send the test email: {error or 'unknown error'}",
        )
    return {"message": "Test email sent", "email": user.email}


@router.post("/send-now")
def send_alerts_now(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not is_configured():
        raise HTTPException(
            status_code=400,
            detail="Email alerts are not configured yet (email env vars missing on the server)",
        )

    profile = (
        db.query(Profile)
        .filter(Profile.user_id == user.id)
        .order_by(Profile.id.desc())
        .first()
    )
    if not profile:
        return {"message": "Upload a resume first so we have skills to match on", "sent": 0, "matches": 0}

    already = set(
        row[0]
        for row in db.query(AlertLog.job_id)
        .filter(AlertLog.profile_id == profile.id)
        .all()
    )
    cutoff = datetime.now(timezone.utc) - timedelta(days=7)
    jobs = (
        db.query(Job)
        .filter(Job.created_at >= cutoff)
        .order_by(Job.created_at.desc())
        .limit(200)
        .all()
    )
    candidates = [_job_dict(j) for j in jobs if j.id not in already]
    if not candidates:
        return {"message": "No new jobs to alert on yet", "sent": 0, "matches": 0}

    matched = match_profile_to_jobs(_profile_data(profile), candidates, page=1, limit=8)

    job_by_id = {j.id: j for j in jobs}
    lines = []
    sent_ids = []
    for item in matched.get("results", []):
        jid = item["job"]["id"]
        job = job_by_id.get(jid)
        if not job:
            continue
        salary = ""
        if job.salary_min:
            salary = f" ({job.salary_min:g}-{job.salary_max:g})" if job.salary_max else f" ({job.salary_min:g})"
        lines.append(
            f"- {item['job']['title']} at {item['job']['company']} - {item['match_percentage']}% match{salary}"
        )
        lines.append(f"  {FRONTEND_URL}/jobs/job/{jid}")
        sent_ids.append(jid)

    if not lines:
        return {"message": "No new matches to alert on yet", "sent": 0, "matches": 0}

    subject = f"JobAI - {len(lines)} new job match{'es' if len(lines) != 1 else ''} for you"
    body = "We found jobs matching your profile:\n\n" + "\n".join(lines) + "\n\n- JobAI automatic job alerts"

    ok, error = send_email_with_error(user.email, subject, body)
    if not ok:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to send the digest email: {error or 'unknown error'}",
        )

    for jid in sent_ids:
        db.add(AlertLog(user_id=user.id, profile_id=profile.id, job_id=jid))
    db.commit()

    return {"message": "Digest sent", "sent": 1, "matches": len(lines)}