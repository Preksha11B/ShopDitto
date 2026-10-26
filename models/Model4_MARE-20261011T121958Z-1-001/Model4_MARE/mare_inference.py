from pathlib import Path

import joblib
import numpy as np
import pandas as pd


class MARERecommender:
    """Content-popularity hybrid recommender for the Weave project."""

    def __init__(self, bundle_path):
        self.bundle = joblib.load(bundle_path)

        self.weights = self.bundle["weights"]
        self.catalog = self.bundle["product_catalog"].copy()
        self.matrix = self.bundle["product_tfidf_matrix"]
        self.popularity = self.bundle["popularity_counts"]

        self.catalog["parent_asin"] = (
            self.catalog["parent_asin"].astype(str)
        )
        self.product_index = {
            pid: i
            for i, pid in enumerate(self.catalog["parent_asin"])
        }

        if self.matrix.shape[0] != len(self.catalog):
            raise ValueError("Catalog and TF-IDF matrix are misaligned.")

        if not np.isclose(sum(self.weights.values()), 1.0):
            raise ValueError("Hybrid weights must sum to 1.")

        catalog_popularity = np.array([
            np.log1p(self.popularity.get(pid, 0))
            for pid in self.catalog["parent_asin"]
        ], dtype=np.float32)

        self.pop_min = float(catalog_popularity.min())
        self.pop_max = float(catalog_popularity.max())

    def recommend(self, positive_history_ids, candidate_product_ids=None,
                  top_k=10):
        if top_k < 1:
            raise ValueError("top_k must be at least 1.")

        history = list(dict.fromkeys(
            str(pid) for pid in positive_history_ids
            if str(pid) in self.product_index
        ))
        history_set = set(history)

        if candidate_product_ids is None:
            candidates = self.catalog["parent_asin"].tolist()
        else:
            candidates = list(dict.fromkeys(
                str(pid) for pid in candidate_product_ids
                if str(pid) in self.product_index
            ))

        candidates = [
            pid for pid in candidates if pid not in history_set
        ]

        if not candidates:
            return pd.DataFrame(columns=[
                "parent_asin", "title", "content_score",
                "popularity_score", "final_score"
            ])

        candidate_rows = np.array([
            self.product_index[pid] for pid in candidates
        ])

        if history:
            history_rows = np.array([
                self.product_index[pid] for pid in history
            ])
            similarities = (
                self.matrix[candidate_rows] @
                self.matrix[history_rows].T
            )
            content = np.asarray(
                similarities.mean(axis=1)
            ).ravel()
        else:
            content = np.zeros(len(candidates), dtype=np.float32)

        raw_popularity = np.array([
            np.log1p(self.popularity.get(pid, 0))
            for pid in candidates
        ], dtype=np.float32)

        if self.pop_max > self.pop_min:
            popularity = (
                (raw_popularity - self.pop_min) /
                (self.pop_max - self.pop_min)
            )
        else:
            popularity = np.zeros_like(raw_popularity)

        if not history:
            final_scores = popularity
        else:
            final_scores = (
                self.weights["content"] * content +
                self.weights["popularity"] * popularity
            )

        results = pd.DataFrame({
            "parent_asin": candidates,
            "content_score": content,
            "popularity_score": popularity,
            "final_score": final_scores
        })

        results = results.merge(
            self.catalog[["parent_asin", "title"]],
            on="parent_asin",
            how="left",
            validate="one_to_one"
        )

        return (
            results.sort_values("final_score", ascending=False)
            .head(top_k)
            .reset_index(drop=True)
        )


def load_recommender(artifact_dir=None):
    if artifact_dir is None:
        artifact_dir = Path(__file__).resolve().parent

    bundle_path = Path(artifact_dir) / "mare_hybrid_inference.joblib"
    if not bundle_path.exists():
        raise FileNotFoundError(
            f"MARE inference bundle not found: {bundle_path}"
        )

    return MARERecommender(bundle_path)
