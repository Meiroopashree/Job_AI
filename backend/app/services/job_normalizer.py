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
_COMMON_SKILLS = [
    # backend / languages
    "python", "java", "go", "golang", "ruby", "php", "c#", "c++", "csharp",
    "scala", "kotlin", "rust", "swift",
    # frontend
    "react", "react native", "angular", "vue", "node", "node.js", "nextjs",
    "typescript", "javascript", "html", "css", "sass", "tailwind", "redux", "webpack",
    # frameworks / apis
    "fastapi", "django", "flask", "spring", "dotnet", ".net", "laravel", "rails",
    "graphql", "rest", "rest api", "apache kafka", "kafka", "redis",
    # databases
    "sql", "mysql", "postgresql", "postgres", "mongodb", "dynamodb", "oracle",
    "sqlite", "elasticsearch", "cassandra", "snowflake", "bigquery",
    # data / ml / ai
    "machine learning", "deep learning", "nlp", "ai", "pandas", "numpy",
    "pytorch", "tensorflow", "scikit-learn", "keras", "data science",
    "data engineering", "etl", "spark", "airflow", "dbt", "llm",
    # devops / cloud
    "aws", "azure", "gcp", "google cloud", "docker", "kubernetes", "terraform",
    "jenkins", "ci/cd", "linux", "bash", "shell", "nginx", "helm", "prometheus",
    "grafana", "github actions", "gitlab", "ansible", "cloudformation",
    # testing / other
    "jest", "cypress", "pytest", "selenium", "junit", "api testing",
    "microservices", "agile", "scrum", "rabbitmq", "message queue",
    # accounting / finance
    "accounting", "accountant", "accounts payable", "accounts receivable",
    "general ledger", "bookkeeping", "financial reporting", "financial analysis",
    "tax preparation", "tax compliance", "gst", "gst filing",
    "audit", "auditing", "accounts reconciliation", "bank reconciliation",
    "payroll", "erp", "sap", "quickbooks",
    "xero", "freshbooks", "sage", "tally", "tally erp", "excel", "vba",
    "ifrs", "gaap", "cost accounting", "budgeting", "forecasting",
    "accounts", "finance", "financial", "financial statements", "balance sheet",
    "profit and loss", "cash flow", "revenue recognition",
    "accounts management", "billing", "invoicing", "ledger",
    "fiscal", "compliance", "regulatory", "internal controls",
    "receivable", "payable", "ca", "chartered accountant",
]

# Word-boundary-aware patterns so short skills ("go", "ai", "sql", "ca") only
# match as standalone words, not substrings of unrelated words ("Google", "said").
_SKILL_PATTERNS = [
    (skill, re.compile(rf"(?<![a-z0-9]){re.escape(skill)}(?![a-z0-9])"))
    for skill in _COMMON_SKILLS
]


def extract_skills(text: str):

    if not text:
        return []

    text_lower = text.lower()

    found = []

    for skill, pattern in _SKILL_PATTERNS:
        if pattern.search(text_lower):
            found.append(skill)

    return list(dict.fromkeys(found))  # remove duplicates, preserve order


# =========================
# NORMALIZE JOB
# =========================
def normalize_job(job: dict):

    # clean description
    description = clean_html(job.get("description", ""))

    # extract skills from description if missing
    skills = job.get("skills", [])

    if not isinstance(skills, list) or len(skills) == 0:
        title = str(job.get("title", "")).strip()
        skills = extract_skills(f"{title} {description}")

    apply_url = job.get("apply_url", "").strip()
    source = str(job.get("source", "") or "").strip()
    if not source:
        source_url = apply_url.lower()
        if "linkedin.com" in source_url:
            source = "linkedin"
        elif "indeed.com" in source_url:
            source = "indeed"

    return {
        "title": job.get("title", "").strip(),
        "company": job.get("company", "").strip(),
        "location": job.get("location", "").strip(),

        # CLEAN TEXT VERSION (FIXED)
        "description": description,

        "apply_url": apply_url,

        # FINAL CLEAN SKILLS
        "skills": skills,

        "salary_min": job.get("salary_min"),
        "salary_max": job.get("salary_max"),
        "salary_interval": job.get("salary_interval"),
        "salary_currency": job.get("salary_currency"),
        "date_posted": job.get("date_posted"),
        "source": source,
    }