from sklearn.feature_extraction.text import TfidfVectorizer
import numpy as np


def compute_similarities(profile_text: str, job_texts: list):
    if not profile_text:
        return []
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
        print(f"Similarity computation failed: {e}")
        return []
