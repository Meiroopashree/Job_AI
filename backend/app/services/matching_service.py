from app.ai.embeddings import compute_similarities

from app.services.profile_vectorizer import build_profile_text
from app.services.job_vectorizer import build_job_text
from app.services.job_normalizer import extract_skills
from app.services.explanation_service import generate_match_explanation


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


def match_profile_to_jobs(profile, jobs, page=1, limit=10):
    profile_text = build_profile_text(profile)
    profile_skills = set(
        skill.lower().strip()
        for skill in (profile.get("skills") or [])
    )
    if not profile_skills:
        profile_skills = set(extract_skills(profile_text))

    job_texts = [build_job_text(job) for job in jobs]
    similarities = compute_similarities(profile_text, job_texts)
    has_similarities = len(similarities) == len(jobs)

    results = []

    for idx, job in enumerate(jobs):
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

        similarity = similarities[idx] if has_similarities else 0

        if len(matched_skills) > 0 and job_skills:
            skill_coverage = len(matched_skills) / len(job_skills)
            final_score_percent = round((0.4 * similarity + 0.6 * skill_coverage) * 100, 2)
        else:
            final_score_percent = round(similarity * 35, 2)

        if final_score_percent < 60:
            continue

        explanation = generate_match_explanation(
            profile, job, job_skills=job_skills, matched_skills=matched_skills
        )

        results.append({
            "job": {
                "id": job.get("id"),
                "title": job.get("title"),
                "company": job.get("company"),
                "location": job.get("location"),
                "description": job.get("description"),
                "apply_url": job.get("apply_url")
            },
            "match_percentage": final_score_percent,
            "explanation": explanation
        })

    results.sort(key=lambda x: x["match_percentage"], reverse=True)

    total_jobs = len(results)
    start = (page - 1) * limit
    end = start + limit

    return {
        "page": page,
        "limit": limit,
        "total_jobs": total_jobs,
        "total_pages": (total_jobs + limit - 1) // limit,
        "results": results[start:end]
    }