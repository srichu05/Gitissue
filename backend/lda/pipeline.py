"""Single shared pure entry point for the LDA pipeline (PRD §7.2)."""
from typing import List, Dict, Any, Optional, Callable
from dataclasses import dataclass, field
import numpy as np
from pydantic import BaseModel, Field

from backend.preprocessing.text_processor import process_issue_texts
from backend.lda.model import (
    build_document_term_representation,
    InsufficientDataError,
)
from backend.lda.evaluation import run_k_sweep
from backend.lda.inference import (
    extract_topic_words,
    infer_document_topics,
    compute_prevalence_and_dominance,
    generate_auto_label,
)


class IssueInput(BaseModel):
    """Input issue representation for the LDA pipeline (PRD §7.2)."""
    number: int
    title: str
    body: Optional[str] = None
    created_at: Any = None
    github_issue_id: int = 0


class PipelineConfig(BaseModel):
    """Configuration for running the LDA pipeline (PRD §7.2 & §9.4)."""
    k_mode: str = "auto"
    num_topics: Optional[int] = None
    min_doc_length: int = 8
    seed: int = 42
    passes: int = 15
    iterations: int = 100
    chunksize: int = 2000
    alpha: str = "auto"
    eta: str = "auto"


@dataclass
class PipelineResult:
    """Immutable result snapshot produced by run_lda_pipeline (PRD §7.2)."""
    documents: List[int]
    num_issues_fetched: int
    num_dropped: int
    vocab_size: int
    corpus_stats: Dict[str, Any]
    evaluation_results: List[Dict[str, Any]]
    selected_k: int
    best_k_by_coherence: int
    coherence_cv: float
    perplexity: float
    hyperparameters: Dict[str, Any]
    topics: List[Dict[str, Any]]
    doc_topic: List[List[float]]
    warnings: List[Dict[str, str]] = field(default_factory=list)

    @property
    def num_documents(self) -> int:
        """Total documents retained in final corpus."""
        return len(self.documents)


def run_lda_pipeline(
    issues: List[Any],
    config: Optional[PipelineConfig] = None,
    progress_cb: Optional[Callable[[str, int, int], None]] = None,
) -> PipelineResult:
    """
    Execute the full LDA pipeline from raw issues to final topic intelligence snapshot.
    Shared identically by Phase 1 offline experiments and Phase 2 backend.
    """
    if config is None:
        config = PipelineConfig()

    def update_progress(msg: str, step: int = 0, total: int = 100):
        if progress_cb:
            progress_cb(msg, step, total)

    # 1. Text preprocessing
    update_progress("Preprocessing issue text (cleaning, tokenization, lemmatization)...", 10, 100)
    processed_docs = process_issue_texts(issues, batch_size=64)

    # 2. Document-term representation
    update_progress("Building vocabulary and document-term matrix...", 35, 100)
    corpus_rep = build_document_term_representation(
        processed_docs=processed_docs,
        min_doc_length=config.min_doc_length,
    )

    # 3. K sweep and model training
    update_progress("Running K sweep and variational Bayes training...", 45, 100)
    selected_model, selected_k, best_k, eval_results, sweep_warnings = run_k_sweep(
        corpus=corpus_rep.corpus,
        dictionary=corpus_rep.dictionary,
        docs_in_vocab=corpus_rep.in_vocab_tokens_list,
        k_mode=config.k_mode,
        num_topics_manual=config.num_topics,
        seed=config.seed,
        progress_cb=lambda msg, cur, tot: update_progress(msg, 45 + int(35 * cur / tot), 100),
    )

    # Find metrics for selected model
    selected_eval = next(item for item in eval_results if item["k"] == selected_k)
    coherence_cv = selected_eval["coherence_cv"]
    perplexity = selected_eval["perplexity"]

    # 4. Learned hyperparameters
    alpha_learned = [float(a) for a in selected_model.alpha]
    hyperparameters = {
        "inference": "gensim_lda_online_variational_bayes",
        "passes": config.passes,
        "iterations": config.iterations,
        "chunksize": config.chunksize,
        "alpha": config.alpha,
        "eta": config.eta,
        "random_state": config.seed,
        "alpha_learned": alpha_learned,
    }

    # 5. Topic-word extraction (PRD §9.6)
    update_progress("Extracting topic-word distributions...", 85, 100)
    topic_words_map = extract_topic_words(selected_model, selected_k, topn=15)

    # 6. Document-topic inference (PRD §9.7)
    update_progress("Inferring document-topic distributions...", 90, 100)
    doc_topic_matrix = infer_document_topics(selected_model, corpus_rep.corpus, selected_k)

    # 7. Prevalence and dominant issue counts (PRD §9.8)
    prev_dom = compute_prevalence_and_dominance(doc_topic_matrix, selected_k)

    # 8. Topic labels & packaging
    update_progress("Generating topic labels and statistics...", 95, 100)
    topics = []
    for k in range(selected_k):
        top_words = topic_words_map[k]
        auto_label = generate_auto_label(top_words)
        topics.append({
            "topic_index": k,
            "auto_label": auto_label,
            "prevalence": prev_dom[k]["prevalence"],
            "dominant_issue_count": prev_dom[k]["dominant_issue_count"],
            "top_words": top_words,
        })

    # Order topics by prevalence descending (PRD §9.8)
    topics.sort(key=lambda t: t["prevalence"], reverse=True)

    kept_issue_numbers = [doc.issue_number for doc in corpus_rep.kept_documents]
    doc_topic_list = doc_topic_matrix.tolist()

    update_progress("Pipeline complete", 100, 100)

    return PipelineResult(
        documents=kept_issue_numbers,
        num_issues_fetched=corpus_rep.num_issues_fetched,
        num_dropped=corpus_rep.num_dropped,
        vocab_size=corpus_rep.vocab_size,
        corpus_stats=corpus_rep.corpus_stats,
        evaluation_results=eval_results,
        selected_k=selected_k,
        best_k_by_coherence=best_k,
        coherence_cv=coherence_cv,
        perplexity=perplexity,
        hyperparameters=hyperparameters,
        topics=topics,
        doc_topic=doc_topic_list,
        warnings=sweep_warnings,
    )
