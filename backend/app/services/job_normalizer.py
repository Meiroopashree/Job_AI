import re
from bs4 import BeautifulSoup


# =========================
# CLEAN HTML DESCRIPTION
# =========================
def clean_html(raw_html: str) -> str:
    if not raw_html:
        return ""

    soup = BeautifulSoup(raw_html, "html.parser")

    text = soup.get_text(separator="\n")

    lines = [line.strip() for line in text.split("\n") if line.strip()]

    return "\n".join(lines)


# =========================
# SKILL EXTRACTION
# =========================
def extract_skills(text: str):

    if not text:
        return []

    common_skills = [
        "python", "java", "sql", "react", "node",
        "fastapi", "aws", "docker", "kubernetes",
        "machine learning", "nlp", "ai",
        "typescript", "javascript", "nextjs",
        "postgresql", "mongodb"
    ]

    text_lower = text.lower()

    found = []

    for skill in common_skills:
        if skill in text_lower:
            found.append(skill)

    return list(set(found))  # remove duplicates


# =========================
# NORMALIZE JOB
# =========================
def normalize_job(job: dict):

    # clean description
    description = clean_html(job.get("description", ""))

    # extract skills from description if missing
    skills = job.get("skills", [])

    if not isinstance(skills, list) or len(skills) == 0:
        skills = extract_skills(description)

    return {
        "title": job.get("title", "").strip(),
        "company": job.get("company", "").strip(),
        "location": job.get("location", "").strip(),

        # CLEAN TEXT VERSION (FIXED)
        "description": description,

        "apply_url": job.get("apply_url", "").strip(),

        # FINAL CLEAN SKILLS
        "skills": skills
    }