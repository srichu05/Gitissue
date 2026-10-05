"""Configuration management for GitIssue."""
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables and .env file."""
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    SUPABASE_DATABASE_URL: Optional[str] = None
    GITHUB_TOKEN: Optional[str] = None
    CLERK_JWKS_URL: Optional[str] = None
    CLERK_ISSUER: Optional[str] = None
    ALLOWED_ORIGINS: str = "http://localhost:5173,https://gitissue.vercel.app"
    MAX_ISSUES_CAP: int = 1000
    MAX_CONCURRENT_ANALYSES: int = 2
    MAX_ANALYSES_PER_USER_PER_HOUR: int = 10
    LOG_LEVEL: str = "INFO"

    # Sentry Configuration
    SENTRY_DSN: Optional[str] = None
    SENTRY_ENVIRONMENT: str = "development"

    @property
    def allowed_origins_list(self) -> list[str]:
        """Parse comma-separated ALLOWED_ORIGINS into list of trimmed strings."""
        if not self.ALLOWED_ORIGINS:
            return []
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    # ML Pipeline fixed configuration defaults
    DEFAULT_SEED: int = 42
    DEFAULT_MIN_DOC_LENGTH: int = 8
    DEFAULT_MAX_ISSUES: int = 500


settings = Settings()
