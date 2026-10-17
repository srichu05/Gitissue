# GitIssue — GitHub Issue Topic Intelligence Platform

GitIssue is an NLP-powered platform that analyzes unstructured GitHub issues using **Latent Dirichlet Allocation (LDA)** topic modeling to uncover latent themes, track topic prevalence over time, and evaluate model coherence.

---

## Architecture Overview

- **NLP & Topic Modeling (Phase 1):** GitHub markdown preprocessing, code block removal, spaCy lemmatization, Gensim LDA, $K$-sweep coherence ($C_v$) evaluation, and Collapsed Gibbs Sampler baseline.
- **Backend & Persistence (Phase 2):** FastAPI REST API, PostgreSQL persistence with SQLAlchemy 2.x and Alembic, Clerk JWT authentication, background pipeline runner, and Sentry error monitoring.
- **Frontend & Visualization (Phase 3):** React 19 + TypeScript + Vite, Tailwind CSS, Recharts topic distribution & trends, and human-in-the-loop topic labeling.
- **Database:** **Neon Serverless PostgreSQL** (with automatic local SQLite fallback for offline development).

---

## Quickstart

### 1. Prerequisites
- Python 3.11
- Node.js 18+ & npm
- Neon PostgreSQL database instance (or local SQLite)

### 2. Backend Setup

```bash
# Activate virtual environment
.venv\Scripts\activate   # Windows
# source .venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r backend/requirements.txt

# Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env and provide your DATABASE_URL:
# DATABASE_URL=postgresql://USER:PASSWORD@ep-xyz.neon.tech/neondb?sslmode=require

# Run database migrations (when ready to initialize Neon)
alembic -c alembic.ini upgrade head

# Start backend development server
python -m uvicorn backend.main:app --reload --port 8000
```

### 3. Frontend Setup

```bash
cd frontend
npm install

# Configure local environment
cp .env.example .env.local

# Start frontend development server
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Database Configuration (Neon PostgreSQL)

GitIssue uses the provider-neutral `DATABASE_URL` environment variable:

```env
DATABASE_URL=postgresql://USER:PASSWORD@ep-xyz-pooler.region.aws.neon.tech/neondb?sslmode=require
```

- **SSL:** Mandatory for Neon (`sslmode=require`).
- **Connection Pooling:** Serverless connection recycling (`pool_recycle=300`) and pre-ping validation (`pool_pre_ping=True`) are enabled.
- **Offline Fallback:** If `DATABASE_URL` is omitted, the application automatically uses local SQLite (`backend/gitissue.db`).

See [docs/deployment.md](docs/deployment.md) for full deployment instructions on Render and Vercel.

---

## Running Tests

```bash
# Run backend test suite (53 tests)
pytest backend/tests/

# Run database configuration tests
pytest backend/tests/test_database_config.py

# Verify frontend types and build
cd frontend && npm run typecheck && npm run build
```
