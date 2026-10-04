"""Evaluation metrics, K-sweep, and Hungarian topic alignment according to PRD §9.5 & §9.10."""
from typing import List, Dict, Any, Tuple, Optional
from dataclasses import dataclass
import numpy as np
from gensim.corpora import Dictionary
from gensim.models import LdaModel, CoherenceModel
from scipy.optimize import linear_sum_assignment
from sklearn.metrics.pairwise import cosine_similarity
from backend.lda.model import train_lda_model


@dataclass
class TopicMatchResult:
    """Result of Hungarian matching between two topic distributions."""
    mean_similarity: float
    matched_pairs: List[Tuple[int, int, float]]  # (topic_a, topic_b, similarity)


def compute_coherence(
    model: LdaModel,
    texts: List[List[str]],
    dictionary: Dictionary,
    coherence: str = "c_v",
) -> float:
    """Compute C_v coherence with processes=1 (PRD D-26)."""
    cm = CoherenceModel(
        model=model,
        texts=texts,
        dictionary=dictionary,
        coherence=coherence,
        processes=1,
    )
    return float(cm.get_coherence())


def compute_perplexity(model: LdaModel, corpus: List[List[Tuple[int, int]]]) -> Tuple[float, float]:
    """
    Compute log perplexity bound and derived perplexity: 2^(-bound) (PRD D-06, §9.5).
    Reported for informational purposes only.
    """
    bound = float(model.log_perplexity(corpus))
    perplexity = float(2.0 ** (-bound))
    return bound, perplexity


def run_k_sweep(
    corpus: List[List[Tuple[int, int]]],
    dictionary: Dictionary,
    docs_in_vocab: List[List[str]],
    k_mode: str = "auto",
    num_topics_manual: Optional[int] = None,
    seed: int = 42,
    progress_cb=None,
) -> Tuple[LdaModel, int, int, List[Dict[str, Any]], List[Dict[str, str]]]:
    """
    Execute K sweep over {3, 5, 7, 10, 12, 15} plus K_user if manual (PRD §9.5).
    Filter candidates to K <= max(3, n_docs // 10).
    In manual mode, always keep K_user.
    Selection: highest C_v coherence (tie: smaller K). Manual mode uses K_user.
    Maintains only the selected/best model in memory (PRD D-07).
    """
    n_docs = len(docs_in_vocab)
    candidate_set = {3, 5, 7, 10, 12, 15}
    warnings: List[Dict[str, str]] = []

    if k_mode == "manual" and num_topics_manual is not None:
        candidate_set.add(num_topics_manual)

    max_recommended_k = max(3, n_docs // 10)
    candidates = sorted([k for k in candidate_set if k <= max_recommended_k])

    if k_mode == "manual" and num_topics_manual is not None:
        if num_topics_manual not in candidates:
            candidates.append(num_topics_manual)
            candidates.sort()
        if num_topics_manual > max_recommended_k:
            warnings.append({
                "code": "K_EXCEEDS_RECOMMENDED",
                "message": f"Manual K={num_topics_manual} exceeds recommended limit of {max_recommended_k} for {n_docs} documents.",
            })

    results: List[Dict[str, Any]] = []
    best_k_by_coherence = candidates[0]
    best_coherence = -1e9

    best_model: Optional[LdaModel] = None
    manual_model: Optional[LdaModel] = None

    total_candidates = len(candidates)

    for idx, k in enumerate(candidates, start=1):
        if progress_cb:
            progress_cb(f"Training candidate K={k} ({idx} of {total_candidates})", idx, total_candidates)

        model = train_lda_model(corpus, dictionary, num_topics=k, seed=seed)
        coherence_cv = compute_coherence(model, docs_in_vocab, dictionary, coherence="c_v")
        bound, perplexity = compute_perplexity(model, corpus)

        results.append({
            "k": k,
            "coherence_cv": round(coherence_cv, 4),
            "log_perplexity_bound": round(bound, 4),
            "perplexity": round(perplexity, 2),
        })

        if coherence_cv > best_coherence:
            best_coherence = coherence_cv
            best_k_by_coherence = k
            if k_mode == "auto":
                best_model = model
            elif k_mode == "manual" and k != num_topics_manual:
                del model
        elif k_mode == "manual" and k != num_topics_manual:
            del model
        elif k_mode == "auto":
            del model

        if k_mode == "manual" and k == num_topics_manual:
            manual_model = model

    if k_mode == "manual":
        selected_k = num_topics_manual if num_topics_manual is not None else best_k_by_coherence
        selected_model = manual_model if manual_model is not None else best_model
    else:
        selected_k = best_k_by_coherence
        selected_model = best_model

    if selected_model is None:
        # Fallback if candidates were empty (should not happen)
        selected_model = train_lda_model(corpus, dictionary, num_topics=selected_k, seed=seed)

    return selected_model, selected_k, best_k_by_coherence, results, warnings


def align_topics_hungarian(
    topic_word_matrix_a: np.ndarray,
    topic_word_matrix_b: np.ndarray,
) -> TopicMatchResult:
    """
    Match topics between two models using Hungarian algorithm on cosine similarity (PRD §9.10).
    topic_word_matrix_a: shape (K_a, V)
    topic_word_matrix_b: shape (K_b, V)
    """
    sim_matrix = cosine_similarity(topic_word_matrix_a, topic_word_matrix_b)
    # Hungarian algorithm minimizes cost, so use 1 - similarity (or negative similarity)
    cost_matrix = 1.0 - sim_matrix
    row_ind, col_ind = linear_sum_assignment(cost_matrix)

    matched_pairs = []
    similarities = []
    for r, c in zip(row_ind, col_ind):
        sim = float(sim_matrix[r, c])
        matched_pairs.append((int(r), int(c), sim))
        similarities.append(sim)

    mean_sim = float(np.mean(similarities)) if similarities else 0.0
    return TopicMatchResult(mean_similarity=mean_sim, matched_pairs=matched_pairs)
