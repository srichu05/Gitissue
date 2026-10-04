"""GitHub integration package for GitIssue."""
from backend.github.github_client import (
    GitHubClient,
    GitHubError,
    GitHubRepoNotFoundError,
    GitHubRepoUnavailableError,
    GitHubRateLimitedError,
    GitHubUnavailableError,
    FetchResult,
)

__all__ = [
    "GitHubClient",
    "GitHubError",
    "GitHubRepoNotFoundError",
    "GitHubRepoUnavailableError",
    "GitHubRateLimitedError",
    "GitHubUnavailableError",
    "FetchResult",
]
