import os
import smtplib
import ssl
from email.message import EmailMessage

import requests

SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", SMTP_USER)
SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "true").lower() == "true"

EMAIL_PROVIDER = (os.getenv("EMAIL_PROVIDER", "smtp") or "smtp").strip().lower()
EMAIL_API_KEY = (os.getenv("EMAIL_API_KEY", "") or "").strip()
EMAIL_FROM = (os.getenv("EMAIL_FROM", "") or "").strip() or SMTP_FROM


def is_configured() -> bool:
    if EMAIL_PROVIDER in ("brevo", "sendgrid"):
        return bool(EMAIL_API_KEY and EMAIL_FROM)
    return bool(SMTP_HOST and SMTP_USER and SMTP_PASSWORD)


def _configure_hint() -> str:
    if EMAIL_PROVIDER in ("brevo", "sendgrid"):
        return f"EMAIL_PROVIDER={EMAIL_PROVIDER} needs EMAIL_API_KEY and EMAIL_FROM"
    return "SMTP is not configured (SMTP_HOST/SMTP_USER/SMTP_PASSWORD missing)"


def _send_smtp(to: str, subject: str, body: str):
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = SMTP_FROM
    msg["To"] = to
    msg.set_content(body)

    if SMTP_USE_TLS:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as server:
            server.ehlo()
            server.starttls(context=ssl.create_default_context())
            server.ehlo()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)
    else:
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=20) as server:
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)


def _send_brevo(to: str, subject: str, body: str):
    res = requests.post(
        "https://api.brevo.com/v3/smtp/email",
        headers={"api-key": EMAIL_API_KEY, "accept": "application/json", "content-type": "application/json"},
        json={
            "sender": {"name": "JobAI", "email": EMAIL_FROM},
            "to": [{"email": to}],
            "subject": subject,
            "textContent": body,
        },
        timeout=30,
    )
    if res.status_code >= 300:
        raise RuntimeError(f"Brevo API returned HTTP {res.status_code}: {res.text[:300]}")


def _send_sendgrid(to: str, subject: str, body: str):
    res = requests.post(
        "https://api.sendgrid.com/v3/mail/send",
        headers={"Authorization": f"Bearer {EMAIL_API_KEY}", "content-type": "application/json"},
        json={
            "from": {"email": EMAIL_FROM},
            "personalizations": [{"to": [{"email": to}]}],
            "subject": subject,
            "content": [{"type": "text/plain", "value": body}],
        },
        timeout=30,
    )
    if res.status_code >= 300:
        raise RuntimeError(f"SendGrid API returned HTTP {res.status_code}: {res.text[:300]}")


def _send(to: str, subject: str, body: str):
    if EMAIL_PROVIDER == "brevo":
        _send_brevo(to, subject, body)
    elif EMAIL_PROVIDER == "sendgrid":
        _send_sendgrid(to, subject, body)
    else:
        _send_smtp(to, subject, body)


def send_email(to: str, subject: str, body: str) -> bool:
    ok, _ = send_email_with_error(to, subject, body)
    return ok


def send_email_with_error(to: str, subject: str, body: str) -> tuple[bool, str]:
    if not is_configured():
        return False, _configure_hint()
    try:
        _send(to, subject, body)
        return True, ""
    except Exception as e:
        message = f"{type(e).__name__}: {e}"
        print(f"[email] send failed to {to}: {message}")
        return False, message