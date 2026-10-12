# GitIssue Frontend (Phase 3)

The modern React + TypeScript + Vite frontend for **GitIssue**, an NLP-powered GitHub Issue Topic Intelligence Platform.

---

## Tech Stack

- **Framework**: React 19 + Vite + TypeScript (strict mode)
- **Styling**: Tailwind CSS + Radix UI / shadcn-ui components
- **Routing**: React Router v6
- **Server State & Caching**: TanStack Query (React Query v5)
- **Charts & Visualizations**: Recharts (Topic distribution, word probabilities, 100% stacked area trends, model coherence sweep)
- **Animations**: Framer Motion (page transitions, cards, progress bars) and GSAP (landing hero topic node visualization)
- **Authentication**: Clerk (`@clerk/clerk-react`) with dev fallback mode

---

## Route Overview

| Route | Page | Purpose |
| :--- | :--- | :--- |
| `/` | Landing Page | Hero with GSAP drift nodes, LDA explanation, interactive topic cards |
| `/sign-in/*` | Sign In | Clerk OAuth & email sign-in (or development bypass) |
| `/sign-up/*` | Sign Up | Clerk registration with GitHub/Google OAuth |
| `/app` | Main Dashboard | Repository analysis history, metrics, empty & error states |
| `/app/analyze` | Analyze Repo | GitHub URL validation, repo metadata preview, Auto/Manual $K$ selection |
| `/app/analyses/:id` | Analysis Progress | Live TanStack Query lifecycle polling across all pipeline stages |
| `/app/analyses/:id/topics` | Topic Dashboard | Discovered topic cards, prevalence share pie chart, metadata strip |
| `/app/analyses/:id/topics/:topicIndex` | Topic Detail | Top 15 word probabilities, representative issues, human label editing & reset |
| `/app/analyses/:id/issues/:issueId` | Issue Detail | GitHub issue metadata, external link, topic probability distribution chart |
| `/app/analyses/:id/trends` | Trends | 100% stacked area chart over monthly prevalence, insufficient data detection |
| `/app/analyses/:id/evaluation` | Model Evaluation | $C_v$ topic coherence vs $K$ curve, training perplexity, sweep table |
| `/app/analyses/:id/corpus` | Corpus & Stats | Token metrics, top vocabulary terms, NLP preprocessing trace inspector, DTM preview |
| `/app/analyses/:id/exports` | Export Reports | Authenticated download of Markdown report, JSON report, Topic-words CSV, Doc-topics CSV |

---

## Local Setup & Development

### 1. Environment Configuration

Copy the example environment template:

```bash
cp .env.example .env.local
```

Configure your variables:

```env
# Backend API Base URL
VITE_API_BASE_URL=http://localhost:8000

# Clerk Authentication (Optional for offline dev; required for production)
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

*Note: If `VITE_CLERK_PUBLISHABLE_KEY` is omitted, the frontend automatically runs in development mode, allowing full navigation and dashboard testing without external Clerk credentials.*

### 2. Running Locally

Run both the FastAPI backend and React frontend concurrently:

**Terminal 1 — FastAPI Backend (from repo root):**
```bash
.venv\Scripts\python.exe -m uvicorn backend.main:app --reload --port 8000
```

**Terminal 2 — React Frontend (from `frontend/` directory):**
```bash
cd frontend
npm run dev
```

The app will be available at `http://localhost:5173`.

### 3. Production Build

To verify type safety and bundle output:

```bash
cd frontend
npm run build
```

This runs `tsc -b && vite build` and generates the optimized production bundle inside `frontend/dist/`.
