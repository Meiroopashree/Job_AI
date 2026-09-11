import json
import os
from dotenv import load_dotenv

from app.ai.mistral_client import chat_completion, parse_model_json

load_dotenv()

MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY")


def generate_cover_letter(profile: dict, job: dict) -> str:
    prompt = build_cover_letter_prompt(profile, job)

    payload = {
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.3,
        "max_tokens": 900
    }

    content = chat_completion(MISTRAL_API_KEY, payload)

    return content.strip()


def build_cover_letter_prompt(profile: dict, job: dict) -> str:
    personal = profile.get("personal_info") or {}
    name = (personal.get("name") or "").strip() or "[Candidate Name]"
    skills = ", ".join(profile.get("skills") or []) or "not listed"

    exp_entries = []
    for e in (profile.get("experience") or []):
        title = (e.get("title") or "").strip()
        company = (e.get("company") or "").strip()
        desc = e.get("description") or ""
        if isinstance(desc, list):
            desc = "; ".join(str(d) for d in desc)
        exp_entries.append(f"- {title} at {company}: {desc}")
    experience_block = "\n".join(exp_entries) or "No experience listed"

    job_skills = ", ".join(job.get("skills") or []) or "not listed"
    job_desc = (job.get("description") or "")[:4000]

    return f"""
You are a professional career coach writing a customized cover letter.

Target job: {job.get('title') or 'Untitled'} at {job.get('company') or 'the company'}
Job description (excerpt):
{job_desc}
Key skills the job asks for: {job_skills}

Candidate profile summary: {profile.get('profile_summary') or 'n/a'}
Candidate skills: {skills}
Relevant experience:
{experience_block}
Candidate name: {name}

Write a persuasive, professional cover letter (250-350 words) that:
- Addresses the specific role and company
- Matches the candidate's real skills and experience to 3-5 requirements from the job
- Uses concrete, truthful examples ONLY from the provided experience
- Is addressed with a generic salutation ("Dear Hiring Manager")
- Ends with a closing and the candidate's name

Return ONLY the letter text, no preamble.
"""


def generate_tailored_resume(profile: dict, job: dict) -> dict:
    prompt = build_tailored_resume_prompt(profile, job)

    payload = {
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.1,
        "max_tokens": 4000
    }

    content = chat_completion(MISTRAL_API_KEY, payload)

    return parse_model_json(content)


def build_tailored_resume_prompt(profile: dict, job: dict) -> str:
    resume_json = json.dumps(profile, indent=2)

    job_skills = ", ".join(job.get("skills") or []) or "not listed"
    job_desc = (job.get("description") or "")[:4000]
    job_title = job.get("title") or "Untitled"
    job_company = job.get("company") or "the company"

    return f"""
You are an expert resume strategist. Tailor the candidate's resume for a SPECIFIC job posting so it shines for both human recruiters and ATS parsers.

TARGET JOB: {job_title} at {job_company}
Job description (excerpt):
{job_desc}
Key skills the job asks for: {job_skills}

CRITICAL RULES - DO NOT MODIFY:
- Keep ALL skills, education, achievements, courses, links, certifications, personal details exactly as provided
- DO NOT add fake skills, experience, or qualifications
- ALL arrays must be flat string arrays. NO objects inside skills, languages, certifications, achievements, or courses.

WHAT YOU CAN MODIFY (WITH THE TARGET JOB IN MIND):
- Rewrite experience bullet points to highlight work most relevant to this job, with action verbs and metrics
- Emphasize the candidate's skills that appear in the job's key skills list EARLY and naturally
- Rewrite profile summary to echo the job's most important keywords while staying truthful
- Improve keyword placement naturally within existing content only

CATEGORICAL FORMAT RULES (violations will crash the application):
- "skills" MUST be a flat string array: ["Python", "JavaScript", "React"]
- "languages" MUST be a flat string array
- "certifications" MUST be a flat string array
- "achievements" MUST be a flat string array
- "courses" MUST be a flat string array
- "experience" MUST be an array of objects with string fields: title, company, start_date, end_date, description
- "education" MUST be an array of objects with string fields: degree, institution, year

Return this EXACT JSON structure (include ALL fields even if empty):
{{
  "ats_resume_data": {{
    "personal_info": {{"name": "","email": "","phone": "","location": ""}},
    "links": {{"linkedin": "","github": "","portfolio": "","other": []}},
    "profile_summary": "...",
    "skills": [],
    "languages": [],
    "certifications": [],
    "achievements": [],
    "experience": [],
    "education": [],
    "courses": []
  }}
}}

Original Resume Data:
{resume_json}
"""