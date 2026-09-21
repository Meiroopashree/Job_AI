import math
import os

import numpy as np
import requests
from sklearn.feature_extraction.text import TfidfVectorizer

MISTRAL_EMBED_URL = "https://api.mistral.ai/v1/embeddings"
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "mistral-embed")

_embed_cache: dict = {}


def _cosine(a: list, b: list) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    try:
        dot = sum(x * y for x, y in zip(a, b))
        na = math.sqrt(sum(x * x for x in a))
        nb = math.sqrt(sum(y * y for y in b))
        if na == 0 or nb == 0:
            return 0.0
        return float(max(0.0, min(1.0, dot / (na * nb))))
    except (TypeError, ValueError):
        return 0.0


def fetch_embeddings(texts: list) -> list | None:
    """Get Mistral embeddings for a batch of texts. Returns None on any failure."""
    api_key = os.getenv("MISTRAL_API_KEY", "")
    if not api_key or not texts:
        return None
    texts = [str(t)[:4000] for t in texts]
    try:
        res = requests.post(
            MISTRAL_EMBED_URL,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={"model": EMBEDDING_MODEL, "input": texts[:50]},
            timeout=40,
        )
        if res.status_code != 200:
            print(f"[embeddings] Mistral embed error {res.status_code}: {res.text[:200]}")
            return None
        data = res.json()
        items = data.get("data") or []
        return [item.get("embedding") for item in items if item.get("embedding")]
    except Exception as e:
        print(f"[embeddings] Mistral embed failed: {e}")
        return None


def get_embedding_checked(text: str) -> list | None:
    """Fetch a single embedding with a process-level cache."""
    text = (text or "").strip()
    if not text:
        return None
    if text in _embed_cache:
        return _embed_cache[text]
    batch = fetch_embeddings([text])
    if not batch:
        return None
    _embed_cache[text] = batch[0]
    return batch[0]


def compute_similarities(profile_text: str, job_texts: list, job_embeddings: list = None):
    """Return a similarity score in [0, 1] for each job text.

    Uses TF-IDF cosine (always) combined with Mistral semantic embeddings when
    both the profile embedding and the job's stored embedding are available.
    """
    if not profile_text:
        return []

    tfidf_sims = _tfidf_similarities(profile_text, job_texts)
    if not tfidf_sims:
        return []

    profile_embedding = get_embedding_checked(profile_text) if job_embeddings else None
    if not profile_embedding:
        return tfidf_sims

    blended = []
    for idx, sim in enumerate(tfidf_sims):
        job_emb = job_embeddings[idx] if idx < len(job_embeddings) else None
        if job_emb:
            sem = _cosine(profile_embedding, job_emb)
            sim = 0.65 * sem + 0.35 * sim
        blended.append(float(max(0.0, min(1.0, sim))))
    return blended


def _tfidf_similarities(profile_text: str, job_texts: list) -> list:
    try:
        all_texts = [profile_text] + list(job_texts)
        vectorizer = TfidfVectorizer(max_features=500, stop_words="english")
        matrix = vectorizer.fit_transform(all_texts)
        profile_vec = matrix[0].toarray().flatten()
        similarities = []
        for i in range(1, len(job_texts) + 1):
            job_vec = matrix[i].toarray().flatten()
            dot = np.dot(profile_vec, job_vec)
            norm = np.linalg.norm(profile_vec) * np.linalg.norm(job_vec)
            sim = float(dot / norm) if norm != 0 else 0
            sim = (sim + 1) / 2
            sim = max(0, min(sim, 1))
            similarities.append(sim)
        return similarities
    except Exception as e:
        print(f"[embeddings] TF-IDF similarity failed: {e}")
        return []