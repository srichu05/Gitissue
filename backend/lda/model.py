"""Document-Term Representation and LDA Model training according to PRD §9.3 & §9.4."""
import math
from typing import List, Dict, Any, Tuple, Optional
from collections import Counter
from dataclasses import dataclass
from gensim.corpora import Dictionary
from gensim.models import LdaModel
from backend.preprocessing.protected_terms import PROTECTED_TERMS
from backend.preprocessing.text_processor import ProcessedDocument


class InsufficientDataError(Exception):
    """Raised when fewer than 50 usable documents remain after preprocessing."""
    def __init__(self, message: str = "Not enough usable issues to model topics (minimum 50 after preprocessing)"):
        super().__init__(message)
        self.code = "INSUFFICIENT_DATA"
        self.message = message


@dataclass
class CorpusRepresentation:
    """Document-term representation outputs and corpus statistics."""
    dictionary: Dictionary
    corpus: List[List[Tuple[int, int]]]
    kept_documents: List[ProcessedDocument]
    in_vocab_tokens_list: List[List[str]]
    num_issues_fetched: int
    num_documents: int
    num_dropped: int
    vocab_size: int
    corpus_stats: Dict[str, Any]


def build_document_term_representation(
    processed_docs: List[ProcessedDocument],
    min_doc_length: int = 8,
) -> CorpusRepresentation:
    """
    Construct Gensim Dictionary, filter extremes with protected token preservation,
    generate Bag-of-Words representation, and calculate corpus statistics (PRD §9.3 & §11.10).
    """
    num_issues_fetched = len(processed_docs)

    # Step 1: Filter documents with len(lemmatized) >= min_doc_length
    stage1_kept: List[ProcessedDocument] = [
        doc for doc in processed_docs if len(doc.lemmatized) >= min_doc_length
    ]

    # Step 2: Build Gensim Dictionary from lemmatized tokens
    dictionary = Dictionary([doc.lemmatized for doc in stage1_kept])

    # Step 3: filter_extremes with protected token preservation
    n_docs_stage1 = len(stage1_kept)
    no_below = max(3, math.ceil(0.01 * n_docs_stage1)) if n_docs_stage1 > 0 else 3
    keep_tokens = [t for t in PROTECTED_TERMS if t in dictionary.token2id]

    dictionary.filter_extremes(
        no_below=no_below,
        no_above=0.5,
        keep_n=5000,
        keep_tokens=keep_tokens,
    )

    # Step 4: Re-express documents using in-vocabulary tokens; drop if < 3 tokens
    final_kept_docs: List[ProcessedDocument] = []
    final_in_vocab_tokens: List[List[str]] = []

    for doc in stage1_kept:
        in_vocab = [t for t in doc.lemmatized if t in dictionary.token2id]
        if len(in_vocab) >= 3:
            final_kept_docs.append(doc)
            final_in_vocab_tokens.append(in_vocab)

    # Compactify dictionary
    dictionary.compactify()

    # Step 5: Bag-of-Words corpus
    corpus = [dictionary.doc2bow(tokens) for tokens in final_in_vocab_tokens]
    num_documents = len(final_kept_docs)
    num_dropped = num_issues_fetched - num_documents
    vocab_size = len(dictionary)

    # Step 6: Validate minimum document count
    if num_documents < 50:
        raise InsufficientDataError(
            f"Not enough usable issues to model topics (minimum 50 after preprocessing, got {num_documents})"
        )

    # Step 7: Corpus statistics calculation (PRD §11.10)
    term_counts: Counter = Counter()
    for bow in corpus:
        for tid, count in bow:
            term_counts[tid] += count

    total_tokens = sum(term_counts.values())
    avg_tokens_per_doc = round(total_tokens / num_documents, 1) if num_documents > 0 else 0.0

    doc_token_lengths = [sum(count for _, count in bow) for bow in corpus]
    min_tokens = min(doc_token_lengths) if doc_token_lengths else 0
    max_tokens = max(doc_token_lengths) if doc_token_lengths else 0

    # Top 20 terms by total count across corpus
    top_20_tid = [tid for tid, _ in term_counts.most_common(20)]
    top_terms = [
        {
            "term": dictionary[tid],
            "document_frequency": dictionary.dfs.get(tid, 0),
            "total_count": term_counts[tid],
        }
        for tid in top_20_tid
    ]

    # Top 15 terms for DTM preview
    top_15_tid = top_20_tid[:15]
    top_15_terms = [dictionary[tid] for tid in top_15_tid]

    # 10 most recent kept documents as samples (or all if < 10)
    sample_indices = list(range(min(10, num_documents)))
    sample_docs_preview = []
    dtm_rows = []

    for idx in sample_indices:
        doc = final_kept_docs[idx]
        tokens = final_in_vocab_tokens[idx]
        bow = corpus[idx]
        bow_dict = {dictionary[tid]: count for tid, count in bow}

        sample_docs_preview.append({
            "issue_number": doc.issue_number,
            "raw": doc.raw[:1000],
            "cleaned": doc.cleaned,
            "tokenized": doc.tokenized,
            "stopword_filtered": doc.stopword_filtered,
            "lemmatized": tokens,
            "bow": [{"term": dictionary[tid], "count": count} for tid, count in bow],
        })

        dtm_rows.append({
            "issue_number": doc.issue_number,
            "counts": [bow_dict.get(t, 0) for t in top_15_terms],
        })

    corpus_stats = {
        "num_issues_fetched": num_issues_fetched,
        "num_documents": num_documents,
        "num_dropped": num_dropped,
        "vocab_size": vocab_size,
        "total_tokens": total_tokens,
        "avg_tokens_per_doc": avg_tokens_per_doc,
        "min_tokens_per_doc": min_tokens,
        "max_tokens_per_doc": max_tokens,
        "top_terms": top_terms,
        "samples": sample_docs_preview,
        "document_term_matrix_preview": {
            "terms": top_15_terms,
            "rows": dtm_rows,
        },
    }

    return CorpusRepresentation(
        dictionary=dictionary,
        corpus=corpus,
        kept_documents=final_kept_docs,
        in_vocab_tokens_list=final_in_vocab_tokens,
        num_issues_fetched=num_issues_fetched,
        num_documents=num_documents,
        num_dropped=num_dropped,
        vocab_size=vocab_size,
        corpus_stats=corpus_stats,
    )


def train_lda_model(
    corpus: List[List[Tuple[int, int]]],
    dictionary: Dictionary,
    num_topics: int,
    seed: int = 42,
) -> LdaModel:
    """
    Train Gensim LdaModel with fixed hyperparameters (PRD §9.4).
    Uses online variational Bayes. LdaMulticore is NOT used.
    """
    model = LdaModel(
        corpus=corpus,
        id2word=dictionary,
        num_topics=num_topics,
        passes=15,
        iterations=100,
        chunksize=2000,
        alpha="auto",
        eta="auto",
        random_state=seed,
        per_word_topics=False,
        minimum_probability=0.0,
    )
    return model
