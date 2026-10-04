# GitIssue — Product Requirements Document (PRD)

**Product:** GitIssue — NLP-powered GitHub Issue Topic Intelligence Platform
**Version:** 2.0 (implementation-ready; supersedes v1.0 draft)
**Status:** Final. No open questions remain.
**Audience:** A coding agent (or engineer) implementing GitIssue end to end without further clarification.

---

## 0. How to Read This Document

- **MUST / MUST NOT** mean mandatory. Everything in this PRD is in scope for v1 unless it appears under **Non-Goals (§3.2)**. There are no "optional" or "P1/P2" items.
- **Decision IDs (D-01 … D-30)** in §1 are final choices. Where a decision resolved an ambiguity from the earlier draft or the project context document, it is tagged inline, e.g. *(D-05)*.
- If two sections ever appear to conflict, **§1 (Decisions Register) wins**, then §10 (Data Model), then §11 (API).
- All timestamps are UTC, ISO-8601 with `Z`. All identifiers exposed by the API are UUIDs unless stated.

---

## 1. Final Decisions Register

| ID | Topic | Final decision |
|---|---|---|
| D-01 | **LDA inference (production)** | Gensim `LdaModel` (single process), which uses **online variational Bayes**. `LdaMulticore` is NOT used (it does not support `alpha="auto"`). |
| D-02 | **Sampling-based component (academic)** | A from-scratch **collapsed Gibbs sampler** (`backend/lda/gibbs.py`, NumPy) is implemented and run **offline only** (Phase 1 notebook and report) on the three sample datasets, to compare against Gensim variational inference. It is NOT exposed through the API or UI. The UI explainer text accurately describes both methods. |
| D-03 | **Trend aggregation** | **Probability-weighted mean**: for each calendar month (UTC, by issue `created_at`), prevalence of topic k = mean of P(topic k given issue) over issues created that month. Each month's values sum to 1. |
| D-04 | **Overall topic prevalence** | Mean of P(topic k given issue) across all documents in the analysis. Displayed as "% of corpus". Additionally `dominant_issue_count` = number of documents whose argmax topic is k. |
| D-05 | **K selection** | Every analysis runs a **K sweep** over candidate set {3, 5, 7, 10, 12, 15} (plus the user's K in manual mode), filtered to K ≤ max(3, num_documents // 10). Selection criterion: highest **C_v coherence**; ties go to the smaller K. **Default mode is `auto`.** In `manual` mode the user's K (3–15) is the final model, and the sweep still runs so evaluation results are always available. |
| D-06 | **Perplexity** | Reported for information only (training-corpus perplexity, `2^(-bound)` where `bound = lda.log_perplexity(corpus)`). It is NEVER used to select K. |
| D-07 | **Final model = sweep model** | Sweep models use the same hyperparameters as the final model, so the selected-K sweep model IS the final model (no retraining). Only the best/selected model is kept in memory; others are discarded after metrics are computed. |
| D-08 | **Topic labels** | **Heuristic only, no LLM.** `auto_label` = top 3 words of the topic, display-cased and joined with `" / "`. Users may set an editable `human_label` (1–60 chars). `display_label = human_label ?? auto_label`. |
| D-09 | **Issue body retention** | Issue **bodies are never persisted**. They are processed in memory and discarded. The database stores issue metadata and titles only. Up to 10 truncated raw samples (≤1000 chars each) live inside `analyses.corpus_stats`. |
| D-10 | **Analysis retention** | Analyses are kept until the user deletes them. No automatic expiry. Deleting an analysis cascades to its topics, words, and distributions; if the repository then has no analyses left for that user, the repository and its issue rows are deleted too. |
| D-11 | **Model persistence** | The trained Gensim model is NOT persisted. Analyses are immutable result snapshots (config + seed + stored outputs). The database never runs ML. |
| D-12 | **When issues are fetched** | Issues are fetched in the **FETCHING stage of the analysis job**, after the user clicks Start. Before that, only repository metadata is validated. (This resolves the earlier journey ordering "Fetch Issues → Configure".) |
| D-13 | **GitHub fetch caching** | No caching. Every analysis fetches fresh from GitHub. |
| D-14 | **Background execution** | FastAPI `BackgroundTasks` running a synchronous function in the thread pool, one Uvicorn worker. Global concurrency limit 2 (`threading.BoundedSemaphore`); waiting tasks stay `QUEUED`. Per-user limit: 1 active analysis, 10 analyses started per rolling hour. |
| D-15 | **Restart recovery** | On backend startup, every analysis in a non-terminal state is set to `FAILED` with `error_code = SERVER_RESTARTED`. |
| D-16 | **Cancel / re-run** | No cancel endpoint and no re-run endpoint in v1. Users start a new analysis. Active analyses cannot be deleted (409). |
| D-17 | **Auth verification** | Backend verifies Clerk session JWTs with **PyJWT + Clerk JWKS** (cached). `CLERK_SECRET_KEY` from the context document is therefore **not required** and is removed from backend env vars. Required: `CLERK_JWKS_URL`, `CLERK_ISSUER`. |
| D-18 | **Clerk methods** | Email/password, Google, and GitHub OAuth are all enabled in the Clerk dashboard. |
| D-19 | **User record** | `users` stores `clerk_user_id` and `created_at` only (no email). Row is created on the user's first authenticated request. |
| D-20 | **Authorization failures** | Accessing another user's resource returns **404 `NOT_FOUND`** (never 403), to avoid leaking existence. |
| D-21 | **DB access** | SQLAlchemy 2.x sync engine + `psycopg2-binary`, Alembic migrations, Supabase connection string via `SUPABASE_DATABASE_URL`. RLS is **enabled on all tables with no policies** (blocks Supabase's public API); the backend's DB role bypasses RLS, and authorization is enforced in backend code. |
| D-22 | **Charts** | **Recharts only** for all charts. **D3 is not used.** |
| D-23 | **Motion libraries** | **Framer Motion** for page transitions, card interactions, chart entrances, and the progress stepper. **GSAP** only for the landing-page hero topic-node animation. `prefers-reduced-motion` disables both. |
| D-24 | **Three.js / 3D topic space / topic-similarity viz** | **Excluded from v1** (moved to Future Work). Three.js and D3 are NOT dependencies. |
| D-25 | **Server state on frontend** | TanStack Query for data fetching and 2-second polling. React Router v6 for routing. |
| D-26 | **Perplexity/coherence library calls** | Coherence: Gensim `CoherenceModel(coherence="c_v", processes=1)` over in-vocabulary tokenized texts. |
| D-27 | **Language** | English only. No language detection; non-English issues are not filtered (documented limitation). |
| D-28 | **Deployment** | Frontend on Vercel; backend on Render Web Service (Starter plan or higher, no sleeping; free tier only for development); Supabase Postgres; Clerk Cloud. Render config via `render.yaml`; Vercel via `vercel.json` SPA rewrite. |
| D-29 | **Demo data** | No seed-data feature. Demo = the three Phase 1 sample repositories analyzed through the live app by the project owner, plus exported reports and screenshots in `docs/`. |
| D-30 | **Exports** | One export endpoint serving four types: Topic Interpretation Report (Markdown, JSON), topic-words CSV, document-topic CSV. |

---

## 2. Product Overview

GitIssue is a full-stack platform that analyzes issues from a public GitHub repository and discovers its main discussion themes with **Latent Dirichlet Allocation (LDA)**. The user submits a repository URL; the system validates it, fetches issues through the GitHub REST API, preprocesses text, builds a Bag-of-Words representation, runs a K sweep, trains the selected LDA model, and presents the results in an interactive analytics dashboard.

**Positioning statement**

> GitIssue is an NLP-powered topic intelligence platform that applies probabilistic Latent Dirichlet Allocation to real-world GitHub issue collections, transforming unstructured developer discussions into interpretable topic distributions, representative issues, and temporal insights through an interactive full-stack dashboard.

**Pipeline**

```
GitHub URL → Validate → [Start] → Fetch Issues → Preprocess → Dictionary + Bag-of-Words
→ K Sweep (LDA + coherence) → Select Final Model → Topic-Word P(word | topic)
→ Document-Topic P(topic | document) → Prevalence + Auto Labels → Persist → Dashboard
```

**Two-layer framing**

| Layer | Scope |
|---|---|
| Academic / ML core | Preprocessing → Document-Term Representation → LDA → Topic-Word Distribution → Document-Topic Distribution → Probabilistic Interpretation → Evaluation (+ offline Gibbs comparison) |
| Engineering / product | GitHub API → FastAPI → Supabase → Clerk → React Dashboard → Vercel/Render deployment |

LDA MUST NEVER be presented as a deterministic classifier. All UI copy and documentation describe topics as probability distributions and assignments as probabilistic estimates.

---

## 3. Problem, Goals, Non-Goals, Success Metrics

### 3.1 Problem

Open-source repositories accumulate hundreds or thousands of issues. Maintainers must read them manually to learn what users complain about, which themes dominate, which are emerging, and which issues represent each theme. GitIssue answers these automatically.

### 3.2 Goals and Non-Goals

**Goals (all in scope):**
1. Validate a public GitHub repository URL and show repository summary.
2. Fetch issues (excluding pull requests) with pagination and rate-limit handling.
3. Preprocess issue text with a GitHub-aware NLP pipeline.
4. Build and expose Gensim Dictionary and Bag-of-Words outputs.
5. Select K by evidence (coherence sweep) or accept a manual K.
6. Train LDA; expose P(word | topic) and P(topic | document).
7. Provide heuristic auto-labels plus editable human labels, visibly distinguished from probabilistic output.
8. Provide dashboard, topic detail, issue detail, trends, evaluation, and corpus/model views.
9. Persist per-user analysis history with export.
10. Deliver all 10 academic deliverables (§19).

**Non-Goals (v1):**
- Private repositories; GitHub OAuth for repo access.
- Webhooks, live updates, scheduled re-analysis.
- Supervised classification or writing labels back to GitHub.
- Comparing multiple repositories in one analysis.
- Issue comments in the corpus (issue title + body only).
- Distributed job queue (Celery/RQ), analysis cancel/re-run.
- LLM-generated labels; language detection.
- Three.js 3D view and D3 visualizations (D-24).
- Account-deletion webhooks / automated data purge on Clerk account deletion.

### 3.3 Success Metrics

| Area | Metric | Target |
|---|---|---|
| Correctness | Each document's topic probabilities sum to 1.0 (±1e-3) | 100% of stored documents |
| Correctness | Each month's trend values sum to 1.0 (±1e-3) | 100% of months |
| Quality | C_v coherence reported for every K in sweep | Always present in `evaluation_results` |
| Performance | End-to-end analysis, 500 issues, Render Starter | ≤ 5 minutes |
| Performance | Result endpoints (stored data) | < 500 ms p95 |
| UX | UI never frozen during analysis | Stage + progress updates at least every 2 s |
| Reliability | Invalid/private/rate-limited/insufficient-data cases | Always a clear error message |
| Academic | Deliverables completed | 10 / 10 |

---

## 4. Target Users

| User | Goal |
|---|---|
| Open-source developers | Understand recurring issues in their repositories |
| Project maintainers | High-level view of community discussions |
| Developers / researchers | Explore topic discovery on real software-engineering data |
| Students / evaluators | Demonstrate and understand LDA practically |

---

## 5. Core User Flow (final)

```
Sign in → Home (history) → Analyze Repository: enter URL → Validate (metadata only)
→ Configure (K mode, issue state, max issues, min doc length) → Start Analysis
→ Progress page (QUEUED → FETCHING → PREPROCESSING → TRAINING → ANALYZING → COMPLETED | FAILED)
→ Dashboard → Explore Topic → Explore Issue → Trends / Evaluation / Corpus & Model → Export
```

---

## 6. Technology Stack and Dependencies (final)

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TypeScript (strict), Tailwind CSS, React Router v6, TanStack Query, `@clerk/clerk-react`, Recharts, Framer Motion, GSAP |
| Frontend testing | Vitest + React Testing Library |
| Backend | Python 3.11, FastAPI, Uvicorn, Pydantic v2 + `pydantic-settings`, SQLAlchemy 2.x, Alembic, `psycopg2-binary`, `httpx`, `PyJWT[crypto]` |
| NLP / ML | spaCy (`en_core_web_sm`), NLTK (stopwords), Pandas, NumPy, Gensim 4.3.x (`LdaModel`, `CoherenceModel`), scikit-learn + SciPy (topic matching in `lda/evaluation.py` only) |
| Backend testing | pytest, `respx` (mock httpx), FastAPI `TestClient` |
| Database | Supabase PostgreSQL |
| Auth | Clerk (Cloud) |
| Deployment | Vercel (frontend), Render (backend), Supabase, Clerk |

Version pinning rule: pin exact versions in `requirements.txt` / `package.json` lockfiles; choose a Gensim 4.3.x + NumPy + SciPy combination that installs and passes tests on Python 3.11 (verify in Phase 1 and do not change afterwards).

---

## 7. System Architecture and Repository Layout

```
Browser ── React/Vite (Vercel) ── Clerk (sign-in, session JWT)
   │  HTTPS, Authorization: Bearer <Clerk JWT>
   ▼
FastAPI (Render, 1 Uvicorn worker) ──► GitHub REST API (server-side token)
   │ BackgroundTasks → analysis_runner → lda.pipeline
   ▼
Supabase PostgreSQL (results only)
```

### 7.1 Monorepo Layout

```
gitissue/
├── backend/
│   ├── main.py                    # app factory, CORS, routers, startup recovery (D-15)
│   ├── config.py                  # pydantic-settings (env vars, §17)
│   ├── schemas.py                 # Pydantic request/response models
│   ├── api/
│   │   ├── auth.py                # JWT verification dependency, user provisioning
│   │   ├── repositories.py        # validate, analyze
│   │   ├── analysis.py            # analyses CRUD/status/trends/evaluation/corpus/export
│   │   ├── topics.py              # topic detail/label edit/representative issues
│   │   └── issues.py              # issue detail
│   ├── github/
│   │   └── github_client.py
│   ├── preprocessing/
│   │   ├── text_processor.py
│   │   ├── protected_terms.py     # protected terms + display-case map
│   │   └── stopwords.py           # NLTK + domain stopwords + template phrases
│   ├── lda/
│   │   ├── model.py               # Gensim dictionary/BoW/LdaModel training
│   │   ├── inference.py           # topic-word, doc-topic, prevalence, labels
│   │   ├── evaluation.py          # coherence, perplexity, K sweep, topic matching
│   │   ├── gibbs.py               # offline collapsed Gibbs sampler (D-02)
│   │   └── pipeline.py            # run_lda_pipeline(): single pure entry point
│   ├── services/
│   │   └── analysis_runner.py     # job orchestration, status updates, persistence
│   ├── database/
│   │   ├── database.py            # engine, session
│   │   └── models.py              # SQLAlchemy models
│   ├── alembic/ + alembic.ini     # 0001_initial migration
│   ├── scripts/fetch_sample_issues.py
│   ├── tests/
│   └── requirements.txt
├── frontend/
│   ├── src/{pages,components,hooks,lib,styles}/
│   ├── vercel.json                # SPA rewrite to /index.html
│   └── package.json
├── notebooks/phase1_lda_experiments.ipynb
├── data/samples/                  # fetched JSON for the 3 sample repos (D-29)
├── docs/                          # documentation, report, screenshots, exported reports
├── render.yaml
├── .env.example (frontend/ and backend/)
└── README.md
```

### 7.2 Single Pipeline Entry Point

`lda/pipeline.py` exposes `run_lda_pipeline(issues: list[IssueInput], config: PipelineConfig, progress_cb) -> PipelineResult`. It is used by BOTH the Phase 1 notebook and the Phase 2 job runner, guaranteeing the academic and production paths are identical.

- `IssueInput`: `number, title, body, created_at (datetime), github_issue_id`.
- `PipelineConfig`: `k_mode, num_topics|None, min_doc_length, seed=42`, plus fixed hyperparameters from §9.4.
- `PipelineResult`: `documents` (kept issue numbers), `num_issues_fetched`, `num_dropped`, `vocab_size`, `corpus_stats` (§11.10 shape), `evaluation_results` (list), `selected_k`, `coherence_cv`, `perplexity`, `hyperparameters`, `topics` (index, auto_label, prevalence, dominant_issue_count, top_words[15]), `doc_topic` (matrix aligned to kept issue numbers, each row sums to 1).

---

## 8. Functional Requirements

### 8.1 Authentication
- FR-AUTH-1: Sign up, sign in, sign out via Clerk (email/password, Google, GitHub OAuth) *(D-18)*.
- FR-AUTH-2: All frontend routes under `/app` are protected; unauthenticated users are redirected to `/sign-in`.
- FR-AUTH-3: Every backend endpoint except `GET /health` requires a valid Clerk JWT *(D-17)*.
- FR-AUTH-4: On first valid request the backend creates a `users` row keyed by `clerk_user_id` *(D-19)*.
- FR-AUTH-5: Users can only access their own analyses *(D-20)*.

### 8.2 Repository Validation
- FR-REPO-1: Accept GitHub URLs matching `^https?://(www\.)?github\.com/([A-Za-z0-9_.-]+)/([A-Za-z0-9_.-]+?)(\.git)?(/.*)?$`; extra path segments are ignored. Host MUST be `github.com` (SSRF guard). Shorthand `owner/repo` is NOT accepted.
- FR-REPO-2: Call `GET /repos/{owner}/{repo}`; return `full_name, owner, name, description, html_url, stars, forks, open_issues_count`.
- FR-REPO-3: UI labels `open_issues_count` as **"Open issues + PRs"** (GitHub's count includes pull requests).
- FR-REPO-4: Errors per §11.12 (invalid URL, not found/private, rate limited, GitHub unavailable).

### 8.3 Analysis Configuration

| Field | Type / range | Default | Notes |
|---|---|---|---|
| `k_mode` | `"auto"` \| `"manual"` | `"auto"` | *(D-05)* |
| `num_topics` | int 3–15 | 5 (shown only in manual) | Required iff `k_mode = "manual"`; MUST be null in auto |
| `issue_state` | `"open"` \| `"closed"` \| `"all"` | `"all"` | |
| `max_issues` | int 50–1000 | 500 | Server cap `MAX_ISSUES_CAP` (default 1000); counts issues after PR filtering |
| `min_doc_length` | int 3–100 (tokens) | 8 | Minimum lemmatized tokens per document |

- FR-CFG-1: UI shows an "Auto-select K (recommended)" toggle, on by default. Turning it off reveals a K slider (3–15).
- FR-CFG-2: Server validates all fields (Pydantic) and rejects violations with 422 `VALIDATION_ERROR`.
- FR-CFG-3: No other preprocessing options are user-configurable in v1 (protected terms, stopwords, filtering thresholds are fixed per §9).

### 8.4 Data Collection
- FR-DATA-1: Collect per issue: GitHub issue ID, number, title, body, state, labels (names), author login, created/updated/closed dates, comments count, HTML URL.
- FR-DATA-2: Exclude items containing a `pull_request` key.
- FR-DATA-3: LDA document text = `title + "\n" + body`; body truncated to the first 10,000 characters before processing; empty body → title only.
- FR-DATA-4: Fetching rules in §14.
- FR-DATA-5: Persist issue metadata + title (never body) *(D-09)*.

### 8.5 Preprocessing, Document-Term Representation, LDA
Specified exactly in §9. Requirements:
- FR-NLP-1: Pipeline stages and parameters in §9.1–9.3 are mandatory and fixed.
- FR-NLP-2: Corpus statistics and per-stage samples are stored in `analyses.corpus_stats` (§11.10).
- FR-NLP-3: K sweep, selection, and metrics per §9.5.
- FR-NLP-4: Outputs per §9.6–9.8.

### 8.6 Topic Interpretation
- FR-INT-1: Every topic has `auto_label` (D-08) and optional `human_label`; API returns `display_label` and `label_source` (`"auto"` | `"human"`).
- FR-INT-2: UI visually separates **Model output** (top words, probabilities, prevalence) from **Interpretation** (label). Labeled sections: "Model output (probabilities)" and "Interpretation (editable label)". Auto labels carry an "Auto" badge; edited labels an "Edited" badge.
- FR-INT-3: Label editing happens only on the Topic Detail page (`PATCH /api/topics/{id}`).

### 8.7 Dashboard and Exploration
- FR-DASH-1: Overview strip: repository, issues analyzed (`num_documents`), topics discovered (`num_topics`), analysis date, model config (K mode, K, passes, iterations).
- FR-DASH-2: Topic distribution chart (prevalence per topic).
- FR-DASH-3: Topic cards: display label, top 5 keywords, prevalence %, "Explore Topic".
- FR-DASH-4: Topic detail: top 15 words with probabilities, 10 representative issues (paginated "Load more"), prevalence, editable label.
- FR-DASH-5: Issue detail: number, title, state, labels, author, dates, comments count, topic distribution chart, "View on GitHub".
- FR-DASH-6: Trends tab (§9.9).
- FR-DASH-7: Evaluation tab: coherence and perplexity vs K, selected K and best-by-coherence K highlighted.
- FR-DASH-8: Corpus & Model tab: corpus statistics, preprocessing stage samples, Bag-of-Words sample, document-term matrix preview, hyperparameters.
- FR-DASH-9: History on Home: list of analyses with open and delete actions.
- FR-DASH-10: Export menu (§11.11).
- FR-DASH-11: "How to read these results" explainer panel (§15.5).

### 8.8 Job Processing
Lifecycle, limits, and recovery in §12.

---

## 9. NLP / LDA Specification (exact)

### 9.1 Text Cleaning and Tokenization

Applied per issue in this exact order. Intermediate outputs are captured for corpus samples.

| # | Step | Detail |
|---|---|---|
| 1 | Build raw text | `title + "\n" + body[:10000]` → **`raw`** |
| 2 | HTML / Markdown cleanup | Strip HTML comments `<!-- -->`, HTML tags, fenced code blocks (``` and ~~~), inline code, indented code blocks, stack-trace lines (lines starting with `at `, `File "`, `Traceback`, or matching `\w+Error:` followed by a frame), markdown links → keep link text only, images removed, markdown emphasis/heading/list/table symbols, task-list checkboxes (`- [ ]`, `- [x]`), template phrases from `stopwords.py` (e.g., "describe the bug", "to reproduce", "steps to reproduce", "expected behavior", "actual behavior", "environment", "additional context", "screenshots") |
| 3 | URL removal | Remove `http(s)://…` and `www.…` |
| 4 | Mention removal | Remove `@username` mentions and `#123` issue references |
| 5 | Lowercase | |
| 6 | Special-character removal | Replace everything except letters, digits, spaces, and `+`/`#`/`.` inside protected terms with spaces; collapse whitespace → **`cleaned`** |
| 7 | Tokenization | spaCy `en_core_web_sm` (parser and NER disabled: `disable=["parser","ner"]`; tagger, attribute ruler, lemmatizer enabled) → **`tokenized`** (token texts) |
| 8 | Stopword removal | Remove tokens in NLTK English stopwords ∪ domain stopwords, tokens with length < 2 or > 30, and purely numeric tokens. **Protected terms are never removed** → **`stopword_filtered`** |
| 9 | Lemmatization + POS filter | Keep tokens with POS in `{NOUN, PROPN, VERB, ADJ}`; use `token.lemma_`; protected terms are kept as-is (not lemmatized, POS filter bypassed) → **`lemmatized`** (final tokens) |

Notes:
- spaCy is run once per document on the `cleaned` text; `tokenized`, `stopword_filtered`, and `lemmatized` are derived from the same `Doc`.
- Use `nlp.pipe(texts, batch_size=64)`. Load the spaCy model and NLTK stopwords once at process start.

### 9.2 Protected Terms and Stopwords (files, frozen at end of Phase 1)

- `protected_terms.py` exports `PROTECTED_TERMS` (lowercase set) and `DISPLAY_CASE` (map for label casing). Initial protected set (extend only during Phase 1, then freeze and document in `docs/`): `cuda, cudnn, gpu, cpu, tpu, tensorflow, pytorch, keras, numpy, pandas, sklearn, python, java, javascript, typescript, rust, golang, docker, kubernetes, linux, windows, macos, ios, android, npm, pip, conda, git, github, api, sdk, cli, gui, json, yaml, xml, http, https, ssl, tls, sql, aws, gcp, azure, onnx, llm, nan`.
- `DISPLAY_CASE` examples: `gpu→GPU, cuda→CUDA, api→API, tensorflow→TensorFlow, pytorch→PyTorch, python→Python, docker→Docker, macos→macOS, ios→iOS, npm→npm`. Words absent from the map use `str.capitalize()`.
- Domain stopwords (initial, frozen after Phase 1): `issue, issues, please, thanks, thank, hello, hi, hey, would, could, should, also, like, get, got, make, want, try, tried, seem, seems, thing, way, use, using, used, work, working`. Template phrases (§9.1 step 2) live in the same file.

### 9.3 Document-Term Representation

1. Documents = kept issues with `len(lemmatized) ≥ min_doc_length`; others are dropped (counted in `num_dropped`).
2. Build `gensim.corpora.Dictionary` from lemmatized token lists.
3. `dictionary.filter_extremes(no_below=max(3, ceil(0.01 * n_docs)), no_above=0.5, keep_n=5000, keep_tokens=[protected terms present in dictionary])`.
4. Re-express each document using in-vocabulary tokens only; drop documents with fewer than 3 in-vocabulary tokens (counted in `num_dropped`); call `dictionary.compactify()`.
5. `corpus = [dictionary.doc2bow(doc) for doc in docs]`.
6. If `n_docs < 50` after step 4 → job fails with `INSUFFICIENT_DATA` ("Not enough usable issues to model topics (minimum 50 after preprocessing)").
7. Corpus statistics (§11.10) are computed here.

### 9.4 LDA Model (fixed hyperparameters)

| Parameter | Value |
|---|---|
| Class | `gensim.models.LdaModel` (D-01) |
| `num_topics` | K (from sweep or manual) |
| `passes` | 15 |
| `iterations` | 100 |
| `chunksize` | 2000 |
| `alpha` | `"auto"` |
| `eta` | `"auto"` |
| `random_state` | 42 |
| `per_word_topics` | False |
| `minimum_probability` (when querying) | 0.0 |

Stored in `analyses.hyperparameters`: `{"inference": "gensim_lda_online_variational_bayes", "passes": 15, "iterations": 100, "chunksize": 2000, "alpha": "auto", "eta": "auto", "random_state": 42, "alpha_learned": [..K floats..]}`.

### 9.5 K Sweep and Selection (D-05, D-06, D-07, D-26)

1. `n_docs` known after §9.3. Candidates `C = {3,5,7,10,12,15}`; in manual mode `C ∪= {K_user}`; filter to `K ≤ max(3, n_docs // 10)` but ALWAYS keep `K_user` in manual mode (add a warning `"K_exceeds_recommended"` if `K_user > n_docs // 10`).
2. For each K in ascending order: train `LdaModel` with §9.4; compute `coherence_cv` via `CoherenceModel(model, texts=docs_in_vocab, dictionary, coherence="c_v", processes=1)`; compute `log_perplexity_bound = lda.log_perplexity(corpus)` and `perplexity = 2 ** (-bound)`.
3. Selection: auto mode → K with max `coherence_cv` (tie → smaller K). Manual mode → `K_user`. `best_k_by_coherence` is recorded in both modes.
4. Keep the selected model in memory; discard the others after recording metrics.
5. Store the list in `analyses.evaluation_results` (§11.9 shape); store the selected model's `coherence_cv` and `perplexity` in the analysis columns.

### 9.6 Topic-Word Distributions
`lda.show_topic(k, topn=15)` → list of `(word, probability)`. Stored in `topic_words` with rank 1–15. These are the top-15 words only; they do not sum to 1 (UI note: "Top 15 of the full word distribution").

### 9.7 Document-Topic Distributions
`lda.get_document_topics(bow, minimum_probability=0.0)` for every kept document → K probabilities, renormalized to sum exactly 1. All K rows per document are stored in `issue_topic_distributions`.

### 9.8 Prevalence, Labels
- `prevalence_k = mean over documents of θ[d,k]` (D-04); `dominant_issue_count_k = count of documents with argmax = k`.
- `auto_label = " / ".join(display_case(w) for w in top3_words)` (D-08), e.g., `GPU / Error / Memory`.
- Topics are returned ordered by `prevalence` descending. `topic_index` is the Gensim topic id (0-based); the UI shows `Topic {topic_index+1}` only as small secondary text.

### 9.9 Trend Analysis (D-03)
- Computed on demand in SQL from `issue_topic_distributions` joined to `issues.created_at_github`.
- Month key: `to_char(date_trunc('month', created_at_github AT TIME ZONE 'UTC'), 'YYYY-MM')`.
- For each month and topic: `AVG(probability)`; response includes `issue_count` per month. Months with zero issues are omitted.
- `sufficient = (number of distinct months ≥ 3)`. If false the UI shows the empty state "Not enough time span for trends (needs at least 3 months of issues)."
- Months with `issue_count < 5` are drawn with a dashed marker and a tooltip note "Low sample".

### 9.10 Offline Gibbs Sampler (D-02)
- `gibbs.py`: collapsed Gibbs sampler, `alpha = 50/K`, `beta = 0.01`, 1000 sweeps, seed 42, estimates from the final state: `phi[k,w] = (n_kw + beta)/(n_k + V*beta)`, `theta[d,k] = (n_dk + alpha)/(n_d + K*alpha)`.
- Run in the notebook for each of the 3 sample datasets using the K selected by the Gensim sweep.
- Comparison reported in the academic report (Deliverable 7): C_v coherence of each model, runtime, and **topic alignment** = Hungarian matching (`scipy.optimize.linear_sum_assignment`) on cosine similarity (`sklearn.metrics.pairwise.cosine_similarity`) of topic-word vectors over the shared vocabulary, reporting mean matched similarity.

---

## 10. Data Model (Supabase PostgreSQL)

All PKs are `uuid default gen_random_uuid()` unless noted. All FKs `ON DELETE CASCADE`. RLS enabled on every table, no policies (D-21). Migration: Alembic `0001_initial`.

```
users 1─* repositories 1─* issues
users 1─* analyses *─1 repositories
analyses 1─* topics 1─* topic_words
analyses 1─* issue_topic_distributions *─1 issues ; *─1 topics
```

**users**
| Column | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| clerk_user_id | text | UNIQUE NOT NULL |
| created_at | timestamptz | NOT NULL default now() |

**repositories**
| Column | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK users NOT NULL |
| github_repo_id | bigint | NOT NULL |
| owner, name, full_name | text | NOT NULL |
| html_url | text | NOT NULL |
| description | text | NULL |
| stars, forks, open_issues_count | int | NOT NULL |
| created_at, updated_at | timestamptz | NOT NULL default now() |
| | | UNIQUE (user_id, github_repo_id) |

**issues** (no body column, D-09)
| Column | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| repository_id | uuid | FK repositories NOT NULL |
| github_issue_id | bigint | NOT NULL |
| number | int | NOT NULL |
| title | text | NOT NULL |
| state | text | CHECK in ('open','closed') |
| labels | jsonb | NOT NULL default '[]' (array of label name strings) |
| author | text | NULL |
| comments_count | int | NOT NULL default 0 |
| created_at_github, updated_at_github | timestamptz | NOT NULL |
| closed_at_github | timestamptz | NULL |
| html_url | text | NOT NULL |
| fetched_at | timestamptz | NOT NULL default now() |
| | | UNIQUE (repository_id, github_issue_id); INDEX (repository_id, number) |

Issues are upserted on `(repository_id, github_issue_id)`; the latest fetch overwrites metadata.

**analyses**
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK users NOT NULL |
| repository_id | uuid | FK repositories NOT NULL |
| status | text | CHECK in (QUEUED, FETCHING, PREPROCESSING, TRAINING, ANALYZING, COMPLETED, FAILED) |
| progress_percent | smallint | 0–100, default 0 |
| status_message | text | human-readable current step |
| error_code, error_message | text | NULL unless FAILED |
| warnings | jsonb | default '[]' (array of `{code, message}`) |
| config | jsonb | NOT NULL: `{k_mode, num_topics, issue_state, max_issues, min_doc_length}` |
| hyperparameters | jsonb | NULL until training (§9.4) |
| num_topics | smallint | NULL until selected K known |
| num_issues_fetched | int | NULL until fetched |
| num_documents | int | documents in the final corpus |
| num_dropped | int | fetched issues excluded from corpus |
| vocab_size | int | |
| coherence_cv | double precision | selected model |
| perplexity | double precision | selected model |
| evaluation_results | jsonb | §11.9 `results` array |
| corpus_stats | jsonb | §11.10 |
| created_at | timestamptz | NOT NULL default now() |
| started_at, completed_at | timestamptz | NULL |
| | | INDEX (user_id, created_at DESC); INDEX (repository_id) |

**topics**
| Column | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| analysis_id | uuid | FK analyses NOT NULL |
| topic_index | smallint | NOT NULL |
| auto_label | text | NOT NULL |
| human_label | text | NULL (1–60 chars when set) |
| prevalence | double precision | NOT NULL |
| dominant_issue_count | int | NOT NULL |
| | | UNIQUE (analysis_id, topic_index) |

**topic_words**
| Column | Type | Constraints |
|---|---|---|
| id | bigint | identity PK |
| topic_id | uuid | FK topics NOT NULL |
| rank | smallint | 1–15 |
| word | text | NOT NULL |
| probability | double precision | NOT NULL |
| | | UNIQUE (topic_id, rank) |

**issue_topic_distributions**
| Column | Type | Constraints |
|---|---|---|
| id | bigint | identity PK |
| analysis_id | uuid | FK analyses NOT NULL |
| issue_id | uuid | FK issues NOT NULL |
| topic_id | uuid | FK topics NOT NULL |
| probability | double precision | CHECK between 0 and 1 |
| | | UNIQUE (analysis_id, issue_id, topic_id); INDEX (topic_id, probability DESC); INDEX (analysis_id, issue_id) |

**Retention rules (D-10):** no automatic expiry. `DELETE /api/analyses/{id}` removes the analysis (cascade). In the same transaction, if the repository has no remaining analyses, delete the repository (cascading its issues).

---

## 11. API Specification

Base path `/api`. Auth: `Authorization: Bearer <Clerk JWT>` on everything except `GET /health` (returns `{"status":"ok"}`, no DB check). JSON only. CORS restricted to `ALLOWED_ORIGINS`. Results endpoints (11.4–11.11) return **409 `ANALYSIS_NOT_COMPLETED`** unless `status = COMPLETED`. Another user's resource → 404 `NOT_FOUND` (D-20).

### 11.1 Validate Repository
`POST /api/repositories/validate`
```json
// request
{ "url": "https://github.com/owner/repo" }
// 200 response
{
  "owner": "owner", "name": "repo", "full_name": "owner/repo",
  "description": "…", "html_url": "https://github.com/owner/repo",
  "stars": 1234, "forks": 210, "open_issues_count": 87
}
```
Stateless: writes nothing to the database.

### 11.2 Start Analysis
`POST /api/repositories/analyze`
```json
// request
{
  "url": "https://github.com/owner/repo",
  "config": {
    "k_mode": "auto", "num_topics": null,
    "issue_state": "all", "max_issues": 500, "min_doc_length": 8
  }
}
// 202 response
{ "analysis_id": "uuid", "status": "QUEUED" }
```
Behavior: re-validate repository; upsert `repositories` row; enforce per-user limits (else 429 `ANALYSIS_LIMIT_REACHED`); insert `analyses` row (`QUEUED`); schedule background job.

### 11.3 List / Get / Delete Analyses
- `GET /api/analyses?limit=20&offset=0` → `{ "items": [AnalysisSummary], "total": 12, "limit": 20, "offset": 0 }`, newest first. `AnalysisSummary`: `id, status, progress_percent, repository_full_name, k_mode, num_topics, num_documents, created_at, completed_at`.
- `GET /api/analyses/{id}` → `Analysis` (valid in any status; unfilled fields are `null`):
```json
{
  "id": "uuid",
  "status": "COMPLETED",
  "progress_percent": 100,
  "status_message": "Analysis complete",
  "error_code": null, "error_message": null,
  "warnings": [{ "code": "FETCH_TRUNCATED", "message": "…" }],
  "repository": {
    "id": "uuid", "owner": "owner", "name": "repo", "full_name": "owner/repo",
    "html_url": "…", "stars": 1234, "forks": 210, "open_issues_count": 87
  },
  "config": { "k_mode": "auto", "num_topics": null, "issue_state": "all", "max_issues": 500, "min_doc_length": 8 },
  "hyperparameters": { "inference": "gensim_lda_online_variational_bayes", "passes": 15, "iterations": 100,
                       "chunksize": 2000, "alpha": "auto", "eta": "auto", "random_state": 42, "alpha_learned": [0.21, 0.18] },
  "num_topics": 7,
  "num_issues_fetched": 500, "num_documents": 462, "num_dropped": 38, "vocab_size": 3120,
  "coherence_cv": 0.52, "perplexity": 812.4,
  "created_at": "2026-10-03T10:00:00Z", "started_at": "2026-10-03T10:00:01Z", "completed_at": "2026-10-03T10:03:10Z"
}
```
- `DELETE /api/analyses/{id}` → 204; 409 `ANALYSIS_ACTIVE` if status is not COMPLETED/FAILED.

### 11.4 Topics of an Analysis
`GET /api/analyses/{id}/topics` → ordered by prevalence desc:
```json
{
  "topics": [{
    "id": "uuid", "analysis_id": "uuid", "topic_index": 0,
    "auto_label": "GPU / Error / Memory",
    "human_label": "GPU / Memory Errors",
    "display_label": "GPU / Memory Errors",
    "label_source": "human",
    "prevalence": 0.28, "dominant_issue_count": 131,
    "top_words": [{ "rank": 1, "word": "error", "probability": 0.084 }]
  }]
}
```
`top_words` always contains 15 entries.

### 11.5 Topic Detail and Label Edit
- `GET /api/topics/{id}` → single topic object (same shape as 11.4).
- `PATCH /api/topics/{id}` body `{ "human_label": "GPU / Memory Errors" }` (trimmed, 1–60 chars) or `{ "human_label": null }` to reset → returns updated topic object. Allowed only when the analysis is COMPLETED.

### 11.6 Representative Issues
`GET /api/topics/{id}/issues?limit=10&offset=0` (limit ≤ 50) — ordered by `probability DESC, number DESC`:
```json
{
  "items": [{ "id": "uuid", "number": 1421, "title": "GPU memory allocation failure",
              "state": "open", "probability": 0.72, "html_url": "https://github.com/…" }],
  "total": 462, "limit": 10, "offset": 0
}
```

### 11.7 Trends
`GET /api/analyses/{id}/trends`
```json
{
  "method": "probability_weighted_mean", "granularity": "month", "sufficient": true,
  "series": [{
    "month": "2026-01", "issue_count": 42,
    "topics": [{ "topic_id": "uuid", "prevalence": 0.18 }]
  }]
}
```
Each month's `prevalence` values sum to 1 (±1e-3). Series ordered ascending by month.

### 11.8 Issue Detail
`GET /api/issues/{id}?analysis_id={analysis_id}` (`analysis_id` required)
```json
{
  "id": "uuid", "number": 1421, "title": "…", "state": "open",
  "labels": ["bug", "gpu"], "author": "octocat", "comments_count": 5,
  "created_at_github": "…", "updated_at_github": "…", "closed_at_github": null,
  "html_url": "https://github.com/…",
  "distribution": [{ "topic_id": "uuid", "topic_index": 0, "display_label": "GPU / Memory Errors", "probability": 0.72 }]
}
```
`distribution` contains all K topics sorted by probability desc. 404 `ISSUE_NOT_IN_ANALYSIS` if the issue was not part of that analysis' corpus.

### 11.9 Evaluation
`GET /api/analyses/{id}/evaluation`
```json
{
  "k_mode": "auto", "selected_k": 7, "best_k_by_coherence": 7,
  "criterion": "c_v_coherence",
  "results": [{ "k": 3, "coherence_cv": 0.41, "log_perplexity_bound": -9.67, "perplexity": 814.2 }],
  "note": "K is chosen by C_v coherence; perplexity is training-set and informational only."
}
```

### 11.10 Corpus and Model Statistics
`GET /api/analyses/{id}/corpus-stats` (served from `analyses.corpus_stats`)
```json
{
  "num_issues_fetched": 500, "num_documents": 462, "num_dropped": 38,
  "vocab_size": 3120, "total_tokens": 41230, "avg_tokens_per_doc": 89.2,
  "min_tokens_per_doc": 8, "max_tokens_per_doc": 612,
  "top_terms": [{ "term": "error", "document_frequency": 120, "total_count": 310 }],
  "samples": [{
    "issue_number": 1421,
    "raw": "CUDA crashes when training the model… (≤1000 chars)",
    "cleaned": "…", "tokenized": ["…"], "stopword_filtered": ["…"], "lemmatized": ["cuda","crash","training","model"],
    "bow": [{ "term": "cuda", "count": 2 }]
  }],
  "document_term_matrix_preview": {
    "terms": ["python","error","gpu","api","memory"],
    "rows": [{ "issue_number": 1421, "counts": [2,1,0,1,0] }]
  }
}
```
Rules: `top_terms` = 20 terms by total count; `samples` = the 10 most recent kept documents; DTM preview = those same 10 documents × the 15 highest-total-count terms (the example above shows 5 for brevity).

### 11.11 Exports (D-30)
`GET /api/analyses/{id}/export?type=report_md|report_json|topic_words_csv|doc_topics_csv`
- Returns the file with `Content-Disposition: attachment; filename="gitissue-{owner}-{repo}-{first8ofId}-{type}.{ext}"`.
- `report_md` / `report_json` = **Topic Interpretation Report**: per topic → topic number, display label and label source, top words with probabilities, prevalence, dominant issue count, 5 representative issues (number, title, probability, URL); header with repository, analysis date, config, hyperparameters, K, coherence, perplexity.
- `topic_words_csv` columns: `topic_index,display_label,rank,word,probability`.
- `doc_topics_csv` columns: `issue_number,topic_index,probability` (long format, all K rows per issue).
- The frontend downloads via authenticated `fetch` → Blob.

### 11.12 Error Format and Codes
```json
{ "error": { "code": "REPO_NOT_FOUND", "message": "Repository not found or is not public.", "retry_after_seconds": null } }
```

| HTTP | Code | When |
|---|---|---|
| 400 | `INVALID_URL` | URL does not match FR-REPO-1 |
| 401 | `UNAUTHENTICATED` | Missing/invalid/expired token |
| 404 | `NOT_FOUND` | Resource missing or owned by another user |
| 404 | `REPO_NOT_FOUND` | GitHub 404 (nonexistent, deleted, or private) |
| 404 | `ISSUE_NOT_IN_ANALYSIS` | Issue not in that analysis' corpus |
| 409 | `ANALYSIS_ACTIVE` | Delete requested while running |
| 409 | `ANALYSIS_NOT_COMPLETED` | Results requested before completion |
| 422 | `VALIDATION_ERROR` | Request body/query validation failed |
| 422 | `REPO_UNAVAILABLE` | GitHub 403/451 not caused by rate limiting |
| 429 | `ANALYSIS_LIMIT_REACHED` | >1 active analysis or >10 started in the last hour |
| 429 | `GITHUB_RATE_LIMITED` | GitHub rate limit; includes `retry_after_seconds` |
| 502 | `GITHUB_UNAVAILABLE` | GitHub 5xx after retries |
| 500 | `INTERNAL_ERROR` | Unexpected error |

Analysis-level failure codes stored in `analyses.error_code`: `REPO_NOT_FOUND, REPO_UNAVAILABLE, GITHUB_RATE_LIMITED, GITHUB_UNAVAILABLE, INSUFFICIENT_DATA, SERVER_RESTARTED, INTERNAL_ERROR`. Warning codes in `analyses.warnings`: `FETCH_TRUNCATED, FETCH_PARTIAL_RATE_LIMIT, K_EXCEEDS_RECOMMENDED`.

---

## 12. Analysis Job Lifecycle

```
QUEUED → FETCHING → PREPROCESSING → TRAINING → ANALYZING → COMPLETED
   └──────────────────────────(any stage)──────────────────► FAILED
```

| Status | Progress % | Work |
|---|---|---|
| QUEUED | 0 | Row created; waiting for the concurrency semaphore (D-14) |
| FETCHING | 5 → 30 (proportional to issues fetched / `max_issues`) | GitHub pagination, PR filtering, upsert repository + issue metadata; set `num_issues_fetched` |
| PREPROCESSING | 30 → 45 | §9.1–9.3: clean, tokenize, filter, dictionary, BoW, corpus stats |
| TRAINING | 45 → 85 (advance per K in sweep) | §9.5 sweep: train + coherence + perplexity per K; select final model |
| ANALYZING | 85 → 99 | §9.6–9.8: topic words, doc-topic, prevalence, labels; persist everything in **one DB transaction** |
| COMPLETED | 100 | `completed_at` set |
| FAILED | unchanged | `error_code`, `error_message` set; partial child rows (topics, distributions) never persisted because persistence is transactional |

Rules:
- `status_message` is updated at each stage and sub-step (e.g., "Fetched 300 of 500 issues", "Training K=7 (3 of 6)").
- The runner is a synchronous function using its own DB session; it updates status in short committed transactions.
- Per-user limits and 429 behavior: D-14. Startup recovery: D-15.
- Frontend polls `GET /api/analyses/{id}` every 2 s until `COMPLETED` or `FAILED`.

---

## 13. Authentication and Security

- Frontend: `ClerkProvider`; `useAuth().getToken()` attached as Bearer on every API call.
- Backend (D-17): FastAPI dependency in `api/auth.py` fetches/caches JWKS from `CLERK_JWKS_URL` (cache 1 hour, refetch on unknown `kid`), verifies RS256 signature, `iss == CLERK_ISSUER`, `exp`/`nbf`, and that `azp` (if present) is in `ALLOWED_ORIGINS`. `sub` → `clerk_user_id`; create `users` row if absent.
- Authorization: every query is scoped by `user_id` (D-20).
- Secrets: `GITHUB_TOKEN` and DB URL are server-side only; never logged; never committed; `.env.example` files contain keys only.
- SSRF: only `github.com` URLs; the backend calls only `https://api.github.com` with parsed `owner`/`repo`.
- Rendering: all GitHub-sourced text (titles, labels) rendered as text via React (no `dangerouslySetInnerHTML`).
- Limits: per-user analysis limits (D-14); `max_issues` server cap.
- Transport: HTTPS only in production; CORS allowlist; no cookies used for API auth.
- Logging: structured JSON logs including `analysis_id`, stage, duration; no tokens or issue text in logs.

---

## 14. GitHub Integration

Client: `httpx` with headers `Authorization: Bearer {GITHUB_TOKEN}`, `Accept: application/vnd.github+json`, `X-GitHub-Api-Version: 2022-11-28`; timeout 20 s.

**Fetch algorithm**
1. `GET /repos/{owner}/{repo}/issues?state={state}&sort=created&direction=desc&per_page=100&page={n}`.
2. Skip items with `pull_request`. Collect until `max_issues` reached, pages exhausted, or **30 pages scanned** (hard stop for PR-heavy repos).
3. If the stop was due to the 30-page limit or `max_issues` with more available → add warning `FETCH_TRUNCATED`.
4. Retry 5xx and network errors up to 3 times (backoff 1 s, 2 s, 4 s) → then `GITHUB_UNAVAILABLE`.
5. Rate limit (403/429 with `x-ratelimit-remaining: 0` or `retry-after`): if ≥ 50 issues already collected → proceed with them and add warning `FETCH_PARTIAL_RATE_LIMIT`; otherwise fail with `GITHUB_RATE_LIMITED` (`retry_after_seconds` from `retry-after` or `x-ratelimit-reset`).
6. 404 → `REPO_NOT_FOUND`; other 403/451 → `REPO_UNAVAILABLE`.
7. Empty bodies (`null`/empty) → title only.

No caching (D-13). `open_issues_count` semantic noted in FR-REPO-3.

---

## 15. Frontend Specification

### 15.1 Routes

| Route | Page | Auth |
|---|---|---|
| `/` | Landing | public |
| `/sign-in/*`, `/sign-up/*` | Clerk components | public |
| `/app` | Home: analysis history + "New analysis" | protected |
| `/app/analyze` | Repository input → validation summary → configuration → Start | protected |
| `/app/analyses/:analysisId` | Progress (if not terminal) or Dashboard (if COMPLETED) or error (if FAILED); tabs via `?tab=topics\|trends\|evaluation\|corpus` (default `topics`) | protected |
| `/app/analyses/:analysisId/topics/:topicId` | Topic Detail | protected |
| `/app/analyses/:analysisId/issues/:issueId` | Issue Detail | protected |

Unknown routes → 404 page. After successful Start, navigate to `/app/analyses/:id`.

### 15.2 Screens

- **Landing:** headline "GitIssue", subtitle "Understand what your GitHub community is talking about.", tagline "Analyze GitHub issues using probabilistic topic modeling.", CTA "Analyze Repository" (→ `/app/analyze`, forcing sign-in). Hero: GSAP-animated drifting topic nodes (SVG), restrained, ≤ 8 s loop, disabled under `prefers-reduced-motion`.
- **Home:** table/cards of analyses (repo, status badge, K, documents, date) with Open and Delete (confirm dialog); empty state with CTA.
- **Analyze:** URL field + Analyze button → on success shows repo card (owner/name, description, stars, forks, "Open issues + PRs") → configuration form (§8.3) → Start Analysis. Inline error messages per §11.12 codes.
- **Progress:** stepper of the 5 stages with current stage highlighted, progress bar (`progress_percent`), `status_message`, warnings list. FAILED state shows `error_message` and a "Start new analysis" button.
- **Dashboard:** overview strip → export menu → tabs:
  - *Topics*: topic distribution bar chart + topic cards grid (+ explainer panel).
  - *Trends*: stacked area chart by month with topic toggle legend; empty/insufficient state per §9.9.
  - *Evaluation*: line chart coherence vs K with selected K and best-K markers + table of K / coherence / perplexity.
  - *Corpus & Model*: statistics cards, preprocessing sample viewer (select sample → shows raw → cleaned → tokenized → stopword-filtered → lemmatized), Bag-of-Words sample, DTM preview table, hyperparameters list.
- **Topic Detail:** back link; display label with Auto/Edited badge and edit control; prevalence ("28% of corpus", plus dominant issue count); word-probability horizontal bar chart (top 15); representative issues list (10, "Load more") linking to Issue Detail.
- **Issue Detail:** title, number, state, labels, author, dates, comments, "View on GitHub" (new tab, `rel="noopener noreferrer"`); distribution horizontal bar chart showing the top 5 topics and a single aggregated **"Other"** bar for the remainder (computed client-side); table of all K probabilities available under "Show all".

### 15.3 Charts (Recharts only, D-22)

| Chart | Type |
|---|---|
| Topic distribution | Horizontal bar (prevalence) |
| Word probabilities | Horizontal bar |
| Issue topic distribution | Horizontal bar |
| Trends | Stacked area (values sum to 1 per month) |
| Evaluation | Line (coherence vs K) |

Rules: topic color is determined by `topic_index` from a fixed 15-color colorblind-safe palette and is identical across all views; direct data labels or text legends (never color alone); every chart has an `aria-label` summary; percentages formatted to 1 decimal; probabilities to 3 decimals.

### 15.4 Motion (D-23)
Framer Motion: route fade/slide (≤ 200 ms), card hover/press, bar/area entrance (≤ 400 ms), stepper transitions. GSAP: landing hero only. Honor `prefers-reduced-motion`. Animations never delay data display.

### 15.5 Explainer Panel Content (required copy points)
1. Topics are probability distributions over words; documents are mixtures of topics — P(word | topic) and P(topic | document).
2. LDA estimates latent topic assignments by probabilistic inference; it is not a classifier.
3. GitIssue uses Gensim's **online variational Bayes** inference, which approximates the posterior; a collapsed **Gibbs sampler** draws samples from the same posterior and is used in the project report for comparison.
4. Labels are heuristic suggestions (top words) or user-edited interpretations; they are not model output.

### 15.6 Cross-cutting UX
Loading skeletons, empty states, and error states on every data view; responsive down to 360 px width (single-column on mobile; desktop primary); single light theme; WCAG AA contrast; keyboard-operable controls; TanStack Query handles caching and polling (`refetchInterval: 2000` while non-terminal, else off).

---

## 16. Non-Functional Requirements

| Category | Requirement |
|---|---|
| Performance | §3.3 targets; spaCy runs with parser/NER disabled; one model in memory at a time; backend memory < 512 MB for 1000 issues |
| Reliability | No silent failures; every failure sets `error_code`/`error_message`; startup recovery (D-15) |
| Reproducibility | Fixed seed 42; config + hyperparameters stored per analysis (note: reproducibility holds for identical GitHub data) |
| Scalability | Single backend instance; migration path to Celery/RQ without API change |
| Observability | Structured logs (stage, duration, counts) |
| Maintainability | Module layout per §7.1; type hints; Ruff + Black (backend), ESLint + Prettier (frontend) |
| Accessibility | §15.3, §15.6 |
| API docs | FastAPI OpenAPI at `/docs` (enabled in all environments) |

---

## 17. Environment Variables (final)

**Frontend (`frontend/.env.example`)**
```
VITE_CLERK_PUBLISHABLE_KEY=
VITE_API_BASE_URL=            # e.g. http://localhost:8000 (dev), https://<service>.onrender.com (prod)
```

**Backend (`backend/.env.example`)**
```
SUPABASE_DATABASE_URL=        # postgresql+psycopg2://USER:PASSWORD@HOST:5432/postgres (Supabase session-mode pooler)
GITHUB_TOKEN=                 # server-side only; public_repo read access is sufficient
CLERK_JWKS_URL=               # https://<clerk-domain>/.well-known/jwks.json
CLERK_ISSUER=                 # https://<clerk-domain>
ALLOWED_ORIGINS=              # comma-separated, e.g. http://localhost:5173,https://gitissue.vercel.app
MAX_ISSUES_CAP=1000
MAX_CONCURRENT_ANALYSES=2
MAX_ANALYSES_PER_USER_PER_HOUR=10
LOG_LEVEL=INFO
```
`CLERK_SECRET_KEY` is intentionally absent (D-17). Never commit real values.

---

## 18. Deployment (D-28)

| Component | Platform | Configuration |
|---|---|---|
| Frontend | Vercel | Root `frontend/`, build `npm run build`, output `dist`, `vercel.json` rewrites all paths to `/index.html`; env vars from §17 |
| Backend | Render Web Service, Starter plan or higher | `render.yaml`: root `backend/`; build `pip install -r requirements.txt && python -m nltk.downloader stopwords` (spaCy `en_core_web_sm` pinned in `requirements.txt` via its release wheel URL); start `alembic upgrade head && uvicorn main:app --host 0.0.0.0 --port $PORT --workers 1`; health check `/health` |
| Database | Supabase Postgres | Migrations by Alembic only; use the session-mode pooler URL; RLS enabled with no policies (D-21) |
| Auth | Clerk Cloud | Production instance; allowed origins include the Vercel domain; email/password + Google + GitHub OAuth enabled |

Production checklist: env vars set on both platforms; CORS origin matches the Vercel domain; first deploy runs migrations; end-to-end smoke test (AC-01) passes against production.

---

## 19. Academic Deliverables and Traceability

| # | Deliverable | Produced by | Where to find it |
|---|---|---|---|
| 1 | Preprocessed corpus (raw, cleaned, tokenized, stopword-filtered, lemmatized) | `text_processor.py`; Phase 1 notebook saves full corpora for the 3 sample datasets to `docs/phase1/corpora/`; app stores 10 samples per analysis | Notebook outputs; Dashboard → Corpus & Model |
| 2 | Document-term representation (vocabulary, BoW, DTM, corpus statistics) | `lda/model.py` (§9.3) | Phase 1 notebook; `corpus-stats` endpoint; Corpus & Model tab |
| 3 | Trained LDA model (K, passes, iterations, hyperparameters, config, output) | `lda/model.py` (§9.4) | `analyses.hyperparameters/config`; Corpus & Model tab; report |
| 4 | Topic-word lists with probabilities | `lda/inference.py` (§9.6) | Topic cards/detail; `topic_words_csv` export |
| 5 | Document-topic distributions | `lda/inference.py` (§9.7) | Issue detail; `doc_topics_csv` export |
| 6 | Topic Interpretation Report | Export `report_md`/`report_json` (§11.11) | Dashboard → Export |
| 7 | Model evaluation: coherence/perplexity across K; Gensim-vs-Gibbs comparison | `lda/evaluation.py`, `gibbs.py` (§9.5, §9.10) | Evaluation tab; Phase 1 notebook; project report |
| 8 | Visualizations | Frontend charts §15.3 (topic distribution, top words, word probabilities, document-topic distribution, trends, representative issues) | Dashboard, Topic/Issue pages |
| 9 | Interactive web application | Phases 2–3, deployed in Phase 4 | Production URL |
| 10 | Technical documentation | Phase 4 | `README.md` and `docs/` |

**Required documentation (Deliverable 10):** README (setup/run/test/deploy), system architecture, data flow, API documentation (OpenAPI + this PRD's §11), database schema, LDA methodology (including variational vs Gibbs explanation), preprocessing methodology (frozen protected/stopword lists), model evaluation, deployment instructions, limitations, future work.

---

## 20. Four-Phase Development Plan

### Phase 1 — NLP & LDA Core
**Goal:** Validate the academic component offline.
Tasks:
1. Scaffold `backend/` with `config.py`, `requirements.txt`, test setup.
2. Implement `github/github_client.py` (fetch only) and `scripts/fetch_sample_issues.py`; fetch 500 most recent issues (`state=all`) for `pytorch/pytorch`, `tensorflow/tensorflow`, `scikit-learn/scikit-learn` into `data/samples/{owner}_{repo}.json`.
3. Implement `preprocessing/` (`text_processor.py`, `protected_terms.py`, `stopwords.py`) per §9.1–9.2.
4. Implement `lda/model.py` (§9.3–9.4), `lda/inference.py` (§9.6–9.8), `lda/evaluation.py` (§9.5), and `lda/pipeline.py` (§7.2).
5. Implement `lda/gibbs.py` and the Gensim-vs-Gibbs comparison (§9.10).
6. Write `notebooks/phase1_lda_experiments.ipynb` running the pipeline and comparison on all three datasets; save corpora, K-sweep tables, topic lists, and comparison results to `docs/phase1/`.
7. Freeze protected terms and domain stopwords; document them.
8. Unit tests for preprocessing, dictionary filtering, pipeline invariants.

**Exit criteria:** Pipeline runs on all three datasets without errors; every doc-topic row sums to 1 (±1e-3); K sweep tables produced; Gibbs comparison table produced; topics are human-interpretable for at least two datasets (reviewed by the author); lists frozen.
**Output:** Working LDA pipeline and experiments.

### Phase 2 — Backend & GitHub Integration
**Goal:** API-driven system.
Tasks:
1. SQLAlchemy models + Alembic `0001_initial` (§10) + RLS statements; `database.py`.
2. Finish `github_client.py` (validation, pagination, retries, rate-limit behavior §14).
3. `api/auth.py` (JWT/JWKS, user provisioning), CORS, error handler producing §11.12 format.
4. Endpoints §11.1–11.11, schemas, ownership scoping, limits (D-14).
5. `services/analysis_runner.py`: lifecycle §12, progress updates, transactional persistence, semaphore, startup recovery.
6. Trend SQL (§9.9), export generators, label edit.
7. Backend tests: client (respx), pipeline, API with stubbed JWT, authorization (404 on other user's data), limits, failure paths.

**Exit criteria:** With a valid token, a client can validate a repo, start an analysis, poll to COMPLETED, and retrieve every endpoint in §11; failure cases return the documented codes; restart recovery verified.
**Output:** Functional backend.

### Phase 3 — Frontend & UX
**Goal:** Complete product UI.
Tasks:
1. Vite + React + TS + Tailwind scaffold; Clerk provider; protected routes; API client with Bearer token; TanStack Query.
2. Landing (GSAP hero), Home/history, Analyze flow with configuration form.
3. Progress page with polling and stepper.
4. Dashboard (4 tabs), Topic Detail (with label editing), Issue Detail, Export menu, explainer panel.
5. Charts per §15.3; palette; empty/loading/error states; responsive layout.
6. Framer Motion transitions; reduced-motion handling.
7. Vitest tests for configuration form validation, label badge logic, "Other" aggregation, polling stop condition.

**Exit criteria:** Full journey (§5) works locally against the real backend with no mock data; all screens in §15.2 implemented.
**Output:** Complete interactive application.

### Phase 4 — Production, Evaluation & Documentation
**Goal:** Deployed, evaluated, documented.
Tasks:
1. Deploy per §18; configure Clerk production instance; run migrations.
2. Performance verification against §3.3 (500-issue run ≤ 5 min on Render Starter); tune only within the constraints of this PRD (e.g., batch size).
3. Run the three demo analyses in production; export reports; capture screenshots into `docs/` (D-29).
4. Write all documentation (§19) and the project report (methodology, evaluation tables, Gibbs comparison, limitations, future work).
5. Final QA against acceptance criteria (§21).

**Exit criteria:** All acceptance criteria pass in production; all 10 deliverables present.
**Output:** Deployed GitIssue plus academic project report.

---

## 21. Testing Strategy and Acceptance Criteria

**Automated:** pytest (unit + API), Vitest (components/hooks). CI is not required; tests must pass locally before each phase exit.

**End-to-end acceptance criteria (verified manually at Phase 3 exit and in production at Phase 4):**

| ID | Scenario | Expected |
|---|---|---|
| AC-01 | Sign in, validate a public repo, start an auto-K analysis with defaults | Reaches COMPLETED; dashboard shows topics, prevalence summing to ~100% |
| AC-02 | Start a manual-K analysis (K=6) | `num_topics = 6`; evaluation tab still lists the sweep and shows best-by-coherence K |
| AC-03 | Enter an invalid URL (`https://example.com/a/b`) | Error `INVALID_URL`, no analysis created |
| AC-04 | Enter a nonexistent/private repo | Error `REPO_NOT_FOUND` |
| AC-05 | Repo with fewer than 50 usable issues | Analysis FAILED with `INSUFFICIENT_DATA` and readable message |
| AC-06 | Start a second analysis while one is active | 429 `ANALYSIS_LIMIT_REACHED` with clear UI message |
| AC-07 | Open an issue detail | Distribution shows top 5 + "Other"; probabilities sum to 100% |
| AC-08 | Edit a topic label, reset it to null | Badge toggles Edited ↔ Auto; `display_label` updates everywhere |
| AC-09 | Open Trends for a repo spanning ≥ 3 months | Stacked area chart; each month sums to 100% |
| AC-10 | Export all four types | Files download with documented columns/structure |
| AC-11 | Delete a completed analysis | 204; analysis gone; repository and issues removed if no analyses remain |
| AC-12 | Restart backend during an active analysis | Analysis becomes FAILED `SERVER_RESTARTED` |
| AC-13 | Request another user's analysis ID | 404 `NOT_FOUND` |
| AC-14 | No issue body text exists anywhere in the database | Verified by schema inspection and sample queries |

---

## 22. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| GitHub rate limits | Server token; header-aware handling; partial-fetch rule (§14); `max_issues` cap |
| Noisy issue text | Template/code/stack-trace cleaning; protected terms; domain stopwords; Phase 1 tuning then freeze |
| Low coherence / uninterpretable topics | K sweep; honest metric display; user-editable labels |
| Memory/time on Render | Small spaCy model; parser/NER disabled; one model in memory; 1000-issue cap; global concurrency 2 |
| Orphaned jobs after restart | Startup recovery (D-15) |
| Variational vs "sampling" expectation | Explicit D-01/D-02 and explainer copy (§15.5) |
| Secret leakage | Server-side secrets only; `.env.example`; no secrets in logs |
| Sparse/small repositories | 50-document minimum with clear error |

---

## 23. Limitations and Future Work

**Limitations (documented in README and report):** public repos only; English-oriented preprocessing; Bag-of-Words ignores word order; short or template-heavy issues give weak signals; topics require human interpretation; results vary with K and preprocessing; reproducibility assumes identical GitHub data; no automated purge when a Clerk account is deleted.

**Future work:** private repositories via GitHub OAuth; issue comments in the corpus; Celery/RQ job queue with cancel/re-run; alternative models (BERTopic, NMF) side by side; cross-repository comparison; scheduled re-analysis; Three.js 3D topic space and topic-similarity visualization (D-24); optional LLM-assisted label suggestions; language detection; account-deletion data purge.

---

## 24. Glossary

| Term | Definition |
|---|---|
| LDA | Latent Dirichlet Allocation, a generative probabilistic topic model |
| Topic | A probability distribution over words |
| P(word ∣ topic) | Probability of a word given a topic |
| P(topic ∣ document) | Probability of a topic given a document (issue) |
| Bag-of-Words | Document representation as word counts, ignoring order |
| Variational Bayes | Optimization-based approximation of the LDA posterior (Gensim's inference) |
| Gibbs sampling | MCMC method drawing samples from the LDA posterior (offline comparison) |
| C_v coherence | Topic coherence metric based on word co-occurrence and indirect confirmation; used to select K |
| Perplexity | Likelihood-based fit metric; informational only here |
| Prevalence | Mean P(topic ∣ document) across the corpus |
| Dominant topic | The argmax topic of a document |
| Representative issue | Issue with the highest P(topic ∣ issue) for a topic |
| Display label | `human_label` if set, otherwise heuristic `auto_label` |

---

**No open questions remain. All decisions are recorded in §1.**
