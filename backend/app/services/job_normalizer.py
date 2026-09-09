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
        "accounting", "accounts payable", "accounts receivable", "general ledger",
        "bookkeeping", "financial reporting", "financial analysis", "tax preparation",
        "tax compliance", "audit", "auditing", "accounts reconciliation",
        "bank reconciliation", "payroll", "erp", "sap", "quickbooks",
        "xero", "freshbooks", "sage", "tally", "excel", "vba",
        "ifrs", "gaap", "cost accounting", "budgeting", "forecasting",
        "accounts", "finance", "financial statements", "balance sheet",
        "profit and loss", "cash flow", "revenue recognition",
        "accounts management", "billing", "invoicing", "ledger",
        "fiscal", "compliance", "regulatory", "internal controls",
    ]

    text_lower = text.lower()

    found = []

    for skill in common_skills:
        if skill in text_lower:
            found.append(skill.strip())

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