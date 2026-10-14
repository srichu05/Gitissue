"""Database connection and session management for GitIssue."""
import os
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from backend.config import settings

def get_database_url() -> str:
    """Return configured database URL (Neon PostgreSQL), falling back to local SQLite if not configured."""
    url = settings.DATABASE_URL or settings.NEON_DATABASE_URL or settings.SUPABASE_DATABASE_URL
    if not url or url.strip() == "":
        # Fallback to local SQLite file for development and offline testing
        db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "gitissue.db"))
        return f"sqlite:///{db_path}"

    clean_url = url.strip()
    # Normalize legacy postgres:// scheme to postgresql:// for SQLAlchemy compatibility
    if clean_url.startswith("postgres://"):
        clean_url = "postgresql://" + clean_url[len("postgres://"):]

    return clean_url


database_url = get_database_url()

# Configure engine arguments based on dialect
connect_args = {}
if database_url.startswith("sqlite"):
    connect_args["check_same_thread"] = False
    engine = create_engine(
        database_url,
        connect_args=connect_args,
        pool_pre_ping=True,
        echo=False,
    )
else:
    # PostgreSQL (Neon) connection pooling optimizations
    # Neon serverless PostgreSQL compute can suspend on idle; pool_pre_ping ensures
    # dead connections are evicted and reconnected transparently.
    # pool_recycle ensures connections are refreshed periodically.
    engine = create_engine(
        database_url,
        connect_args=connect_args,
        pool_pre_ping=True,
        pool_recycle=300,
        pool_size=5,
        max_overflow=10,
        echo=False,
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db() -> Generator[Session, None, None]:
    """Dependency that yields a database session and ensures cleanup."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db() -> None:
    """Create all tables in the database."""
    Base.metadata.create_all(bind=engine)
