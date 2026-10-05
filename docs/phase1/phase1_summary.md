# GitIssue — Phase 1 Academic & ML Foundation Summary Report

**Product:** GitIssue — NLP-powered GitHub Issue Topic Intelligence Platform  
**Version:** Phase 1 Complete (Implementation-Ready Academic Core)  
**Status:** Complete & Verified  

---

## 1. Executive Summary

Phase 1 establishes the complete, verified **academic and machine learning foundation** for GitIssue.
All components operate strictly in accordance with `PRD.md` (Version 2.0).
There is **one shared pure LDA pipeline** (`backend/lda/pipeline.py`) consumed identically by offline experiments, the demonstration notebook (`notebooks/phase1_lda_experiments.ipynb`), and the future Phase 2 analysis runner.

No Phase 2/3/4 components (FastAPI endpoints, Clerk auth, Supabase database, React frontend) have been implemented. The scope remains strictly focused on data ingestion, GitHub-aware preprocessing, vocabulary construction, LDA modeling, Gibbs sampling baseline, model evaluation, and unit testing.

---

## 2. Directory Structure Implemented

```text
Gitissue/
├── backend/
│   ├── config.py                  # Pydantic Settings configuration (PRD §17)
│   ├── requirements.txt           # Pinned dependencies for Python 3.11 (Gensim 4.3.3, NumPy 1.26.4, SciPy 1.12.0)
│   ├── .env.example               # Environment variables template
│   ├── preprocessing/
│   │   ├── __init__.py
│   │   ├── text_processor.py      # Steps 1–9 text cleaning, tokenization, POS filtering, lemmatization
│   │   ├── protected_terms.py     # 46 frozen technical terms and display casing map
│   │   └── stopwords.py           # Domain stopwords and template phrases
│   ├── lda/
│   │   ├── __init__.py
│   │   ├── model.py               # Gensim Dictionary, extremes filtering, BoW, LdaModel training
│   │   ├── inference.py           # Topic words, doc-topic distributions, prevalence, auto-labels
│   │   ├── evaluation.py          # C_v coherence, perplexity, K sweep, Hungarian topic alignment
│   │   ├── gibbs.py               # From-scratch Collapsed Gibbs Sampler (NumPy, MCMC)
│   │   └── pipeline.py            # run_lda_pipeline() — single pure entry point
│   ├── github/
│   │   ├── __init__.py
│   │   └── github_client.py       # REST API client with cursor pagination and rate-limit handling
│   ├── scripts/
│   │   ├── fetch_sample_issues.py # Sample issue fetcher for 3 benchmark datasets
│   │   └── run_phase1_experiments.py # Batch experiment runner generating docs/phase1 artifacts
│   └── tests/
│       ├── __init__.py
│       ├── test_preprocessing.py  # Cleaning, code stripping, protected terms, stopwords
│       ├── test_model.py          # Min doc length, extreme filtering, insufficient data (<50)
│       ├── test_pipeline.py       # Invariant verification, normalization, auto-labels, prevalence
│       └── test_gibbs.py          # Gibbs sampler invariants, shapes, Hungarian alignment
├── data/
│   └── samples/                   # Independent experimental corpora (PRD §20.2)
│       ├── pytorch_pytorch.json
│       ├── tensorflow_tensorflow.json
│       └── scikit-learn_scikit-learn.json
├── notebooks/
│   ├── build_notebook.py          # Generator for the Jupyter notebook
│   └── phase1_lda_experiments.ipynb # Full interactive experiment notebook
└── docs/
    └── phase1/
        ├── frozen_terms.md        # Frozen protected terms and domain stopwords baseline
        ├── k_sweep_results.md     # Cross-corpus K sweep evaluation tables
        ├── gibbs_comparison.md    # Variational Bayes vs Collapsed Gibbs Sampler comparison
        ├── phase1_summary.md      # This comprehensive summary report
        ├── corpora/               # Full preprocessed corpora JSON exports
        ├── corpus_stats_*.json    # Corpus statistics per repository
        ├── topic_words_*.csv      # Top-15 words with raw P(word|topic)
        ├── doc_topics_*.csv       # Document-topic distribution matrices
        └── interpretation_report_*.md # Topic interpretation reports
```

---

## 3. Pipeline Invariants & Mathematical Formulations

