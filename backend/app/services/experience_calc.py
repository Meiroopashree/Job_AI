from datetime import datetime


def parse_date(date_str: str):

    """
    Supports formats like:
    - 2021-01
    - 2021-01-01
    - January 2021
    """

    if not date_str:
        return None

    formats = [
        "%Y-%m",
        "%Y-%m-%d",
        "%B %Y",
        "%b %Y"
    ]

    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt)
        except:
            continue

    return None


def calculate_experience(experience_list):

    total_months = 0

    if not isinstance(experience_list, list):
        return {
            "years": 0,
            "months": 0,
            "total_months": 0,
            "decimal_years": 0.0,
        }

    for job in experience_list:

        if not isinstance(job, dict):
            continue

        start = parse_date(job.get("start_date"))
        end = parse_date(job.get("end_date"))

        if not start:
            continue

        if not end:
            end = datetime.now()

        diff_months = (end.year - start.year) * 12 + (end.month - start.month)

        if diff_months > 0:
            total_months += diff_months

    years = total_months // 12
    months = total_months % 12

    return {
        "years": years,
        "months": months,
        "total_months": total_months,
        "decimal_years": round(total_months / 12, 2)
    }