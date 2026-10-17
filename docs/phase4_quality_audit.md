# GitIssue — Model Quality, Premium UI Upgrade & End-to-End Audit Report

> **Audit Scope:** Local Quality, Model Mathematics, Preprocessing Pipeline, API Integration, and Recruiter-Ready UI/UX Upgrade.  
> **Status:** Local Audit Complete & Verified. (Production cloud deployment on Vercel/Render is **NOT AUDITED** and remains to be executed in Phase 4).  
> **Date:** October 12, 2026  
> **Repository Subject Tested:** `storytold/wordcraft` (Analysis ID: `34522e53-26d8-4f2e-9b55-b05247039d84`)  

---

## A. Executive Summary

### 1. What Was Done
- **Investigated & Fixed Analytical & Reporting Defects:**
  - Resolved `KeyError: 'index'` in [analysis_runner.py](file:///c:/Users/R%20Raghavendra/Downloads/PROJECTS/Gitissue/backend/services/analysis_runner.py#L313) during Step 4 transactional database persistence of discovered topics.
  - Corrected aggressive float formatting `(P={probability:.2f})` in [backend/api/analysis.py](file:///c:/Users/R%20Raghavendra/Downloads/PROJECTS/Gitissue/backend/api/analysis.py#L475) that caused representative issue matches to display as `P=1.00`, replacing it with exact continuous posterior percentages (`P=99.9%`).
  - Added `http://127.0.0.1:5173` to `ALLOWED_ORIGINS` in [backend/config.py](file:///c:/Users/R%20Raghavendra/Downloads/PROJECTS/Gitissue/backend/config.py#L18) and [backend/.env](file:///c:/Users/R%20Raghavendra/Downloads/PROJECTS/Gitissue/backend/.env#L8) to eliminate browser CORS preflight blocks.
  - Made topic endpoint consumption in [frontend/src/services/api.ts](file:///c:/Users/R%20Raghavendra/Downloads/PROJECTS/Gitissue/frontend/src/services/api.ts#L164) defensive against both `{ topics: [...] }` wrapper envelopes and bare lists.
- **Audited Model Selection & Evaluation Semantics:**
  - Diagnosed why active $K=5$ ($C_v=0.3008$) differed from sweep optimum $K=12$ ($C_v=0.3626$): confirmed via SQLite database inspection that the analysis was deliberately initiated in **Manual K Mode** (`k_mode: "manual"`, `num_topics: 5`).
  - Rebuilt the Evaluation dashboard to explicitly differentiate **Manual User Override** from **Automatic $C_v$ Optimization**, display a warning callout when manual choice deviates from the sweep optimum, and annotate both candidate points distinctly on the Recharts coherence curve and sweep table.
- **Mathematical Notation & Technical Explanations:**
  - Replaced all unrendered raw LaTeX artifacts (e.g., `$\theta_d$`, `$K$`, `$\beta_{k,v}$`, raw `$C_v$`) with styled semantic typography and accessible statistical explanations.
  - Added an in-depth explainer distinguishing **Topic Prevalence** (marginal expected mixture share $\frac{1}{D}\sum \theta_{d,k}$) from **Dominant Issue Count** ($\sum \mathbb{I}(\text{argmax}_k \theta_{d,k} = k)$).
- **Major UI/UX Upgrade:**
  - Enforced a sophisticated light analytical workspace default in [theme-provider.tsx](file:///c:/Users/R%20Raghavendra/Downloads/PROJECTS/Gitissue/frontend/src/components/theme-provider.tsx#L82).
  - Modernized the application shell with responsive Lucide-based sidebar navigation, sticky header with repository context, accessible badges, Recharts visualizations with responsive containers, and smooth Framer Motion micro-interactions.
- **End-to-End Verification:**
  - Executed static checks (TypeScript typecheck: 0 errors; Vite production build: 0 errors).
  - Executed backend pytest suite: **48 of 48 passed** in 29.25 seconds.
  - Executed browser runtime testing verifying live data loading for `storytold/wordcraft`.
  - Programmatically audited 5 fundamental mathematical invariants across all 394 retained issues and 5 topic clusters.

### 2. Current Project Health
- **Backend Health:** Stable and verified. All API contracts, GitHub ingestion routines, Gibbs sampling, and export endpoints function according to `PRD.md`.
- **Frontend Health:** Recruiter-ready, modern AI SaaS interface with high contrast, responsive layouts down to 360px, consistent component primitives, and zero TypeScript compile warnings.
- **Data Integrity:** 100% compliant with PRD §10 — GitHub issue bodies are never persisted in PostgreSQL or SQLite.

### 3. Most Important Remaining Risks
1. **GitHub API Rate Limits:** Without a configured `GITHUB_TOKEN` in `.env`, unauthenticated GitHub API requests are capped at 60 requests/hour.
2. **Third-Party Auth Dependency (Clerk):** Production deployment requires populating `CLERK_JWKS_URL` and `VITE_CLERK_PUBLISHABLE_KEY`. Development mode safely falls back to authenticated stub users without bypassing production signature checks.
3. **Database Dialect Parity:** Local testing uses SQLite (`sqlite3`); production deployment requires Supabase PostgreSQL connection strings (`postgresql+psycopg2://...`). Schema is managed via Alembic migrations.

---

## B. Verified Fixes

| Issue ID | Original Defect | Root Cause | Files Changed | Fix Applied | Test Proving Fix |
|---|---|---|---|---|---|
| **FIX-01** | Step 4 Transactional Failure in `analysis_runner.py` | Code accessed `topic_dict["index"]` instead of `topic_dict.get("topic_index")`, raising `KeyError: 'index'` when persisting LDA results | [backend/services/analysis_runner.py](file:///c:/Users/R%20Raghavendra/Downloads/PROJECTS/Gitissue/backend/services/analysis_runner.py#L313) | Updated lookup to `topic_dict.get("topic_index", topic_dict.get("index"))` | `pytest backend/tests/test_analysis_lifecycle.py` passed; analysis completion pipeline runs end-to-end |
| **FIX-02** | Aggressive Rounding Printing `P=1.00` | In `export_analysis()`, format string was hardcoded to `(P={r_issue['probability']:.2f})`, rounding high posterior probabilities (e.g. 0.9995) to `1.00` | [backend/api/analysis.py](file:///c:/Users/R%20Raghavendra/Downloads/PROJECTS/Gitissue/backend/api/analysis.py#L475) | Updated formatting to continuous percentage: `(P={r_issue['probability'] * 100:.1f}%)` | [backend/scripts/verify_exports.py](file:///c:/Users/R%20Raghavendra/Downloads/PROJECTS/Gitissue/backend/scripts/verify_exports.py) confirmed `report_md` outputs `(P=99.9%)` |
| **FIX-03** | Evaluation UI Ambiguity for $K=5$ vs $K=12$ | The evaluation page previously presented the active model as coherence-optimal without checking if the user ran in manual or auto mode | [frontend/src/pages/Analysis/EvaluationPage.tsx](file:///c:/Users/R%20Raghavendra/Downloads/PROJECTS/Gitissue/frontend/src/pages/Analysis/EvaluationPage.tsx) | Added explicit Manual Override detection, warning banner, separate optimum reference dots on the chart, and status badges in the sweep table | Browser subagent verified warning callout and dual annotation on curve ($K=5$ active vs $K=12$ sweep optimum) |
| **FIX-04** | Raw LaTeX Delimiters in UI | Raw Markdown/LaTeX strings like `$\theta_d$`, `$K$`, and `$\beta_{k,v}$` rendered as unparsed literal characters | [TopicDashboardPage.tsx](file:///c:/Users/R%20Raghavendra/Downloads/PROJECTS/Gitissue/frontend/src/pages/Analysis/TopicDashboardPage.tsx), [TopicDetailPage.tsx](file:///c:/Users/R%20Raghavendra/Downloads/PROJECTS/Gitissue/frontend/src/pages/Topic/TopicDetailPage.tsx), [IssueDetailPage.tsx](file:///c:/Users/R%20Raghavendra/Downloads/PROJECTS/Gitissue/frontend/src/pages/Issue/IssueDetailPage.tsx), [EvaluationPage.tsx](file:///c:/Users/R%20Raghavendra/Downloads/PROJECTS/Gitissue/frontend/src/pages/Analysis/EvaluationPage.tsx) | Replaced raw math strings with clean, accessible terminology, semantic subscripts (`C_v`), and mathematical definitions in explainer boxes | Ripgrep search for `\$`, `\theta`, `\beta` yielded 0 matches across `frontend/src` |
| **FIX-05** | CORS Preflight Failure from Local Dev Origin | `ALLOWED_ORIGINS` contained `http://localhost:5173` but not `http://127.0.0.1:5173`, resulting in HTTP 400 Bad Request on browser preflight OPTIONS calls | [backend/config.py](file:///c:/Users/R%20Raghavendra/Downloads/PROJECTS/Gitissue/backend/config.py#L18), [backend/.env](file:///c:/Users/R%20Raghavendra/Downloads/PROJECTS/Gitissue/backend/.env#L8) | Added `http://127.0.0.1:5173` to allowed origins list in both configuration and environment | HTTP request `OPTIONS http://127.0.0.1:8000/api/analyses` returned HTTP 200 with `Access-Control-Allow-Origin: http://127.0.0.1:5173` |
| **FIX-06** | Dark Theme Inversion on Windows | `defaultTheme = "system"` caused browsers on Windows dark-mode desktops to default to dark analytics styling | [frontend/src/components/theme-provider.tsx](file:///c:/Users/R%20Raghavendra/Downloads/PROJECTS/Gitissue/frontend/src/components/theme-provider.tsx#L82) | Changed default theme to `"light"` for a curated, premium AI analytics SaaS aesthetic | Browser verification verified crisp light palette with OKLCH token colors and subtle borders |

---

## C. Model and Evaluation Audit

Detailed mathematical analysis executed on `storytold/wordcraft` (Analysis ID `34522e53-26d8-4f2e-9b55-b05247039d84`):

### 1. Actual Values & Parameters
- **Active Topic Count ($K$):** 5
- **Model Selection Mode:** `manual` (Configured by user: `{"k_mode": "manual", "num_topics": 5, "issue_state": "all", "max_issues": 500, "min_doc_length": 8}`)
- **Sweep-Optimal Topic Count:** $K = 12$
- **Active Model $C_v$ Coherence:** `0.3008`
- **Sweep-Optimal $C_v$ Coherence:** `0.3626`
- **Active Model Perplexity:** `77.38` (Sweep-Optimal Perplexity: `74.50`)
- **Total Issues Collected:** 500
- **Retained Documents ($D$):** 394 (106 dropped with token count $< 8$)
- **Vocabulary Size ($V$):** 1,249 unique unigrams

### 2. Candidate K-Sweep Points
| Candidate $K$ | $C_v$ Coherence | Perplexity | Evaluation Role | Status Badge in UI |
|---|---|---|---|---|
| $K = 3$ | 0.3225 | 78.9 | Evaluated Candidate | — |
| **$K = 5$** | **0.3008** | **77.4** | **Active Deployed Model** | **Active (Manual)** |
| $K = 7$ | 0.3400 | 76.2 | Evaluated Candidate | — |
| $K = 10$ | 0.3229 | 75.3 | Evaluated Candidate | — |
| **$K = 12$** | **0.3626** | **74.5** | **Sweep Optimum** | **Sweep Optimum** |
| $K = 15$ | 0.3366 | 75.6 | Evaluated Candidate | — |

### 3. Topic Prevalence vs. Dominant Issue Count
| Topic Index | Auto Label | Stored Prevalence | Empirical Mean Posterior $\frac{1}{D}\sum \theta_{d,k}$ | Dominant Issue Count | Dominant Share |
|---|---|---|---|---|---|
| **0** | Field / Source / Save | 0.1007 (10.1%) | 0.1007 | 37 | 9.4% |
| **1** | Source / Change / CLI | 0.0641 (6.4%) | 0.0641 | 21 | 5.3% |
| **2** | Text / Wordcraft / Table | 0.4171 (41.7%) | 0.4171 | 171 | 43.4% |
| **3** | Language / Font / Wordcraft | 0.2758 (27.6%) | 0.2758 | 113 | 28.7% |
| **4** | Paragraph / Page / Text | 0.1424 (14.2%) | 0.1424 | 52 | 13.2% |
| **Sum** | — | **1.0000 (100.0%)** | **1.0000 (100.0%)** | **394** | **100.0%** |

### 4. Mathematical Invariants Audit Results
1. **Document-Topic Probability Normalization:**
   - Evaluated all 394 retained issues: $\sum_{k=0}^{4} \theta_{d,k} = 1.000000$ (Min sum: `1.000000`, Max sum: `1.000000`, tolerance $10^{-4}$). **Status: PASS**.
2. **Dominant Count Conservation:**
   - Sum of dominant issues across 5 topics $= 37 + 21 + 171 + 113 + 52 = 394 \equiv D$. **Status: PASS**.
3. **Prevalence Consistency:**
   - Absolute difference between persisted topic prevalence and marginal posterior mean $\le 10^{-6}$ for every topic. **Status: PASS**.
4. **Representative Issue Probabilities ($P=1.00$ Investigation):**
   - True continuous probabilities stored in `topic_representative_issues`:
     - Topic 0 top issues: `0.9995`, `0.9994`, `0.9994`
     - Topic 1 top issues: `0.9995`, `0.9993`, `0.9993`
     - Topic 2 top issues: `0.9988`, `0.9988`, `0.9988`
     - Topic 3 top issues: `0.9987`, `0.9987`, `0.9985`
     - Topic 4 top issues: `0.9995`, `0.9994`, `0.9993`
   - **Conclusion:** Values are genuinely close to 1.0 due to concentrated Dirichlet posteriors on issues with specific vocabulary. The defect was premature two-decimal rounding (`P=1.00`), not model corruption. Formatted as `99.9%` in UI and markdown export. **Status: PASS**.

### 5. Inherent Model-Quality Findings
- **Topic Overlap Terms (`wordcraft`, `text`):** Common words appear across topics 2, 3, and 4. This is an expected artifact of domain-specific terminology in a text-editor repository (`storytold/wordcraft`). In Phase 1 preprocessing, domain-specific stopword filtering is preserved to maintain reproducibility.
- **Human Labeling Override:** Verified that users can customize topic labels via `PATCH /api/topics/{id}` (e.g., labeling Topic 2 as `"Text Editor & Rendering"`), which updates display metadata while preserving underlying LDA distributions.

---

## D. UI/UX Audit

| Page / Route | Visual System & Layout | Usability & Navigation | Responsive Layout (360px–1440px) | Accessibility & Focus | Chart & Data Presentation |
|---|---|---|---|---|---|
| **Landing Page** (`/`) | Hero with GSAP-driven particle graph, clean typography, OKLCH brand palette | Direct CTAs to `/app/analyze` and `/app`; workflow steps 1–5 clearly laid out | Stacked mobile grid; navbar collapsible | High contrast text; semantic buttons; keyboard navigable | Sample topic output cards with progress bars |
| **Dashboard** (`/app`) | Clean light cards with subtle borders; status badges | One-click navigation to analyses, delete action with confirm prompt | 4-column metric grid wraps to 2-col and 1-col on mobile | Visible focus outlines; readable table typography | Dynamic KPI metric cards computing total issues and average topics |
| **Analyze** (`/app/analyze`) | Guided form with URL validation card, radio cards for K selection | Live GitHub repo validation card with stars/forks preview before submission | Form inputs adapt smoothly to mobile viewport | Semantic form controls (`Label`, `RadioGroup`, `Slider`) | Pipeline diagram illustrating GitHub $\to$ Lemmatization $\to$ LDA stages |
| **Topic Dashboard** (`/app/analyses/:id/topics`) | Dual layout: Prevalence pie chart + Statistical explainer on top; 3-column topic card grid | Clickable cards route directly to Topic Detail; active tab indicators | Cards flex from 3 columns $\to$ 2 $\to$ 1 on mobile screens | Distinct color accents per topic; clear text contrast | Recharts pie chart with interactive tooltip; prevalence bars per card |
| **Topic Detail** (`/app/analyses/:id/topics/:k`) | Top 15 words bar chart + Representative issues list side-by-side | In-place label editing with Save and "Reset to Auto" buttons; link to GitHub issue | Two equal columns stack on viewports $<1024$px | Inputs have accessible labels and keyboard submit handlers | Horizontal bar chart showing exact $\beta$ word probabilities |
| **Issue Detail** (`/app/analyses/:id/issues/:id`) | Issue header with state badge, author, comment count, and GitHub link | Back navigation to topic dashboard; topic cards link back to topics | Grid cleanly reflows on mobile devices | Semantic tags for GitHub issue labels | Pie chart showing topic probability mixture + percentage list |
| **Trends** (`/app/analyses/:id/trends`) | 100% stacked area chart tracking monthly topic shifts | Informational banner when data spans $<3$ calendar months | Chart maintains aspect ratio with `ResponsiveContainer` | Accessible chart legend and tooltips | Recharts stacked area chart with normalized 100% prevalence |
| **Model Evaluation** (`/app/analyses/:id/evaluation`) | Coherence curve chart + K-sweep tabular view + theoretical notes | Manual override warning banner; clear callout of active vs optimal K | Chart and table scroll horizontally without overflow clipping | Accessible table headers and status badges | Line chart with dual reference dots for active $K$ and optimal $K$ |
| **Corpus Stats** (`/app/analyses/:id/corpus`) | 4 KPI cards + interactive 4-stage preprocessing inspector + top terms table | Issue switcher buttons (#430, #429...) to trace text cleaning stages | Table has sticky header and max height scroll container | Tabular numbers using font-mono | Document-Term Matrix (DTM) preview with highlighted non-zero counts |
| **Exports** (`/app/analyses/:id/exports`) | 4 export cards (Markdown, JSON, Topic-Words CSV, Doc-Topics CSV) | Single-click download with loading spinner and "Downloaded" state | 2-column card grid stacks on mobile | Clear download icon and format badges | Descriptions explain content and schema of each exported file |

---

## E. Integration Audit

| Workflow | Frontend Component | Backend Endpoint | Classification | Evidence |
|---|---|---|---|---|
| **Health Check** | Application Shell | `GET /health` | **PASS** | Returns `{"status": "healthy", "service": "gitissue-backend"}` |
| **Repository Validation** | `AnalyzePage.tsx` | `POST /api/repositories/validate` | **PASS** | Validates GitHub URL and retrieves open issues count and repo metadata |
| **Analysis Creation** | `AnalyzePage.tsx` | `POST /api/repositories/analyze` | **PASS** | Initiates pipeline job, returns `analysis_id`, transitions to progress page |
| **Analysis Retrieval** | `DashboardPage.tsx` | `GET /api/analyses` | **PASS** | Returns paginated runs; tested with `storytold/wordcraft` (HTTP 200, 2 items) |
| **Topic List Retrieval** | `TopicDashboardPage.tsx` | `GET /api/analyses/{id}/topics` | **PASS** | Returns 5 topics with display labels, prevalence, and dominant issue counts |
| **Topic Detail Retrieval** | `TopicDetailPage.tsx` | `GET /api/analyses/{id}/topics/{k}` | **PASS** | Returns top 15 words with exact probabilities |
| **Representative Issues** | `TopicDetailPage.tsx` | `GET /api/analyses/{id}/topics/{tid}/issues` | **PASS** | Returns issues ranked by posterior probability |
| **Topic Label Update** | `TopicDetailPage.tsx` | `PATCH /api/topics/{tid}` | **PASS** | Updates `human_label` to `"Text Editor & Rendering"` (HTTP 200); updates `display_label` |
| **Topic Label Reset** | `TopicDetailPage.tsx` | `PATCH /api/topics/{tid}` | **PASS** | Resets `human_label` to `null` (HTTP 200); reverts `display_label` to auto label |
| **Issue Detail & Vector** | `IssueDetailPage.tsx` | `GET /api/analyses/{id}/issues/{iid}` | **PASS** | Returns full 5-topic probability vector summing to 1.0000 |
| **Model Evaluation** | `EvaluationPage.tsx` | `GET /api/analyses/{id}/evaluation` | **PASS** | Returns sweep results across $K=3..15$, selected $K=5$, best $K=12$ |
| **Corpus Statistics** | `CorpusStatsPage.tsx` | `GET /api/analyses/{id}/corpus-stats` | **PASS** | Returns 394 retained documents, 1,249 vocab, preprocessing sample traces |
| **Prevalence Trends** | `TrendsPage.tsx` | `GET /api/analyses/{id}/trends` | **PASS** | Returns monthly topic prevalence series or insufficient data notice |
| **Export: Markdown Report**| `ExportsPage.tsx` | `GET /api/analyses/{id}/export?type=report_md` | **PASS** | Returns 5,527 bytes formatted Markdown report with percentage probabilities |
| **Export: JSON Report** | `ExportsPage.tsx` | `GET /api/analyses/{id}/export?type=report_json`| **PASS** | Returns 17,320 bytes structured JSON analysis report |
| **Export: Words CSV** | `ExportsPage.tsx` | `GET /api/analyses/{id}/export?type=topic_words_csv` | **PASS** | Returns 3,444 bytes CSV with 76 rows |
| **Export: Doc Topics CSV** | `ExportsPage.tsx` | `GET /api/analyses/{id}/export?type=doc_topics_csv` | **PASS** | Returns 31,298 bytes CSV with 1,971 rows (394 issues $\times$ 5 topics) |
| **Analysis Deletion** | `DashboardPage.tsx` | `DELETE /api/analyses/{id}` | **PASS** | Verified via test suite; cascades deletion across all related DB tables |

---

## F. Test Results

### 1. Frontend Production Build & TypeScript Verification
```bash
cd frontend && npm run build
```
- **Outcome:** Exit code 0 (PASSED).
- **Modules Transformed:** 3,073 modules transformed in 1m 22s.
- **Output Bundles:**
  - `dist/index.html` (0.69 kB)
  - `dist/assets/index-CrK9yvyw.css` (136.67 kB / gzip 20.97 kB)
  - `dist/assets/index-zYuJu65p.js` (1,247.19 kB / gzip 374.88 kB)

```bash
cd frontend && npm run typecheck
```
- **Outcome:** Exit code 0 (PASSED, 0 type errors).

### 2. Backend Pytest Suite
```bash
.venv\Scripts\python.exe -m pytest backend/tests/
```
- **Outcome:** Exit code 0 (PASSED).
- **Execution Time:** 29.25 seconds.
- **Total Tests:** **48 passed, 0 failed, 3 deprecation warnings**.
  - `test_analysis_api.py`: 7 passed
  - `test_analysis_lifecycle.py`: 3 passed
  - `test_auth.py`: 5 passed
  - `test_gibbs.py`: 2 passed
  - `test_github_client.py`: 3 passed
  - `test_model.py`: 4 passed
  - `test_pipeline.py`: 2 passed
  - `test_preprocessing.py`: 6 passed
  - `test_repositories_api.py`: 6 passed
  - `test_sentry.py`: 2 passed
  - `test_topics_and_issues_api.py`: 5 passed
  - `test_trends_and_exports_api.py`: 3 passed

### 3. Programmatic Invariants Test
```bash
.venv\Scripts\python.exe backend/scripts/verify_invariants.py
```
- **Outcome:** Exit code 0 (PASSED).
- **Results:**
  - 394/394 documents verified normalized to 1.0000.
  - Dominant issue counts sum exactly to 394.
  - Topic prevalence matches empirical posterior mean within $10^{-6}$.
  - Representative issue probabilities verified continuous ($P \approx 0.999$).
  - Sweep best $K=12$ verified as genuine maximum of candidate coherence curve.

### 4. Browser Runtime Test
- Executed via browser automation subagent on `http://127.0.0.1:5173`.
- Verified landing page hero and workflow animation.
- Verified dashboard live analysis card rendering.
- Verified topic distribution charts, evaluation curves, corpus tables, and exports.
- Session recording saved: [gitissue_live_data_audit.webp](file:///C:/Users/R%20Raghavendra/.gemini/antigravity-ide/brain/f7ab531f-3b91-4a1f-b852-f0807c1a4e0a/gitissue_live_data_audit_1791818152209.webp).

---

## G. Security Audit

- **Clerk JWT Verification:** Implemented in [backend/api/auth.py](file:///c:/Users/R%20Raghavendra/Downloads/PROJECTS/Gitissue/backend/api/auth.py#L48). Production configuration enforces RS256 signature verification against Clerk JWKS endpoints with 1-hour in-memory key caching. Development fallback requires explicit development tokens (`test_token_*`) and cannot bypass production JWKS when configured.
- **Ownership Enforcement:** Every analysis, topic, issue, and export query validates that `analysis.user_id == current_user.id`. Cross-user access returns HTTP 404 or HTTP 403.
- **Issue Body Non-Persistence:** Compliant with PRD §10: table `issues` only stores metadata (`number`, `title`, `state`, `labels`, `author`, `created_at_github`, `html_url`). Issue bodies are processed exclusively in-memory during Step 3 lemmatization and discarded immediately.
- **Environment Variable Protection:** Secrets (`SENTRY_DSN`, `GITHUB_TOKEN`, `CLERK_JWKS_URL`, `SUPABASE_DATABASE_URL`) are read via Pydantic `BaseSettings` from `.env`. Frontend build exposes only `VITE_` prefixed variables (`VITE_API_BASE_URL`, `VITE_CLERK_PUBLISHABLE_KEY`).
- **Sentry Data Privacy:** Configured in `backend/main.py` with `send_default_pii=False`. Sensitive authorization tokens and issue body payloads are excluded from event captures.

---

## H. Remaining Limitations

1. **Phase 4 Cloud Deployment:** Hosting on Vercel (frontend) and Render/Fly.io (backend) has not been executed in this milestone.
2. **PostgreSQL vs SQLite In-Memory Concurrency:** Local testing uses SQLite with `check_same_thread=False`. Concurrent analysis write locks are minimized by SQLite WAL mode, but production requires Supabase PostgreSQL.
3. **GitHub API Rate Limits:** Without a personal access token in `GITHUB_TOKEN`, unauthenticated ingestion is rate-limited to 60 calls/hour.
4. **Offline Gibbs Sampler Notebook:** Phase 1 notebook remains in `notebooks/` as an academic reference; it is not hooked into production API requests.

---

## I. Release Recommendation

### **READY FOR PHASE 4 DEPLOYMENT**

**Justification:**
1. All reported model-explanation, K-selection, and data-presentation defects have been identified, corrected, and verified against the live `storytold/wordcraft` dataset.
2. 48 of 48 backend tests pass, the frontend builds cleanly without TypeScript errors, and all 5 core mathematical invariants hold strictly.
3. The UI/UX has been upgraded to a recruiter-ready AI analytics SaaS standard with light-mode default, accessible typography, interactive Recharts visualizations, and zero raw LaTeX artifacts.
4. The application is ready for Phase 4 deployment once cloud credentials (Supabase, Clerk, Vercel) are provisioned.

---

## J. Git Commit Plan

Execute the following 6 meaningful, granular commit groups:

### Commit Group 1: Backend Pipeline & Analysis Runner Fixes
```bash
git add backend/services/analysis_runner.py
git commit -m "fix(backend): resolve topic index lookup key in transactional persistence"
```

### Commit Group 2: Export Formatting & CORS Configuration
```bash
git add backend/api/analysis.py backend/config.py backend/scripts/verify_exports.py backend/scripts/verify_invariants.py
git commit -m "fix(api): improve export probability precision and configure local CORS origin"
```

### Commit Group 3: Frontend Design System & Theme Provider
```bash
git add frontend/src/components/theme-provider.tsx frontend/src/index.css frontend/src/components/ui/
git commit -m "style(frontend): enforce polished light theme default and refined SaaS design tokens"
```

### Commit Group 4: Topic & Evaluation Dashboard Semantic Upgrades
```bash
git add frontend/src/pages/Analysis/EvaluationPage.tsx frontend/src/pages/Analysis/TopicDashboardPage.tsx frontend/src/components/topics/
git commit -m "feat(evaluation): add manual K override banner and prevalence vs dominant explainer"
```

### Commit Group 5: Detail Views, Corpus Inspector & Exports Upgrade
```bash
git add frontend/src/pages/Topic/TopicDetailPage.tsx frontend/src/pages/Issue/IssueDetailPage.tsx frontend/src/pages/Analysis/CorpusStatsPage.tsx frontend/src/pages/Analysis/ExportsPage.tsx frontend/src/pages/Analysis/TrendsPage.tsx frontend/src/services/api.ts
git commit -m "feat(views): polish topic and issue detail inspectors and export download flows"
```

### Commit Group 6: App Shell, Landing Hero, Navigation & Comprehensive Audit
```bash
git add frontend/src/App.tsx frontend/src/main.tsx frontend/src/pages/Layout/ frontend/src/pages/Landing/ frontend/src/pages/Dashboard/ frontend/src/pages/Analyze/ docs/phase4_quality_audit.md
git commit -m "feat(app): upgrade app shell, landing hero, and deliver factual Phase 4 audit"
git push origin main
```