### 3.1 Preprocessing (PRD §9.1)
- **Step 1:** Raw text = `title + "\n" + body[:10000]`
- **Step 2:** Strip HTML tags, comments, fenced code blocks (``` and ~~~), inline code, indented code, stack-trace lines, markdown formatting, checkboxes, and template phrases. Link text is preserved.
- **Step 3:** URL removal (`http(s)://...`, `www....`).
- **Step 4:** Mentions (`@username`) and issue references (`#123`) removed.
- **Step 5:** Lowercased.
- **Step 6:** Non-alphanumeric characters stripped while preserving words; whitespace collapsed.
- **Step 7:** Tokenized via spaCy `en_core_web_sm` (`disable=["parser", "ner"]`).
- **Step 8:** Stopwords removed (NLTK English ∪ Domain Stopwords), token length filtered to $2 \le \text{len} \le 30$, pure numeric tokens dropped. Protected terms are **never removed**.
- **Step 9:** Lemmatized with POS filter `{NOUN, PROPN, VERB, ADJ}`. Protected terms bypass POS filtering and lemmatization.

### 3.2 Document-Term Representation (PRD §9.3)
- Retain documents with $\ge 8$ lemmatized tokens (`min_doc_length = 8`).
- Filter extremes: `no_below = max(3, ceil(0.01 * n_docs))`, `no_above = 0.50`, `keep_n = 5000`, `keep_tokens = protected_terms`.
- Re-express documents in in-vocabulary tokens; drop documents with $< 3$ tokens.
- Minimum data validation: if usable documents $< 50$, fail with `INSUFFICIENT_DATA`.

### 3.3 Variational Bayes LDA (PRD §9.4)
- Algorithm: Gensim `LdaModel` (single-process online variational Bayes). `LdaMulticore` is NOT used.
- Parameters: `passes = 15`, `iterations = 100`, `chunksize = 2000`, `alpha = "auto"`, `eta = "auto"`, `random_state = 42`.
- Selection Criterion: Candidate set $\{3, 5, 7, 10, 12, 15\}$ filtered by $K \le \max(3, N // 10)$. Selected $K$ maximizes $C_v$ topic coherence; ties broken by smaller $K$.

### 3.4 Invariants Verified (PRD §3.3 & §21)
1. **Document-Topic Row Normalization:**
   $$\sum_{k=1}^K P(\text{topic}_k \mid \text{doc}_d) = 1.0 \pm 10^{-3} \quad \forall d \in D$$
2. **Topic Prevalence:**
   $$\text{prevalence}_k = \frac{1}{|D|} \sum_{d \in D} P(\text{topic}_k \mid \text{doc}_d), \quad \sum_{k=1}^K \text{prevalence}_k \approx 1.0$$
3. **Dominant Topic Counts:**
   $$\sum_{k=1}^K \text{dominant\_issue\_count}_k = |D|$$
4. **Topic-Word Probabilities:**
   Raw $P(\text{word} \mid \text{topic})$ values are preserved for the top-15 words and NOT improperly normalized to 1.0.

### 3.5 Offline Collapsed Gibbs Sampler (PRD §9.10)
- Implemented from scratch in NumPy (`backend/lda/gibbs.py`).
- Hyperparameters: $\alpha = 50 / K$, $\beta = 0.01$, 1000 sweeps, random seed 42.
- Posterior estimates from final state:
  $$\phi_{k, w} = \frac{n_{kw} + \beta}{n_k + V \cdot \beta}, \quad \theta_{d, k} = \frac{n_{dk} + \alpha}{n_d + K \cdot \alpha}$$
- Model alignment: Hungarian algorithm (`scipy.optimize.linear_sum_assignment`) on cosine similarity of topic-word distributions.

---

## 4. Test Suite Execution

All 17 automated unit tests pass locally:
- `backend/tests/test_preprocessing.py`: 6 tests passing (Markdown, HTML, code fences, stack traces, URLs, mentions, protected terms preservation, stopwords).
- `backend/tests/test_model.py`: 4 tests passing (Insufficient data validation, min doc length filtering, protected term preservation in extreme filtering, corpus statistics shape).
- `backend/tests/test_pipeline.py`: 2 tests passing (End-to-end pipeline invariants, row sum normalization, auto-labels, prevalence, manual K mode).
- `backend/tests/test_gibbs.py`: 2 tests passing (Gibbs sampler convergence, distribution sum invariants, Hungarian topic matching).
- `backend/tests/test_github_client.py`: 3 tests passing (Cursor pagination, PR filtering, rate limit retry and backoff).
