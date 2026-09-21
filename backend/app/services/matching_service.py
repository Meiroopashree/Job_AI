from app.ai.embeddings import compute_similarities

from app.services.profile_vectorizer import build_profile_text
from app.services.job_vectorizer import build_job_text
from app.services.job_normalizer import extract_skills
from app.services.explanation_service import generate_match_explanation
from app.services.location_classifier import (
    detect_country_codes,
    infer_profile_country,
    is_junk_location,
)

MIN_SKILL_MATCHES = 1
MIN_MATCH_PERCENT = 60.0


def _skills_match(profile_skill: str, job_skill: str) -> bool:
    """True if a profile skill and a job skill refer to the same capability."""
    p = profile_skill.lower().strip()
    j = job_skill.lower().strip()
    if not p or not j:
        return False
    if p == j:
        return True
    if p in j or j in p:
        return True
    common_prefix = 0
    for a, b in zip(p, j):
        if a != b:
            break
        common_prefix += 1
    shorter = min(len(p), len(j))
    return common_prefix >= 5 and common_prefix >= 0.6 * shorter


def _job_is_excluded(job: dict, excluded_ids: set) -> bool:
    if excluded_ids and job.get("id") in excluded_ids:
        return True
    return bool(job.get("duplicate_of"))


def match_profile_to_jobs(profile, jobs, page=1, limit=10, excluded_ids=None):
    excluded = set(excluded_ids or [])
    profile_text = build_profile_text(profile)
    profile_country = infer_profile_country(profile.get("location") or "")
    profile_skills = set(
        skill.lower().strip()
        for skill in (profile.get("skills") or [])
    )
    if not profile_skills:
        profile_skills = set(extract_skills(profile_text))

    scores = []
    similar = compute_similarities(
        profile_text,
        [build_job_text(job) for job in jobs],
        job_embeddings=[job.get("embedding") for job in jobs],
    )
    has_similarities = len(similar) == len(jobs)

    for idx, job in enumerate(jobs):
        if _job_is_excluded(job, excluded):
            continue

        job_location = job.get("location")
        if is_junk_location(job_location):
            continue

        # A remote job can be applied from anywhere, so skip the country filter
        # for remote postings even when the profile country is known.
        if not job.get("is_remote"):
            job_countries = detect_country_codes(job_location)
            if profile_country and job_countries and profile_country not in job_countries:
                continue

        job_text = build_job_text(job)

        job_skills = set(
            skill.lower().strip()
            for skill in (job.get("skills") or [])
        )
        if not job_skills:
            job_skills = set(extract_skills(job_text))

        matched_skills = set(
            js for js in job_skills
            if any(_skills_match(ps, js) for ps in profile_skills)
        )

        similarity = similar[idx] if has_similarities else 0

        if len(matched_skills) < MIN_SKILL_MATCHES:
            continue
        skill_coverage = len(matched_skills) / len(job_skills) if job_skills else 0
        final_score_percent = round((0.4 * similarity + 0.6 * skill_coverage) * 100, 2)

        if final_score_percent < MIN_MATCH_PERCENT:
            continue

        explanation = generate_match_explanation(
            profile, job, job_skills=job_skills, matched_skills=matched_skills
        )

        scores.append({
            "job": {
                "id": job.get("id"),
                "title": job.get("title"),
                "company": job.get("company"),
                "location": job.get("location"),
                "description": job.get("description"),
                "apply_url": job.get("apply_url"),
                "salary_min": job.get("salary_min"),
                "salary_max": job.get("salary_max"),
                "salary_interval": job.get("salary_interval"),
                "salary_currency": job.get("salary_currency"),
                "date_posted": job.get("date_posted"),
                "source": job.get("source"),
                "is_remote": bool(job.get("is_remote")),
            },
            "match_percentage": final_score_percent,
            "matched_skills": sorted(explanation.get("matched_skills") or []),
            "explanation": explanation,
        })

    scores.sort(key=lambda x: x["match_percentage"], reverse=True)

    total_jobs = len(scores)
    start = (page - 1) * limit
    end = start + limit

    return {
        "page": page,
        "limit": limit,
        "total_jobs": total_jobs,
        "total_pages": (total_jobs + limit - 1) // limit,
        "results": scores[start:end],
    }