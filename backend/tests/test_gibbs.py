"""Unit tests for from-scratch Collapsed Gibbs Sampler and Hungarian matching (PRD §9.10)."""
import pytest
import numpy as np
from backend.lda.gibbs import CollapsedGibbsSampler
from backend.lda.evaluation import align_topics_hungarian


def test_gibbs_sampler_convergence_and_invariants():
    """Verify Collapsed Gibbs Sampler produces valid distributions."""
    D = 20
    V = 30
    K = 3
    rng = np.random.RandomState(42)

    # Synthetic corpus with 20 docs, each with 15 words
    corpus_words = [list(rng.randint(0, V, size=15)) for _ in range(D)]

    sampler = CollapsedGibbsSampler(num_topics=K, num_sweeps=100, seed=42)
    sampler.fit(corpus_words, vocab_size=V)

    assert sampler.phi is not None
    assert sampler.theta is not None

    # Check shapes
    assert sampler.phi.shape == (K, V)
    assert sampler.theta.shape == (D, K)

    # Invariant: Each row of phi (P(word | topic)) sums to 1.0 (±1e-5)
    phi_row_sums = sampler.phi.sum(axis=1)
    for k, s in enumerate(phi_row_sums):
        assert abs(s - 1.0) < 1e-4, f"Topic {k} phi does not sum to 1: {s}"

    # Invariant: Each row of theta (P(topic | doc)) sums to 1.0 (±1e-5)
    theta_row_sums = sampler.theta.sum(axis=1)
    for d, s in enumerate(theta_row_sums):
        assert abs(s - 1.0) < 1e-4, f"Document {d} theta does not sum to 1: {s}"


def test_hungarian_matching():
    """Verify Hungarian matching accurately aligns identical and permuted topic distributions."""
    K = 3
    V = 10
    # Create distinct topic vectors
    topic_matrix_a = np.array([
        [0.8, 0.2, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
        [0.0, 0.0, 0.9, 0.1, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
        [0.0, 0.0, 0.0, 0.0, 0.0, 0.7, 0.3, 0.0, 0.0, 0.0],
    ])
    # Permute topics: topic 0 -> 2, topic 1 -> 0, topic 2 -> 1
    topic_matrix_b = np.array([
        topic_matrix_a[1],
        topic_matrix_a[2],
        topic_matrix_a[0],
    ])

    match_result = align_topics_hungarian(topic_matrix_a, topic_matrix_b)
    assert match_result.mean_similarity > 0.99
    # Check aligned pairs: (0, 2), (1, 0), (2, 1)
    pairs = {(r, c) for r, c, _ in match_result.matched_pairs}
    assert (0, 2) in pairs
    assert (1, 0) in pairs
    assert (2, 1) in pairs
