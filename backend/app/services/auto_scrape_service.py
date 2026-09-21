import os
import threading
from datetime import datetime, timezone

from app.db.database import SessionLocal
from app.models.alert_log_model import AlertLog
from app.models.job_model import Job
from app.models.profile_model import Profile
from app.models.user_model import User
from app.services.email_notifier import is_configured, send_email
from app.services.matching_service import match_profile_to_jobs
from app.services.profile_scrape_service import scrape_for_profile

FRONTEND_URL = os.getenv("FRONTEND_URL", "https://job-ai-frontend-beryl.vercel.app")

_run_lock = threading.Lock()

_status = {
    "enabled": None,
    "interval_hours": None,
    "running": False,
    "last_run": None,
    "last_status": None,
    "last_counts": {},
    "errors": [],
    "alerts": None,
    "current_step": None,
    "updated_at": None,
}


def _set_step(step):
    _status["current_step"] = step
    _status["updated_at"] = datetime.now(timezone.utc).isoformat()


def is_enabled() -> bool:
    return os.getenv("AUTO_SCRAPE_ENABLED", "true").lower() in ("1", "true", "yes")


def interval_hours() -> int:
    return max(1, int(os.getenv("AUTO_SCRAPE_INTERVAL_HOURS", "12")))


def _refresh_static_status():
    _status["enabled"] = is_enabled()
    _status["interval_hours"] = interval_hours()


def get_status() -> dict:
    _refresh_static_status()
    return {**_status, "alerts_enabled": is_configured()}


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
        "is_remote": bool(job.is_remote),
    }


def _dedupe_lines(lines: list) -> list:
    seen = set()
    out = []
    for ln in lines:
        key = f"{(ln.get('title') or '').lower().strip()}|{(ln.get('company') or '').lower().strip()}"
        if key in seen:
            continue
        seen.add(key)
        out.append(ln)
    return out


def _max_alert_jobs() -> int:
    return max(1, int(os.getenv("ALERT_MAX_JOBS", "8")))


def _do_auto_scrape() -> dict:
    db = SessionLocal()
    new_ids = []
    counts = {"terms": 0, "scraped": 0, "added": 0, "linkedin": 0, "indeed": 0}
    errors = []
    alerts = {"configured": is_configured(), "recipients": 0, "emails_sent": 0, "matches": 0}

    try:
        profiles = db.query(Profile).all()
        for profile in profiles:
            try:
                ids, c, errs = scrape_for_profile(db, profile)
                new_ids.extend(ids)
                for k in counts:
                    counts[k] += c.get(k, 0)
                errors.extend(errs)
            except Exception as e:
                errors.append(f"profile {profile.id}: {str(e)[:200]}")

        counts["added"] = len(new_ids)

        if new_ids:
            _set_step("Checking matches for new jobs...")
            alerts = send_new_match_digests(db, new_ids)
    finally:
        db.close()

    return {
        "counts": counts,
        "errors": errors,
        "alerts": alerts,
    }


