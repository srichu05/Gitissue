"""LDA Modeling and Inference package for GitIssue."""
from backend.lda.model import (
    InsufficientDataError,
    CorpusRepresentation,
    build_document_term_representation,
    train_lda_model,
)
from backend.lda.inference import (
    extract_topic_words,
    infer_document_topics,
    compute_prevalence_and_dominance,
    generate_auto_label,
)
from backend.lda.evaluation import (
    compute_coherence,
    compute_perplexity,
    run_k_sweep,
    TopicMatchResult,
    align_topics_hungarian,
)
from backend.lda.gibbs import CollapsedGibbsSampler
from backend.lda.pipeline import run_lda_pipeline, PipelineConfig, PipelineResult

__all__ = [
    "InsufficientDataError",
    "CorpusRepresentation",
    "build_document_term_representation",
    "train_lda_model",
    "extract_topic_words",
    "infer_document_topics",
    "compute_prevalence_and_dominance",
    "generate_auto_label",
    "compute_coherence",
    "compute_perplexity",
    "run_k_sweep",
    "TopicMatchResult",
    "align_topics_hungarian",
    "CollapsedGibbsSampler",
    "run_lda_pipeline",
    "PipelineConfig",
    "PipelineResult",
]
