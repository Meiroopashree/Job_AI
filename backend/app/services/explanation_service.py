def generate_match_explanation(profile, job):

    profile_skills = set(
        skill.lower()
        for skill in (profile.get("skills") or [])
    )

    job_skills = set(
        skill.lower()
        for skill in (job.get("skills") or [])
    )

    matched_skills = list(profile_skills & job_skills)

    missing_skills = list(job_skills - profile_skills)

    match_count = len(matched_skills)
    missing_count = len(missing_skills)
    total = match_count + missing_count

    if total > 0:
        pct = round(match_count / total * 100)
    else:
        pct = 0

    if match_count > 0:
        strengths = [f"Your profile matches {match_count} of {total} required skills"]
    else:
        strengths = []

    summary = f"Matched {match_count} of {total} required skills ({pct}% match)"

    return {
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
        "required_skills": list(job_skills),
        "strengths": strengths,
        "summary": summary,
    }