def send_new_match_digests(db, new_job_ids: list) -> dict:
    result = {"configured": is_configured(), "recipients": 0, "emails_sent": 0, "matches": 0}
    if not new_job_ids or not is_configured():
        return result

    jobs = db.query(Job).filter(Job.id.in_(new_job_ids)).all()
    if not jobs:
        return result

    job_dicts = [_job_dict(j) for j in jobs]
    job_by_id = {j.id: j for j in jobs}

    digests = {}
    for profile in db.query(Profile).order_by(Profile.id).all():
        already = set(
            row[0]
            for row in db.query(AlertLog.job_id)
            .filter(AlertLog.profile_id == profile.id)
            .all()
        )
        candidates = [jd for jd in job_dicts if jd["id"] not in already]
        if not candidates:
            continue

        profile_data = {
            "skills": profile.skills or [],
            "experience": profile.experience,
            "education": profile.education,
            "years_of_experience": profile.years_of_experience,
            "profile_summary": profile.profile_summary or "",
            "location": (profile.personal_info or {}).get("location") if isinstance(profile.personal_info, dict) else None,
        }

        try:
            matched = match_profile_to_jobs(profile_data, candidates, page=1, limit=5)
        except Exception as e:
            print(f"[alerts] match failed for profile {profile.id}: {e}")
            continue

        for item in matched.get("results", []):
            jid = item["job"]["id"]
            if jid in already or not job_by_id.get(jid):
                continue
            user = db.query(User).filter(User.id == profile.user_id).first()
            if not user or not user.email:
                continue

            line = {
                "profile_id": profile.id,
                "job_id": jid,
                "title": item["job"]["title"],
                "company": item["job"]["company"],
                "match": item["match_percentage"],
                "matched_skills": item.get("matched_skills") or [],
            }
            digests.setdefault(user.id, {"email": user.email, "lines": []})
            digests[user.id]["lines"].append(line)

    for user_id, payload in digests.items():
        lines = _dedupe_lines(payload["lines"])[:_max_alert_jobs()]
        if not lines:
            continue
        _set_step(f"Sending alert email to {payload['email']}...")
        subject = f"JobAI — {len(lines)} new job match{'es' if len(lines) != 1 else ''} for you"
        body_lines = [
            "We found new jobs matching your profile:\n",
        ]
        for ln in lines[:8]:
            salary = ""
            job = job_by_id.get(ln["job_id"])
            if job and job.salary_min:
                salary = f" ({job.salary_min:g}-{job.salary_max:g})" if job.salary_max else f" ({job.salary_min:g})"
            body_lines.append(
                f"- {ln['title']} at {ln['company']} — {ln['match']}% match{salary}"
            )
            if ln.get("matched_skills"):
                body_lines.append(
                    f"  Skills you have: {', '.join(ln['matched_skills'][:6])}"
                )
            body_lines.append(
                f"  {FRONTEND_URL}/jobs/job/{ln['job_id']}"
            )
        body_lines.append(
            f"\nView all matches: {FRONTEND_URL}/applications"
        )
        body_lines.append("\n— JobAI automatic job alerts")

        if not send_email(payload["email"], subject, "\n".join(body_lines)):
            continue

        result["emails_sent"] += 1
        result["recipients"] += 1
        result["matches"] += len(lines)

        for ln in lines:
            db.add(
                AlertLog(
                    user_id=user_id,
                    profile_id=ln["profile_id"],
                    job_id=ln["job_id"],
                )
            )
    db.commit()

    return result


def run_auto_scrape() -> dict:
    if not _run_lock.acquire(blocking=False):
        return {"started": False, "reason": "another run is in progress"}

    try:
        _refresh_static_status()
        _status["running"] = True
        _status["errors"] = []
        _set_step("Starting auto-scrape...")
        result = _do_auto_scrape()
        _status["running"] = False
        _status["last_run"] = datetime.now(timezone.utc).isoformat()
        _status["last_status"] = "success" if not result.get("errors") else "partial"
        _status["last_counts"] = result.get("counts", {})
        _status["errors"] = result.get("errors", [])[:10]
        _status["alerts"] = result.get("alerts")
        _status["current_step"] = None
        _status["updated_at"] = datetime.now(timezone.utc).isoformat()
        result["status"] = _status["last_status"]
        return result
    except Exception as e:
        _status["running"] = False
        _status["last_status"] = f"failed: {e}"
        _status["current_step"] = None
        _status["updated_at"] = datetime.now(timezone.utc).isoformat()
        print(f"[auto-scrape] error: {e}")
        return {"started": False, "reason": str(e)}
    finally:
        _status["running"] = False
        _run_lock.release()


def trigger_auto_scrape() -> dict:
    if _status["running"]:
        return {"started": False, "reason": "already running"}

    def _go():
        try:
            run_auto_scrape()
        except Exception as e:
            _status["running"] = False
            _status["last_status"] = f"failed: {e}"
            print(f"[auto-scrape] thread error: {e}")

    threading.Thread(target=_go, daemon=True).start()
    return {"started": True}