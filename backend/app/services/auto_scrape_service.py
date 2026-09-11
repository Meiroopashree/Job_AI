import os
import threading
from datetime import datetime, timezone

from app.db.database import SessionLocal
from app.models.alert_log_model import AlertLog
from app.models.job_model import Job
from app.models.profile_model import Profile
from app.models.user_model import User
from app.services.email_notifier import is_configured, send_email
from app.services.job_normalizer import normalize_job
from app.services.job_service import save_job
from app.services.matching_service import match_profile_to_jobs

from app.scraper.linkedin_scraper import scrape_linkedin_jobs
from app.scraper.indeed_scraper import scrape_indeed_jobs

FRONTEND_URL = os.getenv("FRONTEND_URL", "https://job-ai-frontend-beryl.vercel.app")

_GENERIC_SKILLS = {
    "communication", "leadership", "teamwork", "team player", "collaboration",
    "problem solving", "problem-solving", "english", "time management",
    "attention to detail", "adaptability", "critical thinking", "analytical",
    "project management", "microsoft office", "organization", "presentation",
}

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
}


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


def derive_search_terms(profiles) -> list:
    terms = []
    seen = set()
    for profile in profiles:
        for skill in (profile.skills or []):
            s = str(skill).strip().lower()
            if len(s) < 3 or s in seen or s in _GENERIC_SKILLS:
                continue
            seen.add(s)
            terms.append(s)
    if not terms:
        return ["software engineer"]
    return terms[: max(1, int(os.getenv("AUTO_SCRAPE_MAX_TERMS", "5")))]


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


def _scrape_platform(platform, term, country):
    per_term = max(1, min(int(os.getenv("AUTO_SCRAPE_PER_TERM", "10")), 50))
    if platform == "linkedin":
        return scrape_linkedin_jobs(
            search_term=term,
            location="",
            results_wanted=per_term,
            full_description=True,
        )
    return scrape_indeed_jobs(
        search_term=term,
        location="",
        country=country,
        results_wanted=per_term,
        full_description=True,
    )


def _do_auto_scrape() -> dict:
    db = SessionLocal()
    new_ids = []
    counts = {"terms": 0, "scraped": 0, "added": 0, "linkedin": 0, "indeed": 0}
    errors = []
    alerts = {"configured": is_configured(), "recipients": 0, "emails_sent": 0, "matches": 0}

    try:
        profiles = db.query(Profile).all()
        terms = derive_search_terms(profiles)
        counts["terms"] = len(terms)
        country = os.getenv("AUTO_SCRAPE_COUNTRY", "USA")

        existing_ids = set(row[0] for row in db.query(Job.id).all())

        for term in terms:
            for platform, fn_name in (("linkedin", "linkedin"), ("indeed", "indeed")):
                try:
                    raw_jobs = _scrape_platform(platform, term, country)
                except Exception as e:
                    errors.append(f"{platform}:{term}: {str(e)[:200]}")
                    continue

                counts[platform] += len(raw_jobs)
                for raw in raw_jobs:
                    try:
                        normalized = normalize_job(raw)
                        saved = save_job(db, normalized)
                        counts["scraped"] += 1
                        if saved.id not in existing_ids:
                            existing_ids.add(saved.id)
                            new_ids.append(saved.id)
                    except Exception as e:
                        errors.append(f"save failed ({platform}:{term}): {str(e)[:200]}")

        counts["added"] = len(new_ids)

        if new_ids:
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
            }
            digests.setdefault(user.id, {"email": user.email, "lines": []})
            digests[user.id]["lines"].append(line)

    for user_id, payload in digests.items():
        lines = payload["lines"]
        if not lines:
            continue
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
        result = _do_auto_scrape()
        _status["running"] = False
        _status["last_run"] = datetime.now(timezone.utc).isoformat()
        _status["last_status"] = "success" if not result.get("errors") else "partial"
        _status["last_counts"] = result.get("counts", {})
        _status["errors"] = result.get("errors", [])[:10]
        _status["alerts"] = result.get("alerts")
        result["status"] = _status["last_status"]
        return result
    except Exception as e:
        _status["running"] = False
        _status["last_status"] = f"failed: {e}"
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