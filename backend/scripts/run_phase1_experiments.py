"""Phase 1 academic experiment runner for GitIssue (PRD §20.6 & §19)."""
import os
import json
import csv
import time
from pathlib import Path
from typing import Dict, Any, List

import numpy as np
from gensim.models import CoherenceModel

from backend.preprocessing.text_processor import process_issue_texts
from backend.lda.model import build_document_term_representation, train_lda_model
from backend.lda.pipeline import run_lda_pipeline, PipelineConfig, PipelineResult, IssueInput
from backend.lda.gibbs import CollapsedGibbsSampler
from backend.lda.evaluation import align_topics_hungarian, compute_coherence

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
DEFAULT_DOCS_DIR = PROJECT_ROOT / "docs" / "phase1"
DEFAULT_DATA_DIR = PROJECT_ROOT / "data" / "samples"

DATASETS = [
    ("pytorch", "pytorch", DEFAULT_DATA_DIR / "pytorch_pytorch.json"),
    ("tensorflow", "tensorflow", DEFAULT_DATA_DIR / "tensorflow_tensorflow.json"),
    ("scikit-learn", "scikit-learn", DEFAULT_DATA_DIR / "scikit-learn_scikit-learn.json"),
]


def run_experiments_for_dataset(
    owner: str,
    repo: str,
    json_path: Path,
    output_docs_dir: Path = DEFAULT_DOCS_DIR,
) -> Dict[str, Any]:
    """Run full LDA pipeline and Gibbs comparison for a single dataset."""
    repo_key = f"{owner}_{repo}"
    print(f"\n=======================================================")
    print(f"Running Phase 1 Experiments for {owner}/{repo}")
    print(f"=======================================================")

    with open(json_path, "r", encoding="utf-8") as f:
        raw_issues = json.load(f)

    print(f"Loaded {len(raw_issues)} raw issues.")

    issues_input = [
        IssueInput(
            number=item["number"],
            title=item.get("title", ""),
            body=item.get("body"),
            created_at=item.get("created_at_github"),
            github_issue_id=item.get("github_issue_id", 0),
        )
        for item in raw_issues
    ]

    docs_dir = Path(output_docs_dir)
    corpora_dir = docs_dir / "corpora"
    corpora_dir.mkdir(parents=True, exist_ok=True)

    # 1. Full Preprocessing & Deliverable 1 (Preprocessed corpus)
    print("Preprocessing texts for full corpus export...")
    processed_docs = process_issue_texts(issues_input, batch_size=64)
    corpus_export = [
        {
            "issue_number": doc.issue_number,
            "raw": doc.raw,
            "cleaned": doc.cleaned,
            "tokenized": doc.tokenized,
            "stopword_filtered": doc.stopword_filtered,
            "lemmatized": doc.lemmatized,
        }
        for doc in processed_docs
    ]
    with open(corpora_dir / f"{repo_key}_corpus.json", "w", encoding="utf-8") as f:
        json.dump(corpus_export, f, indent=2, ensure_ascii=False)
    print(f"Saved full preprocessed corpus to {corpora_dir / f'{repo_key}_corpus.json'}")

    # 2. Run standard LDA pipeline (Gensim Online Variational Bayes)
    t0_gensim = time.time()
    result: PipelineResult = run_lda_pipeline(
        issues=issues_input,
        config=PipelineConfig(k_mode="auto", seed=42, min_doc_length=8),
        progress_cb=lambda msg, cur, tot: print(f"  [{cur}%] {msg}"),
    )
    runtime_gensim = time.time() - t0_gensim

    print(f"Gensim Pipeline completed in {runtime_gensim:.2f}s:")
    print(f"  - Selected K: {result.selected_k}")
    print(f"  - C_v Coherence: {result.coherence_cv:.4f}")
    print(f"  - Perplexity: {result.perplexity:.2f}")
    print(f"  - Documents retained: {result.num_documents} (dropped {result.num_dropped})")
    print(f"  - Vocab size: {result.vocab_size}")

    # Save Corpus Statistics (Deliverable 2)
    with open(docs_dir / f"corpus_stats_{repo_key}.json", "w", encoding="utf-8") as f:
        json.dump(result.corpus_stats, f, indent=2, ensure_ascii=False)

    # Save Document-Topic CSV (Deliverable 5)
    doc_topics_csv_path = docs_dir / f"doc_topics_{repo_key}.csv"
    with open(doc_topics_csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["issue_number", "topic_index", "probability"])
        for doc_num, row in zip(result.documents, result.doc_topic):
            for t_idx, prob in enumerate(row):
                writer.writerow([doc_num, t_idx, round(prob, 4)])

    # Save Topic Words CSV
    topic_words_csv_path = docs_dir / f"topic_words_{repo_key}.csv"
    with open(topic_words_csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["topic_index", "display_label", "rank", "word", "probability"])
        for topic in result.topics:
            t_idx = topic["topic_index"]
            label = topic["auto_label"]
            for tw in topic["top_words"]:
                writer.writerow([t_idx, label, tw["rank"], tw["word"], round(tw["probability"], 4)])

    # 3. Offline Collapsed Gibbs Sampler (Deliverable 7)
    print("\nRunning offline from-scratch Collapsed Gibbs Sampler (NumPy)...")
    corpus_rep = build_document_term_representation(processed_docs, min_doc_length=8)
    dictionary = corpus_rep.dictionary
    docs_in_vocab = corpus_rep.in_vocab_tokens_list

    # Convert words to vocabulary IDs
    corpus_word_ids = [
        [dictionary.token2id[token] for token in doc if token in dictionary.token2id]
        for doc in docs_in_vocab
    ]

    selected_k = result.selected_k
    gibbs = CollapsedGibbsSampler(
        num_topics=selected_k,
        alpha=50.0 / selected_k,
        beta=0.01,
        num_sweeps=1000,
        seed=42,
    )
    t0_gibbs = time.time()
    gibbs.fit(
        corpus_words=corpus_word_ids,
        vocab_size=len(dictionary),
        progress_cb=lambda msg, cur, tot: print(f"  Gibbs: {msg}"),
    )
    runtime_gibbs = time.time() - t0_gibbs

    # Gibbs Coherence calculation
    gibbs_topics_words = gibbs.get_top_words(dictionary, topn=15)
    cm_gibbs = CoherenceModel(
        topics=gibbs_topics_words,
        texts=docs_in_vocab,
        dictionary=dictionary,
        coherence="c_v",
        processes=1,
    )
    gibbs_coherence_cv = float(cm_gibbs.get_coherence())
    print(f"Gibbs Sampler completed in {runtime_gibbs:.2f}s:")
    print(f"  - C_v Coherence: {gibbs_coherence_cv:.4f}")

    # 4. Hungarian Matching & Alignment between Gensim and Gibbs
    selected_lda = train_lda_model(corpus_rep.corpus, dictionary, num_topics=selected_k, seed=42)
    gensim_topic_words_matrix = selected_lda.get_topics()
    gensim_topic_words_matrix = gensim_topic_words_matrix / gensim_topic_words_matrix.sum(axis=1, keepdims=True)

    gibbs_phi = gibbs.phi  # shape (K, V)

    alignment = align_topics_hungarian(gensim_topic_words_matrix, gibbs_phi)
    print(f"Hungarian Topic Alignment Mean Cosine Similarity: {alignment.mean_similarity:.4f}")

    # Build and Save Topic Interpretation Report (Deliverable 6)
    report_md_path = docs_dir / f"interpretation_report_{repo_key}.md"
    with open(report_md_path, "w", encoding="utf-8") as f:
        f.write(f"# Topic Interpretation Report: {owner}/{repo}\n\n")
        f.write(f"- **Repository:** `{owner}/{repo}`\n")
        f.write(f"- **Analysis Date:** 2026-10-04 (Phase 1 Baseline)\n")
        f.write(f"- **Total Issues Fetched:** {result.num_issues_fetched}\n")
        f.write(f"- **Retained Documents:** {result.num_documents} (dropped {result.num_dropped})\n")
        f.write(f"- **Vocabulary Size:** {result.vocab_size}\n")
        f.write(f"- **Selected Topics (K):** {result.selected_k}\n")
        f.write(f"- **C_v Coherence:** {result.coherence_cv:.4f}\n")
        f.write(f"- **Training Perplexity:** {result.perplexity:.2f}\n")
        f.write(f"- **Inference:** Online Variational Bayes (Gensim `LdaModel`)\n\n")
        f.write("## Discovered Topics\n\n")

        for topic in result.topics:
            t_idx = topic["topic_index"]
            label = topic["auto_label"]
            prev = topic["prevalence"] * 100
            dom_count = topic["dominant_issue_count"]
            f.write(f"### Topic {t_idx + 1}: {label}\n")
            f.write(f"- **Prevalence:** {prev:.1f}% of corpus\n")
            f.write(f"- **Dominant Issues Count:** {dom_count}\n")
            f.write(f"- **Top 15 Terms:**\n\n")
            f.write("| Rank | Word | P(word \\| topic) |\n|---|---|---|\n")
            for tw in topic["top_words"]:
                f.write(f"| {tw['rank']} | `{tw['word']}` | {tw['probability']:.4f} |\n")
            f.write("\n")

    return {
        "repo": f"{owner}/{repo}",
        "repo_key": repo_key,
        "result": result,
        "runtime_gensim": runtime_gensim,
        "runtime_gibbs": runtime_gibbs,
        "gibbs_coherence_cv": gibbs_coherence_cv,
        "alignment": alignment,
        "gibbs_topics_words": gibbs_topics_words,
    }


