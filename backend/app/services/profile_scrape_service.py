from app.models.job_model import Job
from app.services.job_normalizer import normalize_job
from app.services.job_service import save_job
from app.services.location_classifier import infer_profile_country
from app.scraper.linkedin_scraper import scrape_linkedin_jobs
from app.scraper.indeed_scraper import scrape_indeed_jobs

_COUNTRY_NAMES = {
    "us": "USA",
    "uk": "UK",
    "ireland": "Ireland",
    "canada": "Canada",
    "australia": "Australia",
    "singapore": "Singapore",
    "mexico": "Mexico",
    "germany": "Germany",
    "france": "France",
    "netherlands": "Netherlands",
    "spain": "Spain",
    "japan": "Japan",
    "uae": "United Arab Emirates",
    "in": "India",
    "luxembourg": "Luxembourg",
    "switzerland": "Switzerland",
    "saudi-arabia": "Saudi Arabia",
    "qatar": "Qatar",
    "kuwait": "Kuwait",
    "hong-kong": "Hong Kong",
    "new-zealand": "New Zealand",
}

_GENERIC_SKILLS = {
    "communication", "leadership", "teamwork", "team player", "collaboration",
    "problem solving", "problem-solving", "english", "time management",
    "attention to detail", "adaptability", "critical thinking", "analytical",
    "project management", "microsoft office", "organization", "presentation",
}


def _location(profile) -> str:
    personal = profile.personal_info if isinstance(profile.personal_info, dict) else {}
    return str(personal.get("location") or "").strip()


def profile_country_name(profile) -> str:
    code = infer_profile_country(_location(profile))
    return _COUNTRY_NAMES.get(code, "USA") if code else "USA"


def profile_location_hint(profile) -> str:
    location = _location(profile)
    if not location:
        return ""
    hint = location.split(",")[0].strip()
    return hint[:60] if hint else ""


def derive_profile_terms(profile, max_terms: int = 4) -> list:
    terms = []
    seen = set()
    for skill in (profile.skills or []):
        s = str(skill).strip().lower()
        if len(s) < 3 or s in seen or s in _GENERIC_SKILLS:
            continue
        seen.add(s)
        terms.append(s)
    if not terms:
        title = ""
        for exp in (profile.experience or []):
            t = str(exp.get("title") or "").strip()
            if t:
                title = t
                break
        return [title or "software engineer"]
    return terms[: max(1, max_terms)]


def scrape_for_profile(db, profile, per_term: int = 10, max_terms: int = 4) -> tuple:
    """Scrape LinkedIn + Indeed using one resume's skills and location.

    Returns (new_job_ids, counts, errors). Deduplicates against jobs already
    stored in the database.
    """
    terms = derive_profile_terms(profile, max_terms=max_terms)
    country = profile_country_name(profile)
    location_hint = profile_location_hint(profile)

    counts = {"terms": len(terms), "scraped": 0, "added": 0, "linkedin": 0, "indeed": 0}
    errors = []
    new_ids = []
    if not terms:
        return new_ids, counts, errors

    existing_ids = set(row[0] for row in db.query(Job.id).all())

    for term in terms:
        for platform in ("linkedin", "indeed"):
            try:
                if platform == "linkedin":
                    raw = scrape_linkedin_jobs(
                        search_term=term,
                        location=location_hint,
                        results_wanted=per_term,
                        full_description=True,
                    )
                else:
                    raw = scrape_indeed_jobs(
                        search_term=term,
                        location="",
                        country=country,
                        results_wanted=per_term,
                        full_description=True,
                    )
            except Exception as e:
                errors.append(f"{platform}:{term}: {str(e)[:200]}")
                continue

            counts[platform] += len(raw)
            for r in raw:
                try:
                    normalized = normalize_job(r)
                    saved = save_job(db, normalized)
                    counts["scraped"] += 1
                    if saved.id not in existing_ids:
                        existing_ids.add(saved.id)
                        new_ids.append(saved.id)
                except Exception as e:
                    errors.append(f"save({platform}:{term}): {str(e)[:200]}")

    counts["added"] = len(new_ids)
    return new_ids, counts, errors