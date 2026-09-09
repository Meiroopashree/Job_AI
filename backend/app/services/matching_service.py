from app.ai.embeddings import compute_similarities

from app.services.profile_vectorizer import build_profile_text
from app.services.job_vectorizer import build_job_text
from app.services.explanation_service import generate_match_explanation


def match_profile_to_jobs(profile, jobs, page=1, limit=10):
    profile_text = build_profile_text(profile)
    profile_skills = set(
        skill.lower().strip()
        for skill in (profile.get("skills") or [])
    )

    job_texts = [build_job_text(job) for job in jobs]
    similarities = compute_similarities(profile_text, job_texts)
    has_similarities = len(similarities) == len(jobs)

    results = []

    for idx, job in enumerate(jobs):
        job_skills = set(
            skill.lower().strip()
            for skill in (job.get("skills") or [])
        )

        matched_skills = profile_skills & job_skills

        if len(matched_skills) == 0:
            continue

        skill_overlap = len(matched_skills) / len(job_skills) if len(job_skills) > 0 else 0
        similarity = similarities[idx] if has_similarities else 0

        final_score_percent = round((0.3 * similarity + 0.7 * skill_overlap) * 100, 2)

        if final_score_percent < 60:
            continue

        explanation = generate_match_explanation(profile, job)

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