import json
import os
from dotenv import load_dotenv

from app.ai.mistral_client import chat_completion, parse_model_json

load_dotenv()

MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY")
MISTRAL_URL = "https://api.mistral.ai/v1/chat/completions"


def check_ats_score(profile_data: dict):
    prompt = build_ats_check_prompt(profile_data)

    payload = {
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.1,
        "max_tokens": 2000
    }

    content = chat_completion(MISTRAL_API_KEY, payload)

    return parse_model_json(content)


def build_ats_check_prompt(profile: dict):
    resume_json = json.dumps(profile, indent=2)

    return f"""
You are an expert ATS (Applicant Tracking System) resume analyst.

Evaluate the following resume data and score it against ATS best practices.

SCORING CRITERIA (each out of 100):

1. **Keyword Optimization (weight: 25%)**
   - Does the resume use industry-standard keywords?
   - Are skills mentioned in a parsable format?
   - Are relevant technologies and tools explicitly named?

2. **Formatting & Structure (weight: 15%)**
   - Are standard section headers used? (e.g., "Experience", "Education", "Skills")
   - Is the layout clean and easily parsable?
   - No tables, columns, or graphics that confuse parsers?

3. **Quantifiable Achievements (weight: 15%)**
   - Are achievements backed by numbers, percentages, or metrics?
   - Is there evidence of impact rather than just duties?

4. **Contact Information (weight: 10%)**
   - Is name, email, phone, location present?
   - Are LinkedIn/GitHub/portfolio links provided?

5. **Skills Section (weight: 10%)**
   - Are skills listed in a dedicated section?
   - Are they categorized or clearly separated?
   - Are both technical and soft skills included?

6. **Experience Quality (weight: 15%)**
   - Are job titles, companies, dates, and descriptions provided?
   - Are descriptions action-oriented with strong verbs?

7. **Education & Certifications (weight: 5%)**
   - Is education listed with degree, institution, and year?
   - Are certifications and licenses included?

8. **Resume Length & Density (weight: 5%)**
   - Is the resume concise (1-2 pages)?
   - Is there a good balance of whitespace and content?

Return JSON:
{{
  "overall_score": <float 0-100>,
  "breakdown": {{
    "keyword_optimization": <float 0-100>,
    "formatting_and_structure": <float 0-100>,
    "quantifiable_achievements": <float 0-100>,
    "contact_information": <float 0-100>,
    "skills_section": <float 0-100>,
    "experience_quality": <float 0-100>,
    "education_and_certifications": <float 0-100>,
    "resume_length_and_density": <float 0-100>
  }},
  "explanation": {{
    "overall": "Brief summary of why this score was given. Be specific to the resume data.",
    "strengths": ["List 2-3 specific strengths of this resume for ATS"],
    "weaknesses": ["List 2-3 specific weaknesses hurting the ATS score"],
    "details": {{
      "keyword_optimization": "Why this score was given and how to improve",
      "formatting_and_structure": "Why this score was given and how to improve",
      "quantifiable_achievements": "Why this score was given and how to improve",
      "contact_information": "Why this score was given and how to improve",
      "skills_section": "Why this score was given and how to improve",
      "experience_quality": "Why this score was given and how to improve",
      "education_and_certifications": "Why this score was given and how to improve",
      "resume_length_and_density": "Why this score was given and how to improve"
    }}
  }},
  "suggestions": [
    "Actionable suggestion 1",
    "Actionable suggestion 2",
    "Actionable suggestion 3",
    "Actionable suggestion 4",
    "Actionable suggestion 5"
  ]
}}

Resume Data:
{resume_json}
"""


def generate_ats_resume(profile_data: dict, suggestions: list = None):
    prompt = build_ats_generate_prompt(profile_data, suggestions)

    payload = {
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.1,
        "max_tokens": 4000
    }

    content = chat_completion(MISTRAL_API_KEY, payload)

    return parse_model_json(content)


def build_ats_generate_prompt(profile: dict, suggestions: list = None):
    resume_json = json.dumps(profile, indent=2)

    suggestions_block = ""
    if suggestions:
        items = "\n".join([f"- {s}" for s in suggestions])
        suggestions_block = f"""
PREVIOUS ATS ANALYSIS SUGGESTIONS (address EVERY one):
{items}

"""

    return f"""
You are an expert ATS resume optimization specialist. Rewrite this resume to be maximally ATS-friendly.

{suggestions_block}CRITICAL RULES - DO NOT MODIFY:
- Keep ALL skills, education, achievements, courses, links, certifications, personal details exactly as provided
- DO NOT add fake skills, experience, or qualifications
- ALL arrays must be flat string arrays. NO objects inside skills, languages, certifications, achievements, or courses.

WHAT YOU CAN MODIFY:
- Rewrite experience bullet points to be more action-oriented with metrics
- Reorder/restructure sections, improve formatting and section headers
- Rewrite profile summary to be more keyword-rich and impactful
- Improve keyword placement naturally within existing content

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
