"""Unit tests for Document-Term Representation and LDA Model (PRD §9.3 & §9.4)."""
import pytest
from backend.preprocessing.text_processor import ProcessedDocument
from backend.lda.model import (
    build_document_term_representation,
    InsufficientDataError,
    train_lda_model,
)


def make_dummy_doc(num: int, tokens: list[str]) -> ProcessedDocument:
    return ProcessedDocument(
        issue_number=num,
        raw="dummy raw text",
        cleaned="dummy cleaned text",
        tokenized=tokens,
        stopword_filtered=tokens,
        lemmatized=tokens,
    )


def test_insufficient_data_error():
    """Pipeline must raise InsufficientDataError when fewer than 50 usable documents remain."""
    # Only 30 docs
    docs = [
        make_dummy_doc(i, ["cuda", "memory", "allocation", "error", "tensor", "gpu"])
        for i in range(30)
    ]
    with pytest.raises(InsufficientDataError) as exc_info:
        build_document_term_representation(docs, min_doc_length=3)
    assert "minimum 50 after preprocessing" in str(exc_info.value)


def test_min_doc_length_filtering():
    """Documents with lemmatized tokens < min_doc_length should be dropped."""
    # Create 60 valid docs across 3 clusters so no word exceeds no_above=0.50
    docs = []
    vocab_a = ["cuda", "memory", "allocation", "driver", "gpu", "kernel"]
    vocab_b = ["tensor", "model", "layer", "gradient", "loss", "device"]
    vocab_c = ["docker", "container", "image", "linux", "build", "pip"]

    for i in range(60):
        if i % 3 == 0:
            words = vocab_a + [f"var_a_{i % 5}"]
        elif i % 3 == 1:
            words = vocab_b + [f"var_b_{i % 5}"]
        else:
            words = vocab_c + [f"var_c_{i % 5}"]
        docs.append(make_dummy_doc(i, words))

    short_docs = [
        make_dummy_doc(100 + i, ["short", "doc"])  # len 2 < min_doc_length 8
        for i in range(5)
    ]
    all_docs = docs + short_docs

    rep = build_document_term_representation(all_docs, min_doc_length=5)
    assert rep.num_issues_fetched == 65
    assert rep.num_documents == 60
    assert rep.num_dropped == 5


def test_protected_tokens_kept_in_filter_extremes():
    """Protected tokens must not be pruned by filter_extremes."""
    # 60 documents across 3 topics
    docs = []
    for i in range(60):
        if i < 20:
            tokens = ["tensor", "model", "layer", "train", "gradient", "loss"]
        elif i < 40:
            tokens = ["docker", "container", "image", "linux", "build", "wheel"]
        else:
            tokens = ["network", "packet", "socket", "client", "server", "port"]

        if i < 3:
            tokens.append("nan")  # Protected token with low frequency (< 5% of docs)
        if i < 25:
            tokens.append("cuda")  # Protected token
        docs.append(make_dummy_doc(i, tokens))

    rep = build_document_term_representation(docs, min_doc_length=5)
    assert "nan" in rep.dictionary.token2id
    assert "cuda" in rep.dictionary.token2id


def test_corpus_statistics_structure():
    """Corpus statistics must match the shape required by PRD §11.10."""
    docs = []
    for i in range(60):
        if i % 3 == 0:
            tokens = ["tensor", "model", "layer", "train", "gradient", "loss", "device", "gpu"]
        elif i % 3 == 1:
            tokens = ["docker", "container", "image", "linux", "build", "install", "pip", "wheel"]
        else:
            tokens = ["socket", "packet", "network", "client", "server", "port", "connect", "timeout"]
        docs.append(make_dummy_doc(i, tokens))

    rep = build_document_term_representation(docs, min_doc_length=5)
    stats = rep.corpus_stats

    assert stats["num_issues_fetched"] == 60
    assert stats["num_documents"] == 60
    assert stats["num_dropped"] == 0
    assert stats["vocab_size"] > 0
    assert stats["total_tokens"] > 0
    assert "top_terms" in stats
    assert len(stats["top_terms"]) <= 20
    assert "samples" in stats
    assert len(stats["samples"]) <= 10
    assert "document_term_matrix_preview" in stats
    assert "terms" in stats["document_term_matrix_preview"]
    assert "rows" in stats["document_term_matrix_preview"]
