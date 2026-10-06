"""FastAPI application factory, middleware, exception handlers, and lifespan (PRD §7.1, §8, §9, §11.12, §16)."""
from contextlib import asynccontextmanager
import logging
from typing import Any, Dict, Optional

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import sentry_sdk

from backend.api.analysis import router as analysis_router
from backend.api.issues import router as issues_router
from backend.api.repositories import router as repositories_router
from backend.api.topics import router as topics_router
from backend.config import settings
from backend.database.database import SessionLocal, init_db
from backend.services.analysis_runner import recover_stale_analyses

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("gitissue")


def _sentry_before_send(event: Dict[str, Any], hint: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Privacy filter to ensure no auth tokens, headers, or secrets are leaked to Sentry."""
    if "request" in event and "headers" in event["request"]:
        headers = event["request"]["headers"]
        for key in list(headers.keys()):
            if key.lower() in ("authorization", "cookie", "x-api-key"):
                headers[key] = "[FILTERED]"
    return event


# Initialize Sentry error monitoring if DSN is configured (PRD §9)
if settings.SENTRY_DSN and settings.SENTRY_DSN.strip():
    try:
        sentry_sdk.init(
            dsn=settings.SENTRY_DSN.strip(),
            environment=settings.SENTRY_ENVIRONMENT,
            before_send=_sentry_before_send,
            traces_sample_rate=0.0,  # Error monitoring only, no profiling per PRD §9
        )
        logger.info(f"Sentry initialized in environment: {settings.SENTRY_ENVIRONMENT}")
    except Exception as e:
        logger.warning(f"Failed to initialize Sentry: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler performing startup recovery (PRD §1, D-15, §16)."""
    logger.info("Application starting up...")
    # Initialize database tables if needed
    try:
        init_db()
    except Exception as e:
        logger.error(f"Error during init_db: {e}")

    # Recover any stale, non-terminal analyses from prior shutdown
    db = SessionLocal()
    try:
        recovered_count = recover_stale_analyses(db)
        if recovered_count > 0:
            logger.info(f"Startup recovery complete: {recovered_count} analyses marked as SERVER_RESTARTED.")
    finally:
        db.close()

    yield

    logger.info("Application shutting down...")


app = FastAPI(
    title="GitIssue API",
    description="NLP-powered GitHub Issue Topic Intelligence Platform",
    version="2.0.0",
    docs_url="/docs",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# Production CORS restricted to ALLOWED_ORIGINS (PRD §8, §13, D-17)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Exception Handlers producing standard PRD §11.12 error responses
# ---------------------------------------------------------------------------

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Format HTTPException into PRD §11.12 standard error structure."""
    if isinstance(exc.detail, dict) and "code" in exc.detail:
        payload = {
            "error": {
                "code": exc.detail.get("code", "ERROR"),
                "message": exc.detail.get("message", "An error occurred."),
                "retry_after_seconds": exc.detail.get("retry_after_seconds"),
            }
        }
    else:
        # Default mapping from status codes
        code_map = {
            400: "BAD_REQUEST",
            401: "UNAUTHENTICATED",
            403: "FORBIDDEN",
            404: "NOT_FOUND",
            409: "CONFLICT",
            422: "VALIDATION_ERROR",
            429: "RATE_LIMITED",
            500: "INTERNAL_ERROR",
            502: "GATEWAY_ERROR",
        }
        code = code_map.get(exc.status_code, "ERROR")
        payload = {
            "error": {
                "code": code,
                "message": str(exc.detail),
                "retry_after_seconds": None,
            }
        }

    headers = getattr(exc, "headers", None)
    return JSONResponse(status_code=exc.status_code, content=payload, headers=headers)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Format Pydantic 422 RequestValidationError into PRD §11.12 structure."""
    errors = exc.errors()
    first_msg = errors[0]["msg"] if errors else "Validation failed."
    loc = " -> ".join(str(l) for l in errors[0]["loc"]) if errors else "body"

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": f"{loc}: {first_msg}",
                "retry_after_seconds": None,
            }
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Catch-all for unhandled exceptions to prevent leaking internal stack traces (PRD §8, §11.12)."""
    logger.exception(f"Unhandled exception on {request.method} {request.url.path}: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An unexpected internal server error occurred.",
                "retry_after_seconds": None,
            }
        },
    )


# ---------------------------------------------------------------------------
# Public Health Check Endpoints (PRD §11)
# ---------------------------------------------------------------------------

@app.get("/health", tags=["system"], summary="Health check endpoint (no DB query)")
@app.get("/api/health", tags=["system"], summary="Health check endpoint (no DB query)")
def health_check():
    """Health endpoint returning ok status without database query (PRD §11)."""
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Mount API Routers under /api
# ---------------------------------------------------------------------------

app.include_router(repositories_router, prefix="/api")
app.include_router(analysis_router, prefix="/api")
app.include_router(topics_router, prefix="/api")
app.include_router(issues_router, prefix="/api")
