"""Tests for database configuration, URL resolution, and Neon PostgreSQL compatibility."""
import os
import pytest
from unittest.mock import patch

from backend.config import Settings
from backend.database.database import get_database_url


def test_get_database_url_prefers_database_url():
    """Verify DATABASE_URL is preferred when set."""
    mock_settings = Settings(
        DATABASE_URL="postgresql://user:pass@ep-test.neon.tech/neondb?sslmode=require",
        NEON_DATABASE_URL="postgresql://user:pass@ep-other.neon.tech/neondb",
        SUPABASE_DATABASE_URL="postgresql://user:pass@ep-old.supabase.co/postgres",
    )
    with patch("backend.database.database.settings", mock_settings):
        url = get_database_url()
        assert url == "postgresql://user:pass@ep-test.neon.tech/neondb?sslmode=require"
        assert "sslmode=require" in url


def test_get_database_url_normalizes_postgres_scheme():
    """Verify legacy postgres:// scheme is normalized to postgresql:// for SQLAlchemy."""
    mock_settings = Settings(
        DATABASE_URL="postgres://user:pass@ep-test.neon.tech/neondb?sslmode=require",
    )
    with patch("backend.database.database.settings", mock_settings):
        url = get_database_url()
        assert url.startswith("postgresql://")
        assert not url.startswith("postgres://")
        assert "sslmode=require" in url


def test_get_database_url_neon_database_url_fallback():
    """Verify NEON_DATABASE_URL is used as fallback when DATABASE_URL is unset."""
    mock_settings = Settings(
        DATABASE_URL=None,
        NEON_DATABASE_URL="postgresql://user:pass@ep-neon.neon.tech/neondb?sslmode=require",
        SUPABASE_DATABASE_URL=None,
    )
    with patch("backend.database.database.settings", mock_settings):
        url = get_database_url()
        assert url == "postgresql://user:pass@ep-neon.neon.tech/neondb?sslmode=require"


def test_get_database_url_supabase_backward_compatibility():
    """Verify SUPABASE_DATABASE_URL fallback works for backward compatibility."""
    mock_settings = Settings(
        DATABASE_URL=None,
        NEON_DATABASE_URL=None,
        SUPABASE_DATABASE_URL="postgresql://user:pass@ep-legacy.supabase.co/postgres",
    )
    with patch("backend.database.database.settings", mock_settings):
        url = get_database_url()
        assert url == "postgresql://user:pass@ep-legacy.supabase.co/postgres"


def test_get_database_url_sqlite_fallback():
    """Verify SQLite fallback path is generated when no connection string is set."""
    mock_settings = Settings(
        DATABASE_URL=None,
        NEON_DATABASE_URL=None,
        SUPABASE_DATABASE_URL=None,
    )
    with patch("backend.database.database.settings", mock_settings):
        url = get_database_url()
        assert url.startswith("sqlite:///")
        assert url.endswith("gitissue.db")