def run_all():
    """Run experiments across all three datasets and produce consolidated docs."""
    DEFAULT_DOCS_DIR.mkdir(parents=True, exist_ok=True)

    all_results = []
    for owner, repo, json_path in DATASETS:
        res = run_experiments_for_dataset(owner, repo, json_path, output_docs_dir=DEFAULT_DOCS_DIR)
        all_results.append(res)

    # 1. Generate consolidated K-Sweep Results Table
    with open(DEFAULT_DOCS_DIR / "k_sweep_results.md", "w", encoding="utf-8") as f:
        f.write("# GitIssue Phase 1 — K Sweep Results\n\n")
        f.write("Candidate evaluation across benchmark corpora ({3, 5, 7, 10, 12, 15} filtered by `K <= max(3, n_docs // 10)`).\n\n")
        for res in all_results:
            repo_name = res["repo"]
            r: PipelineResult = res["result"]
            f.write(f"## Repository: `{repo_name}`\n")
            f.write(f"- Total Analyzed Documents: {r.num_documents}\n")
            f.write(f"- Selected K: **{r.selected_k}** (Best by C_v Coherence: {r.best_k_by_coherence})\n\n")
            f.write("| Candidate K | C_v Coherence | Log Perplexity Bound | Derived Perplexity |\n")
            f.write("|---|---|---|---|\n")
            for row in r.evaluation_results:
                sel_marker = " **(Selected)**" if row["k"] == r.selected_k else ""
                f.write(f"| {row['k']}{sel_marker} | {row['coherence_cv']:.4f} | {row['log_perplexity_bound']:.4f} | {row['perplexity']:.2f} |\n")
            f.write("\n")

    # 2. Generate consolidated Gibbs vs Gensim Comparison Table
    with open(DEFAULT_DOCS_DIR / "gibbs_comparison.md", "w", encoding="utf-8") as f:
        f.write("# GitIssue Phase 1 — Gensim vs Collapsed Gibbs Sampler Comparison\n\n")
        f.write("Academic comparison between **Online Variational Bayes** (Gensim `LdaModel`) and from-scratch **Collapsed Gibbs Sampler** (NumPy) (PRD §9.10, D-02).\n\n")
        f.write("| Repository | Selected K | Gensim Coherence (C_v) | Gibbs Coherence (C_v) | Gensim Runtime (s) | Gibbs Runtime (s) | Hungarian Mean Cosine Sim |\n")
        f.write("|---|---|---|---|---|---|---|\n")
        for res in all_results:
            repo_name = res["repo"]
            r: PipelineResult = res["result"]
            f.write(f"| `{repo_name}` | {r.selected_k} | {r.coherence_cv:.4f} | {res['gibbs_coherence_cv']:.4f} | {res['runtime_gensim']:.2f} | {res['runtime_gibbs']:.2f} | {res['alignment'].mean_similarity:.4f} |\n")

        f.write("\n## Topic Alignment Details (Hungarian Matching)\n\n")
        for res in all_results:
            repo_name = res["repo"]
            f.write(f"### `{repo_name}`\n\n")
            f.write("| Gensim Topic Index | Gibbs Topic Index | Cosine Similarity |\n")
            f.write("|---|---|---|\n")
            for ga, gb, sim in res["alignment"].matched_pairs:
                f.write(f"| Topic {ga + 1} | Topic {gb + 1} | {sim:.4f} |\n")
            f.write("\n")

    print("\nPhase 1 experiment execution complete! All artifacts generated.")


if __name__ == "__main__":
    run_all()
