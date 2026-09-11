import json
import re
import time

import requests
from bs4 import BeautifulSoup

from app.services.job_normalizer import clean_html, extract_skills

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)

LINKEDIN_VIEW_RE = re.compile(r"linkedin\.com/jobs/view/(\d+)", re.IGNORECASE)
INDEED_JK_RE = re.compile(r"indeed\.com/viewjob\?jk=([A-Za-z0-9]+)", re.IGNORECASE)

MIN_DESCRIPTION_LEN = 40


def _get(url: str, retries: int = 2) -> str:
    headers = {
        "User-Agent": USER_AGENT,
        "Accept-Language": "en-US,en;q=0.9",
    }
    last_error = None
    for attempt in range(retries + 1):
        try:
            resp = requests.get(url, headers=headers, timeout=20)
            if resp.status_code == 200:
                return resp.text
            last_error = f"HTTP {resp.status_code}"
        except Exception as e:
            last_error = str(e)
        if attempt < retries:
            time.sleep(1.5)
    raise RuntimeError(f"Fetch failed for {url}: {last_error}")


def _extract_linkedin(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")

    node = soup.select_one("div[class*='show-more-less-html__markup']")
    if node:
        text = clean_html(str(node))
        if len(text) > MIN_DESCRIPTION_LEN:
            return text

    for script in soup.find_all("script", {"type": "application/ld+json"}):
        try:
            data = json.loads(script.string or "")
        except Exception:
            continue
        if isinstance(data, dict):
            desc = data.get("description")
            if isinstance(desc, str) and len(desc) > MIN_DESCRIPTION_LEN:
                return clean_html(desc)

    return ""


def _extract_indeed(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    node = soup.select_one("#jobDescriptionText")
    if node:
        text = clean_html(str(node))
        if len(text) > MIN_DESCRIPTION_LEN:
            return text
    return ""


def fetch_job_description(apply_url: str) -> str:
    if not apply_url:
        return ""

    linkedin_match = LINKEDIN_VIEW_RE.search(apply_url)
    if linkedin_match:
        job_id = linkedin_match.group(1)
        page = _get(f"https://www.linkedin.com/jobs/view/{job_id}")
        desc = _extract_linkedin(page)
        if desc:
            return desc
        guest_page = _get(f"https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/{job_id}")
        return _extract_linkedin(guest_page)

    indeed_match = INDEED_JK_RE.search(apply_url)
    if indeed_match:
        jk = indeed_match.group(1)
        page = _get(f"https://www.indeed.com/viewjob?jk={jk}")
        return _extract_indeed(page)

    return ""


def extract_skills_for_job(title: str, description: str):
    return list(dict.fromkeys(extract_skills(f"{title or ''} {description or ''}")))