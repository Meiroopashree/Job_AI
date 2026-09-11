import pandas as pd
from jobspy import scrape_jobs


def scrape_indeed_jobs(search_term: str, location: str = "", country: str = "USA", results_wanted: int = 25, full_description: bool = True):
    jobs = scrape_jobs(
        site_name="indeed",
        search_term=search_term,
        location=location,
        country_indeed=country,
        results_wanted=results_wanted,
        full_description=True if full_description is None else full_description,
    )

    return _to_dicts(jobs)


def _to_dicts(df: pd.DataFrame):
    if df is None or df.empty:
        return []

    jobs = []
    for _, row in df.iterrows():
        jobs.append({
            "title": _safe(row.get("title")),
            "company": _safe(row.get("company")),
            "location": _safe(row.get("location")),
            "description": _safe(row.get("description")),
            "apply_url": _safe(row.get("job_url")),
            "skills": [],
            "salary_min": _num(row.get("min_amount")),
            "salary_max": _num(row.get("max_amount")),
            "salary_interval": _safe(row.get("interval")),
            "salary_currency": _safe(row.get("currency")),
            "date_posted": _safe(row.get("date_posted")),
            "source": _safe(row.get("site")),
        })

    return jobs


def _safe(value):
    if value is None:
        return ""
    if isinstance(value, float) and pd.isna(value):
        return ""
    return str(value).strip()


def _num(value):
    if value is None:
        return None
    if isinstance(value, float) and pd.isna(value):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None
