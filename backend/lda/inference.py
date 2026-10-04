"""Topic-word and document-topic inference according to PRD §9.6–9.8."""
from typing import List, Dict, Any, Tuple
import numpy as np
from gensim.models import LdaModel
from backend.preprocessing.protected_terms import display_case


def extract_topic_words(
    lda_model: LdaModel,
    num_topics: int,
    topn: int = 15,
) -> Dict[int, List[Dict[str, Any]]]:
    """
    Extract top 15 words per topic with raw probabilities (PRD §9.6).
    The raw P(word|topic) values are preserved and not normalized to 1.
    """
    topic_words: Dict[int, List[Dict[str, Any]]] = {}
    for k in range(num_topics):
        words_probs = lda_model.show_topic(k, topn=topn)
        words_list = []
        for rank, (word, prob) in enumerate(words_probs, start=1):
            words_list.append({
                "rank": rank,
                "word": str(word),
                "probability": float(prob),
            })
        topic_words[k] = words_list
    return topic_words


def infer_document_topics(
    lda_model: LdaModel,
    corpus: List[List[Tuple[int, int]]],
    num_topics: int,
) -> np.ndarray:
    """
    Infer P(topic | document) for every document in the corpus (PRD §9.7).
    Each row is renormalized to ensure sum(P(topic | document)) ≈ 1.0.
    """
    num_docs = len(corpus)
    doc_topic = np.zeros((num_docs, num_topics), dtype=np.float64)

    for doc_idx, bow in enumerate(corpus):
        # Query with minimum_probability=0.0 to obtain all topic assignments
        topic_dist = lda_model.get_document_topics(bow, minimum_probability=0.0)
        for topic_id, prob in topic_dist:
            if topic_id < num_topics:
                doc_topic[doc_idx, topic_id] = float(prob)

        # Renormalize to sum to 1.0
        row_sum = np.sum(doc_topic[doc_idx])
        if row_sum > 0:
            doc_topic[doc_idx] /= row_sum
        else:
            doc_topic[doc_idx] = 1.0 / num_topics

    return doc_topic


def compute_prevalence_and_dominance(
    doc_topic_matrix: np.ndarray,
    num_topics: int,
) -> Dict[int, Dict[str, Any]]:
    """
    Calculate overall topic prevalence and dominant-topic issue count (PRD D-04, §9.8).
    - prevalence_k: mean over documents of P(topic k | document).
    - dominant_issue_count_k: count of documents whose argmax topic is k.
    """
    num_docs = len(doc_topic_matrix)
    if num_docs == 0:
        return {
            k: {"prevalence": 0.0, "dominant_issue_count": 0}
            for k in range(num_topics)
        }

    # Mean across all documents
    prevalence = np.mean(doc_topic_matrix, axis=0)

    # Argmax dominant topic
    dominant_topics = np.argmax(doc_topic_matrix, axis=1)
    dominant_counts = np.bincount(dominant_topics, minlength=num_topics)

    results: Dict[int, Dict[str, Any]] = {}
    for k in range(num_topics):
        results[k] = {
            "prevalence": float(prevalence[k]),
            "dominant_issue_count": int(dominant_counts[k]),
        }
    return results


def generate_auto_label(top_words: List[Dict[str, Any]]) -> str:
    """
    Generate heuristic auto-label from top 3 topic words (PRD D-08, §9.8).
    Words are display-cased and joined using ' / '.
    """
    top3 = [w["word"] for w in top_words[:3]]
    cased = [display_case(w) for w in top3]
    return " / ".join(cased)
