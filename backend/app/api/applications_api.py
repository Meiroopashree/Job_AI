from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.models.application_model import Application
from app.models.job_model import Job
from app.models.profile_model import Profile
from app.models.user_model import User
from app.auth.jwt_handler import get_current_user

router = APIRouter(prefix="/applications", tags=["Applications"])

VALID_STATUSES = {"saved", "applied", "interview", "offer", "rejected"}


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class CreateApplicationRequest(BaseModel):
    job_id: int
    profile_id: Optional[int] = None
    status: Optional[str] = "saved"
    notes: Optional[str] = ""


class UpdateApplicationRequest(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    profile_id: Optional[int] = None


def _serialize(db, app_: Application):
    job = db.query(Job).filter(Job.id == app_.job_id).first()
    return {
        "id": app_.id,
        "job_id": app_.job_id,
        "profile_id": app_.profile_id,
        "status": app_.status or "saved",
        "notes": app_.notes or "",
        "applied_at": str(app_.applied_at) if app_.applied_at else None,
        "created_at": str(app_.created_at) if app_.created_at else None,
        "updated_at": str(app_.updated_at) if app_.updated_at else None,
        "job": {
            "id": job.id,
            "title": job.title or "",
            "company": job.company or "",
            "location": job.location or "",
            "apply_url": job.apply_url or "",
            "source": job.source,
            "salary_min": job.salary_min,
            "salary_max": job.salary_max,
            "salary_interval": job.salary_interval,
            "salary_currency": job.salary_currency,
            "date_posted": job.date_posted,
            "created_at": str(job.created_at) if job.created_at else None,
        } if job else None,
    }


@router.post("")
def create_or_update_application(
    req: CreateApplicationRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if req.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {sorted(VALID_STATUSES)}")

    job = db.query(Job).filter(Job.id == req.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if req.profile_id:
        profile = db.query(Profile).filter(
            Profile.id == req.profile_id,
            Profile.user_id == user.id,
        ).first()
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")

    existing = db.query(Application).filter(
        Application.user_id == user.id,
        Application.job_id == req.job_id,
    ).first()

    if existing:
        existing.status = req.status or existing.status
        if req.profile_id is not None:
            existing.profile_id = req.profile_id
        db.commit()
        db.refresh(existing)
        return {"message": "Application updated", "application": _serialize(db, existing)}

    app_ = Application(
        user_id=user.id,
        job_id=req.job_id,
        profile_id=req.profile_id,
        status=req.status or "saved",
        notes=req.notes or "",
        applied_at=datetime.now(timezone.utc) if (req.status == "applied") else None,
    )
    db.add(app_)
    db.commit()
    db.refresh(app_)

    return {"message": "Application created", "application": _serialize(db, app_)}


@router.get("")
def list_applications(
    status: Optional[str] = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Application).filter(Application.user_id == user.id)
    if status:
        if status not in VALID_STATUSES:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {sorted(VALID_STATUSES)}")
        query = query.filter(Application.status == status)

    apps = query.order_by(Application.updated_at.desc()).all()

    grouped = {}
    for s in sorted(VALID_STATUSES):
        grouped[s] = len([a for a in apps if (a.status or "saved") == s])

    return {
        "applications": [_serialize(db, a) for a in apps],
        "counts": grouped,
    }


@router.get("/stats")
def application_stats(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    apps = db.query(Application).filter(Application.user_id == user.id).all()

    total = len(apps)
    counts = {s: 0 for s in sorted(VALID_STATUSES)}
    for a in apps:
        s = a.status or "saved"
        counts[s] = counts.get(s, 0) + 1

    saved = counts.get("saved", 0)
    applied = counts.get("applied", 0)
    interviews = counts.get("interview", 0)
    offers = counts.get("offer", 0)
    rejected = counts.get("rejected", 0)

    now = datetime.now(timezone.utc)

    def _pct(num: int, den: int) -> float:
        return round((num / den) * 100, 1) if den else 0.0

    conversions = {
        "saved_to_applied": _pct(applied, saved),
        "applied_to_interview": _pct(interviews, applied),
        "interview_to_offer": _pct(offers, interviews),
        "applied_to_offer": _pct(offers, applied),
    }

    job_ids = list({a.job_id for a in apps})
    jobs = db.query(Job).filter(Job.id.in_(job_ids)).all() if job_ids else []
    company_map = {}
    for job in jobs:
        name = (job.company or "").strip() or "Unknown"
        company_map[name] = company_map.get(name, 0) + 1
    top_companies = sorted(company_map.items(), key=lambda x: x[1], reverse=True)[:5]

    activity: dict[str, int] = {}
    for i in range(13, -1, -1):
        d = (now - timedelta(days=i)).date()
        activity[d.isoformat()] = 0
    for a in apps:
        if a.created_at:
            d = a.created_at.date() if hasattr(a.created_at, "date") else a.created_at
            key = d.isoformat()
            if key in activity:
                activity[key] = activity.get(key, 0) + 1

    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    return {
        "total": total,
        "counts": counts,
        "conversions": conversions,
        "this_week": sum(1 for a in apps if a.created_at and a.created_at >= week_ago),
        "this_month": sum(1 for a in apps if a.created_at and a.created_at >= month_ago),
        "top_companies": [{"company": n, "count": c} for n, c in top_companies],
        "activity": [{"date": k, "count": v} for k, v in sorted(activity.items())],
    }


@router.get("/job/{job_id}")
def get_application_for_job(
    job_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    app_ = db.query(Application).filter(
        Application.user_id == user.id,
        Application.job_id == job_id,
    ).first()
    if not app_:
        raise HTTPException(status_code=404, detail="No application found for this job")
    return _serialize(db, app_)


@router.patch("/{application_id}")
def update_application(
    application_id: int,
    req: UpdateApplicationRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    app_ = db.query(Application).filter(
        Application.id == application_id,
        Application.user_id == user.id,
    ).first()
    if not app_:
        raise HTTPException(status_code=404, detail="Application not found")

    if req.status is not None:
        if req.status not in VALID_STATUSES:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {sorted(VALID_STATUSES)}")
        app_.status = req.status
        if req.status == "applied" and not app_.applied_at:
            app_.applied_at = datetime.now(timezone.utc)

    if req.notes is not None:
        app_.notes = req.notes

    if req.profile_id is not None:
        profile = db.query(Profile).filter(
            Profile.id == req.profile_id,
            Profile.user_id == user.id,
        ).first()
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")
        app_.profile_id = req.profile_id

    db.commit()
    db.refresh(app_)
    return {"message": "Application updated", "application": _serialize(db, app_)}


@router.delete("/{application_id}")
def delete_application(
    application_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    app_ = db.query(Application).filter(
        Application.id == application_id,
        Application.user_id == user.id,
    ).first()
    if not app_:
        raise HTTPException(status_code=404, detail="Application not found")
    db.delete(app_)
    db.commit()
    return {"message": "Application removed"}