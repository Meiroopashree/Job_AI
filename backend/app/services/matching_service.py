import re
from app.ai.embeddings import compute_similarities

from app.services.profile_vectorizer import build_profile_text
from app.services.job_vectorizer import build_job_text
from app.services.job_normalizer import extract_skills
from app.services.explanation_service import generate_match_explanation

ACCOUNTING_DOMAIN_WORDS = {
    "accounting", "accountant", "accounts", "finance", "financial",
    "gst", "tally", "payroll", "billing", "invoicing", "reconcil",
    "ledger", "audit", "auditing", "tax", "bookkeeping", "receivable",
    "payable", "ifrs", "gaap",
    "quickbooks", "xero",
    "profit and loss", "revenue recognition", "balance sheet",
    "cost accounting", "financial reporting", "financial analysis",
    "bank reconciliation", "accounts payable", "accounts receivable",
}

STOP_WORDS = {
    "a", "an", "the", "and", "or", "of", "in", "for", "to", "at", "on",
    "with", "by", "from", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "shall", "can", "need", "must", "not", "no",
    "but", "if", "so", "than", "that", "this", "it", "its", "as", "we",
    "our", "their", "your", "my", "me", "us", "them", "you", "he", "she",
    "they", "who", "which", "what", "where", "when", "how", "all", "each",
    "every", "both", "few", "more", "most", "other", "some", "such", "only",
    "very", "also", "just", "about", "above", "after", "before", "between",
    "into", "through", "during", "up", "down", "out", "off", "over", "under",
    "again", "further", "then", "once", "here", "there", "why", "am", "own",
    "same", "too", "any", "year", "years", "experience", "job", "role",
    "position", "company", "looking", "team", "work", "working", "new",
    "ability", "skills", "strong", "excellent", "knowledge", "plus",
    "good", "preferred", "required", "minimum", "detail", "effective",
    "abilities", "skill", "power", "office", "data", "management",
    "analysis", "reporting", "record", "records", "entry", "performance",
    "tracking", "maintaining", "precise", "proficient", "expertise",
    "assistant", "oriented", "proactive", "solid", "experienced",
}


def _build_domain_keywords(profile_skills, profile_text):
    """Build a set of domain-specific keywords from the profile."""
    return set(ACCOUNTING_DOMAIN_WORDS)


def _count_domain_matches(job_text, domain_keywords):
    """Count how many domain keywords from the profile appear in job text."""
    if not job_text or not domain_keywords:
        return 0
    text_lower = job_text.lower()
    return sum(1 for kw in domain_keywords if kw in text_lower)


def match_profile_to_jobs(profile, jobs, page=1, limit=10):
    profile_text = build_profile_text(profile)
    profile_skills = set(
        skill.lower().strip()
        for skill in (profile.get("skills") or [])
    )
    if not profile_skills:
        profile_skills = set(extract_skills(profile_text))

    domain_keywords = _build_domain_keywords(profile_skills, profile_text)

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

        matched_skills = profile_skills & job_skills

        if profile_skills and job_skills:
            denominator = min(len(profile_skills), len(job_skills))
            skill_overlap = len(matched_skills) / denominator if denominator > 0 else 0
        else:
            skill_overlap = 0

        similarity = similarities[idx] if has_similarities else 0

        domain_match_count = _count_domain_matches(job_text, domain_keywords)

        if len(matched_skills) > 0:
            score_a = (0.3 * similarity + 0.7 * skill_overlap) * 100
            score_b = 55 + min(40, len(matched_skills) * 10)
            final_score_percent = round(max(score_a, score_b), 2)
        elif domain_match_count > 0:
            base = 55 + min(40, domain_match_count * 12)
            final_score_percent = round(base + similarity * 5, 2)
        else:
            final_score_percent = round(similarity * 40, 2)

        if final_score_percent < 60:
            continue

        explanation = generate_match_explanation(profile, job, job_skills=job_skills)

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