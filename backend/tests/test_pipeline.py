"""Unit tests for the end-to-end LDA pipeline and invariants (PRD §7.2, §9.5-9.8)."""
import pytest
import numpy as np
from backend.lda.pipeline import (
    IssueInput,
    PipelineConfig,
    run_lda_pipeline,
)
from backend.lda.inference import (
    extract_topic_words,
    infer_document_topics,
    compute_prevalence_and_dominance,
    generate_auto_label,
)
from backend.lda.evaluation import run_k_sweep


def generate_synthetic_issues(n: int = 60) -> list[IssueInput]:
    """Generate synthetic issues across 3 distinct topic vocabularies."""
    issues = []
    topics_vocab = [
        ["cuda", "gpu", "memory", "allocation", "device", "driver", "crash", "nvidia"],
        ["gradient", "loss", "optimizer", "backward", "autograd", "tensor", "weight", "train"],
        ["docker", "container", "image", "linux", "build", "wheel", "install", "pip"],
    ]

    for i in range(n):
        topic_idx = i % 3
        words = topics_vocab[topic_idx] * 4
        title = f"Issue {i} regarding {words[0]} and {words[1]}"
        body = " ".join(words) + " encountered unexpected behavior during execution."
        issues.append(
            IssueInput(
                number=1000 + i,
                title=title,
                body=body,
                created_at="2026-01-15T10:00:00Z",
                github_issue_id=5000 + i,
            )
        )
    return issues


def test_pipeline_execution_and_invariants():
    """Verify that run_lda_pipeline satisfies all PRD invariants."""
    issues = generate_synthetic_issues(60)
    config = PipelineConfig(k_mode="auto", seed=42, min_doc_length=5)

    result = run_lda_pipeline(issues, config)

    # Invariant 1: Documents retained
    assert result.num_documents == 60
    assert result.num_dropped == 0
    assert len(result.documents) == 60

    # Invariant 2: Selected K within candidate set
    assert result.selected_k in {3, 5}  # 60 docs -> max K is max(3, 6) = 6, candidates <= 6 are 3, 5

    # Invariant 3: Document-topic distribution sums to 1.0 (±1e-3) for EVERY document
    doc_topic_matrix = np.array(result.doc_topic)
    assert doc_topic_matrix.shape == (60, result.selected_k)
    row_sums = doc_topic_matrix.sum(axis=1)
    for i, r_sum in enumerate(row_sums):
        assert abs(r_sum - 1.0) < 1e-3, f"Document {i} topic probabilities sum to {r_sum}, not 1.0!"

    # Invariant 4: Prevalence calculation
    # Mean of P(topic | document) across all docs
    total_prevalence = sum(t["prevalence"] for t in result.topics)
    assert abs(total_prevalence - 1.0) < 1e-3, f"Total prevalence is {total_prevalence}, should be ~1.0"

    # Invariant 5: Dominant issue count sum equals total documents
    total_dominant_issues = sum(t["dominant_issue_count"] for t in result.topics)
    assert total_dominant_issues == result.num_documents

    # Invariant 6: Auto labels format
    for topic in result.topics:
        label = topic["auto_label"]
        parts = label.split(" / ")
        assert len(parts) <= 3
        assert len(topic["top_words"]) == 15
        # Verify raw probabilities
        for tw in topic["top_words"]:
            assert 0.0 <= tw["probability"] <= 1.0


def test_manual_k_mode():
    """Verify manual K mode selects user-specified K while running sweep."""
    issues = generate_synthetic_issues(60)
    config = PipelineConfig(k_mode="manual", num_topics=4, seed=42, min_doc_length=5)

    result = run_lda_pipeline(issues, config)
    assert result.selected_k == 4
    assert len(result.topics) == 4
    # Sweep still ran and contains multiple candidates
    assert len(result.evaluation_results) > 1
