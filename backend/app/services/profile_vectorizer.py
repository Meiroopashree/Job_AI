def build_profile_text(profile: dict):

    text_parts = []

    text_parts.append(profile.get("profile_summary", "") or "")

    skills = profile.get("skills")
    text_parts.append(" ".join(skills) if skills else "")

    # experience titles + descriptions
    for exp in (profile.get("experience") or []):
        text_parts.append(exp.get("title", "") or "")
        desc = exp.get("description", [])
        if isinstance(desc, list):
            text_parts.extend(desc)

    # education
    for edu in (profile.get("education") or []):
        text_parts.append(edu.get("degree", "") or "")

    return " ".join(text_parts)