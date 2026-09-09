import json
import re
import time
import requests

MISTRAL_URL = "https://api.mistral.ai/v1/chat/completions"

DEFAULT_MODELS = ["ministral-8b-latest", "mistral-small-latest", "mistral-medium-latest"]

RETRYABLE_STATUSES = (429, 500, 502, 503, 504)


class MistralError(Exception):
    def __init__(self, message: str, status_code: int = None, retry_after: float = None):
        super().__init__(message)
        self.status_code = status_code
        self.retry_after = retry_after


def clean_model_json(content: str) -> str:
    content = re.sub(r"```json", "", content)
    content = re.sub(r"```", "", content)
    return content.strip()


def parse_model_json(content: str) -> dict:
    cleaned = clean_model_json(content)

    candidates = [cleaned, re.sub(r"[\x00-\x1f\x7f]", "", cleaned)]
    for candidate in candidates:
        try:
            return json.loads(candidate)
        except (json.JSONDecodeError, TypeError):
            pass

    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if match:
        candidate = re.sub(r"[\x00-\x1f\x7f]", "", match.group())
        try:
            return json.loads(candidate)
        except (json.JSONDecodeError, TypeError):
            pass

    raise ValueError("Invalid JSON from Mistral")


def _try_once(api_key: str, body: dict):
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    try:
        response = requests.post(MISTRAL_URL, headers=headers, json=body, timeout=60)
    except requests.RequestException as e:
        return MistralError(f"Mistral request failed: {e}")

    if response.status_code == 200:
        return response.json()["choices"][0]["message"]["content"]

    try:
        data = response.json()
        message = data.get("message") or data.get("error") or response.text
    except ValueError:
        message = response.text
    return MistralError(
        f"Mistral API Error ({response.status_code}): {message}",
        status_code=response.status_code,
    )


def chat_completion(api_key: str, payload: dict, max_retries: int = 2, models: list = None) -> str:
    models = models or DEFAULT_MODELS

    last_error = None
    for model in models:
        body = dict(payload)
        body["model"] = model

        for attempt in range(max_retries + 1):
            result = _try_once(api_key, body)

            if isinstance(result, str):
                return result

            last_error = result
            if attempted_with_retry(result, attempt, max_retries):
                delay = min(result.retry_after, 30) if result.retry_after else min(2 ** attempt, 8)
                time.sleep(delay)
                continue

            break

    raise last_error


def attempted_with_retry(error: MistralError, attempt: int, max_retries: int) -> bool:
    return error.status_code in RETRYABLE_STATUSES and attempt < max_retries