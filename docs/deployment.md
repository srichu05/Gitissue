# GitIssue — Neon PostgreSQL & Cloud Deployment Guide

> **Database Architecture:** Neon Serverless PostgreSQL  
> **Backend Service:** FastAPI on Render Web Service  
> **Frontend Service:** React SPA on Vercel  
> **Auth Provider:** Clerk Cloud (RS256 JWT / JWKS)  

---

## 1. Overview

GitIssue uses **Neon Serverless PostgreSQL** for production database storage. Neon provides scalable PostgreSQL with compute separation and connection pooling. The codebase uses standard SQLAlchemy 2.x and Alembic with the `psycopg2-binary` driver.

When no remote database is configured, GitIssue automatically falls back to local SQLite (`backend/gitissue.db`), allowing full local development and testing without internet connectivity.

---

## 2. Environment Variables & Configuration

### A. Environment Variable Naming
The project uses the standard provider-neutral variable name:

```env
DATABASE_URL=postgresql://USER:PASSWORD@ep-xyz-pooler.region.aws.neon.tech/neondb?sslmode=require
```

*Note: For backward compatibility, `NEON_DATABASE_URL` and `SUPABASE_DATABASE_URL` are also supported as secondary fallbacks in `backend/config.py`.*

### B. Neon Connection String Requirements
1. **SSL is Required:** Neon enforces SSL encryption. Ensure the connection string includes `sslmode=require`.
2. **Connection Pooling:** For production web services with concurrency, use Neon's pooled endpoint (containing `-pooler` in the host).
3. **Driver Scheme:** If Neon supplies a connection string starting with `postgres://`, GitIssue's `get_database_url()` automatically normalizes it to `postgresql://` for SQLAlchemy compatibility.
4. **Connection Pool Parameters:** GitIssue configures `create_engine` with:
   - `pool_pre_ping=True`: Evicts stale connections when Neon compute suspends during idle periods.
   - `pool_recycle=300`: Recycles pooled connections every 5 minutes.
   - `pool_size=5`, `max_overflow=10`: Sized appropriately for serverless connection pools.

### C. Local `.env` Configuration
In `backend/.env` (excluded from Git by `.gitignore`):

```env
DATABASE_URL=postgresql://USER:PASSWORD@ep-xyz-pooler.region.aws.neon.tech/neondb?sslmode=require
GITHUB_TOKEN=your_github_token_optional
CLERK_JWKS_URL=https://your-instance.clerk.accounts.dev/.well-known/jwks.json
CLERK_ISSUER=https://your-instance.clerk.accounts.dev
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,https://gitissue.vercel.app
MAX_ISSUES_CAP=1000
MAX_CONCURRENT_ANALYSES=2
MAX_ANALYSES_PER_USER_PER_HOUR=10
LOG_LEVEL=INFO
SENTRY_DSN=
SENTRY_ENVIRONMENT=development
```

> [!CAUTION]
> Never commit `.env` or paste real database credentials into Git or public issues. `backend/.env.example` serves as the public template.

---

## 3. Database Migration Readiness (Alembic)

The schema is defined in Alembic migration `9875b167c7f9_0001_initial.py`. It creates:
- `users`: Clerk user identity mapping
- `repositories`: GitHub repository metadata
- `issues`: Metadata-only GitHub issues (**issue bodies are never persisted** per PRD §10)
- `analyses`: Lifecycle tracking, configuration, K-sweep results, and evaluation metrics
- `topics`: Discovered latent Dirichlet topic clusters and human interpretation labels
- `topic_words`: Top-15 words per topic with exact $\beta$ posterior probabilities
- `issue_topic_distributions`: Issue-level document-topic probability vectors ($\theta_{d,k}$)

### A. Inspect Migration Status (Without Connecting)
To check the migration revision head without connecting to the database:

```bash
# From workspace root
.venv\Scripts\python.exe -m alembic -c alembic.ini heads

# From backend directory
cd backend && alembic -c alembic.ini heads
```
Output:
```text
9875b167c7f9 (head)
```

### B. Applying Migrations to Neon (When Ready)
When you are ready to apply migrations to your Neon PostgreSQL database:

1. Ensure `DATABASE_URL` in `backend/.env` contains your Neon connection string.
2. Run Alembic upgrade:

```bash
# From workspace root:
.venv\Scripts\python.exe -m alembic -c alembic.ini upgrade head

# Or from backend directory:
cd backend
alembic -c alembic.ini upgrade head
```

### C. Row Level Security (RLS) on Neon
The initial migration executes `ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;` on all 7 tables.
- **On Neon:** The application connects using the database role that created the tables (`neondb_owner`). In standard PostgreSQL, the table owner role bypasses RLS by default.
- Authorization and user isolation (`analysis.user_id == current_user.id`) are enforced by the FastAPI backend application layer.

---

## 4. Render Deployment Instructions (Backend)

When deploying to **Render**:

1. **Service Type:** Web Service (Python 3.11).
2. **Build Command:**
   ```bash
   pip install -r backend/requirements.txt
   ```
3. **Start Command:**
   ```bash
   uvicorn backend.main:app --host 0.0.0.0 --port $PORT
   ```
4. **Environment Variables in Render Dashboard:**
   - `DATABASE_URL`: Your Neon PostgreSQL connection string (`postgresql://USER:PASSWORD@ep-xyz-pooler.region.aws.neon.tech/neondb?sslmode=require`).
   - `CLERK_JWKS_URL`: Your Clerk JWKS endpoint.
   - `CLERK_ISSUER`: Your Clerk issuer URL.
   - `ALLOWED_ORIGINS`: Your Vercel frontend URL (e.g. `https://gitissue.vercel.app`).
   - `GITHUB_TOKEN`: Personal access token (optional, increases GitHub rate limit to 5,000/hr).
   - `SENTRY_DSN`: Sentry project DSN.
   - `SENTRY_ENVIRONMENT`: `production`.

---

## 5. Vercel Deployment Instructions (Frontend)

When deploying to **Vercel**:

1. **Root Directory:** `frontend`
2. **Framework Preset:** Vite
3. **Build Command:** `npm run build`
4. **Output Directory:** `dist`
5. **Environment Variables in Vercel Dashboard:**
   - `VITE_API_BASE_URL`: URL of your Render backend service (e.g. `https://gitissue-api.onrender.com`).
   - `VITE_CLERK_PUBLISHABLE_KEY`: Clerk publishable key (`pk_live_...` or `pk_test_...`).
