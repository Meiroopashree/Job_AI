import os
import json
import re
import requests
from dotenv import load_dotenv

load_dotenv()

MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY")
MISTRAL_URL = "https://api.mistral.ai/v1/chat/completions"


# =========================
# CLEAN OUTPUT
# =========================
def clean_json(content: str):
    content = re.sub(r"```json", "", content)
    content = re.sub(r"```", "", content)
    return content.strip()


# =========================
# VALIDATION HELPERS
# =========================

def is_text_link(value: str):
    """Accepts LinkedIn, Pinterest, Resume Templates even without URLs"""
    if not isinstance(value, str):
        return False

    value = value.strip().lower()

    known_platforms = [
        "linkedin",
        "github",
        "portfolio",
        "pinterest",
        "resume",
        "template"
    ]

    return any(p in value for p in known_platforms)


def is_real_url(value: str):
    if not isinstance(value, str):
        return False
    return value.startswith("http") or value.startswith("www.")


def is_real_certification(text: str):
    """ONLY real certifications, not inferred ones"""
    if not isinstance(text, str):
        return False

    text = text.lower()

    cert_keywords = [
        "certification",
        "certified",
        "certificate"
    ]

    return any(k in text for k in cert_keywords)


def is_license(text: str):
    if not isinstance(text, str):
        return False

    text = text.lower()
    return "license" in text or "cdl" in text


# =========================
# VALIDATION LAYER
# =========================
def validate_data(data: dict):

    # -------------------------
    # LINKS FIX
    # -------------------------
    links = data.get("links", {})

    cleaned_other = []

    for item in links.get("other", []):
        if is_text_link(item):
            cleaned_other.append(item)

    links["other"] = cleaned_other

    # strict URL fields
    for key in ["linkedin", "github", "portfolio"]:
        val = links.get(key, "")
        if not is_real_url(val):
            links[key] = ""

    data["links"] = links

    # -------------------------
    # CERTIFICATIONS FIX
    # -------------------------
    cleaned_certs = []
    licenses = []

    for cert in data.get("certifications", []):

        if isinstance(cert, str):

            if is_license(cert):
                licenses.append(cert)

            elif is_real_certification(cert):
                cleaned_certs.append(cert)

    data["certifications"] = cleaned_certs
    data["licenses"] = licenses

    return data


# =========================
# PROMPT BUILDER
# =========================
def build_prompt(resume_text: str):

    return f"""
You are a STRICT resume parser.

IMPORTANT RULES:
- DO NOT hallucinate data
- Extract ONLY what is explicitly present
- If missing → return "" or []

CRITICAL STRUCTURE RULES:

1. LINKS RULE:
- If full URL exists → put in linkedin/github/portfolio
- If only name exists (LinkedIn, Pinterest, Resume Templates):
  → put in "other"
- NEVER ignore text-based links

2. CERTIFICATIONS RULE:
- ONLY include if explicitly labeled as:
  "certification", "certificate", or "certified"
- DO NOT include courses or training programs
- DO NOT infer certifications from meaning

3. LICENSE RULE:
- Driving license / CDL → separate field internally

4. COURSES RULE:
- training programs, online courses, academic programs

Return JSON:

{{
  "personal_info": {{
    "name": "",
    "email": "",
    "phone": "",
    "location": ""
  }},

  "links": {{
    "linkedin": "",
    "github": "",
    "portfolio": "",
    "other": []
  }},

  "profile_summary": "",

  "skills": [],
  "languages": [],
  "certifications": [],
  "achievements": [],

  "experience": [],
  "education": [],
  "courses": [],

  "years_of_experience": 0,
  "experience_summary": {{}}
}}

Resume:
{resume_text}
"""


# =========================
# MAIN FUNCTION
# =========================
def extract_resume_data(resume_text: str):

    prompt = build_prompt(resume_text)

    headers = {
        "Authorization": f"Bearer {MISTRAL_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": "mistral-small-latest",
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.1
    }

    response = requests.post(
        MISTRAL_URL,
        headers=headers,
        json=payload
    )

    if response.status_code != 200:
        raise Exception(f"Mistral API Error: {response.text}")

    content = response.json()["choices"][0]["message"]["content"]

    cleaned = clean_json(content)

    try:
        parsed = json.loads(cleaned)

    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if not match:
            raise ValueError("Invalid JSON from Mistral")
        parsed = json.loads(match.group())

    # FINAL SAFETY LAYER
    return validate_data(parsed)