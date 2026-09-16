from typing import Any

_TEXT_KEYS = ("summary", "headline", "role", "title")


def _to_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, list):
        parts = [part for part in (_to_text(item) for item in value) if part]
        return ", ".join(parts)
    if isinstance(value, dict):
        for key in _TEXT_KEYS:
            picked = _to_text(value.get(key))
            if picked:
                return picked
        parts = [part for part in (_to_text(item) for item in value.values()) if part]
        return ", ".join(parts)
    return ""


def _pick_from(obj: Any, keys: list) -> str:
    if not isinstance(obj, dict):
        return ""
    for key in keys:
        value = _to_text(obj.get(key))
        if value:
            return value
    return ""


def _join_text(parts) -> str:
    return ", ".join(part for part in parts if part)


def _join_list(value) -> str:
    items = value or []
    return ", ".join(str(item).strip() for item in items if str(item).strip())


def _format_education(profile: dict) -> str:
    edu = profile.get("education") or []
    first = edu[0] if edu else None
    if not isinstance(first, dict):
        return ""
    return _join_text(
        [
            _to_text(first.get("degree")),
            _to_text(first.get("institution")),
            _to_text(first.get("year")),
        ]
    )


FIELD_GROUPS = [
    {
        "id": "contact",
        "title": "Contact details",
        "hint": "Used on most application forms",
        "fields": [
            {"id": "full_name", "label": "Full name", "placeholder": "Your full name", "type": "text"},
            {"id": "email", "label": "Email address", "placeholder": "you@example.com", "type": "text"},
            {"id": "phone", "label": "Phone number", "placeholder": "Not found - add if available", "type": "text", "optional": True},
            {"id": "location", "label": "Current location", "placeholder": "City, State", "type": "text", "optional": True},
        ],
    },
    {
        "id": "links",
        "title": "Online presence",
        "hint": "Profile links often requested by employers",
        "fields": [
            {"id": "linkedin", "label": "LinkedIn", "placeholder": "https://linkedin.com/in/...", "type": "url", "optional": True},
            {"id": "github", "label": "GitHub", "placeholder": "https://github.com/...", "type": "url", "optional": True},
            {"id": "portfolio", "label": "Portfolio / website", "placeholder": "https://...", "type": "url", "optional": True},
        ],
    },
    {
        "id": "career",
        "title": "Career highlights",
        "hint": "Best match for title & experience fields",
        "fields": [
            {"id": "current_title", "label": "Most recent job title", "placeholder": "e.g. Senior Frontend Engineer", "type": "text", "optional": True},
            {"id": "current_company", "label": "Most recent company", "placeholder": "Current or last employer", "type": "text", "optional": True},
            {"id": "years_experience", "label": "Years of experience", "placeholder": "e.g. 6", "type": "text", "optional": True},
            {"id": "summary", "label": "Professional summary", "placeholder": "A short pitch recruiters understand instantly", "type": "textarea", "optional": True},
        ],
    },
    {
        "id": "background",
        "title": "Skills & background",
        "hint": "Great for skills and education questions",
        "fields": [
            {"id": "skills", "label": "Skills", "placeholder": "Python, React, SQL...", "type": "textarea"},
            {"id": "education", "label": "Education", "placeholder": "Degree, Institution (Year)", "type": "text", "optional": True},
            {"id": "certifications", "label": "Certifications", "placeholder": "e.g. AWS Certified Developer", "type": "text", "optional": True},
            {"id": "languages", "label": "Languages", "placeholder": "e.g. English, French", "type": "text", "optional": True},
        ],
    },
]


def build_fill_fields(profile: dict, fallback_email: str = "") -> dict:
    pi = profile.get("personal_info") or {}
    if not isinstance(pi, dict):
        pi = {}
    links = profile.get("links") or {}
    if not isinstance(links, dict):
        links = {}

    first_name = _pick_from(pi, ["first_name", "firstname"])
    last_name = _pick_from(pi, ["last_name", "lastname"])
    name = _join_text([first_name, last_name]) or _pick_from(
        pi, ["name", "full_name", "candidate_name", "applicant"]
    )

    email = _pick_from(pi, ["email", "email_address", "e-mail"]) or fallback_email
    phone = _pick_from(pi, ["phone", "phone_number", "mobile", "contact", "phone_no"])
    location = _pick_from(pi, ["location", "city", "address", "current_location", "current_city"])

    linkedin = _pick_from(links, ["linkedin", "linkedin_url", "linked_in"])
    github = _pick_from(links, ["github", "github_url", "git_hub"])
    portfolio = _pick_from(links, ["portfolio", "website", "web", "site", "personal_site"])

    exp = profile.get("experience") or []
    current_title = _to_text(exp[0].get("title")) if exp and isinstance(exp[0], dict) else ""
    current_company = _to_text(exp[0].get("company")) if exp and isinstance(exp[0], dict) else ""

    years = profile.get("years_of_experience")
    years_exp = str(years) if years is not None else ""

    summary = (
        _to_text(profile.get("profile_summary"))
        or _to_text(pi.get("summary"))
        or _to_text(pi.get("headline"))
    )

    originals = {
        "full_name": name,
        "email": email,
        "phone": phone,
        "location": location,
        "linkedin": linkedin,
        "github": github,
        "portfolio": portfolio,
        "current_title": current_title,
        "current_company": current_company,
        "years_experience": years_exp,
        "summary": summary,
        "skills": _join_list(profile.get("skills")),
        "education": _format_education(profile),
        "certifications": _join_list(profile.get("certifications")),
        "languages": _join_list(profile.get("languages")),
    }

    return {"groups": FIELD_GROUPS, "originals": originals}