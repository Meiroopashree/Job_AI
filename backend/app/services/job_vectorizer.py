def build_job_text(job: dict):

    text_parts = []

    text_parts.append(job.get("title", "") or "")
    text_parts.append(job.get("description", "") or "")
    skills = job.get("skills")
    text_parts.append(" ".join(skills) if skills else "")

    return " ".join(text_parts)