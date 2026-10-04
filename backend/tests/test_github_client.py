"""Unit tests for GitHub REST client with mocked HTTP responses using respx (PRD §6 & §14)."""
import pytest
import respx
import httpx
from backend.github.github_client import (
    GitHubClient,
    GitHubRepoNotFoundError,
    GitHubRateLimitedError,
    GitHubUnavailableError,
)


@respx.mock
def test_validate_repository_success():
    """Verify repository validation parses metadata correctly."""
    repo_data = {
        "owner": {"login": "pytorch"},
        "name": "pytorch",
        "full_name": "pytorch/pytorch",
        "description": "Tensors and Dynamic neural networks in Python",
        "html_url": "https://github.com/pytorch/pytorch",
        "stargazers_count": 75000,
        "forks_count": 20000,
        "open_issues_count": 5000,
    }
    respx.get("https://api.github.com/repos/pytorch/pytorch").mock(
        return_value=httpx.Response(200, json=repo_data)
    )

    client = GitHubClient()
    meta = client.validate_repository("pytorch", "pytorch")
    assert meta["owner"] == "pytorch"
    assert meta["name"] == "pytorch"
    assert meta["stars"] == 75000
    assert meta["forks"] == 20000
    assert meta["open_issues_count"] == 5000


@respx.mock
def test_validate_repository_not_found():
    """404 status should raise GitHubRepoNotFoundError."""
    respx.get("https://api.github.com/repos/fake/unknown").mock(
        return_value=httpx.Response(404, json={"message": "Not Found"})
    )

    client = GitHubClient()
    with pytest.raises(GitHubRepoNotFoundError):
        client.validate_repository("fake", "unknown")


@respx.mock
def test_fetch_issues_excludes_pull_requests():
    """fetch_issues must filter out items with a pull_request key (PRD §14)."""
    page_items = [
        {
            "id": 1001,
            "number": 1,
            "title": "Legitimate Issue",
            "body": "Here is an issue",
            "state": "open",
            "labels": [{"name": "bug"}],
            "user": {"login": "dev1"},
            "comments": 2,
            "created_at": "2026-01-01T00:00:00Z",
            "updated_at": "2026-01-02T00:00:00Z",
            "closed_at": None,
            "html_url": "https://github.com/test/repo/issues/1",
        },
        {
            "id": 1002,
            "number": 2,
            "title": "Pull Request to be excluded",
            "body": "Fixes bug",
            "pull_request": {"url": "https://api.github.com/repos/test/repo/pulls/2"},
            "state": "open",
            "labels": [],
            "user": {"login": "dev2"},
            "comments": 0,
            "created_at": "2026-01-01T00:00:00Z",
            "updated_at": "2026-01-02T00:00:00Z",
            "closed_at": None,
            "html_url": "https://github.com/test/repo/pulls/2",
        },
    ]

    respx.get("https://api.github.com/repos/test/repo/issues").mock(
        return_value=httpx.Response(200, json=page_items)
    )

    client = GitHubClient()
    res = client.fetch_issues("test", "repo", max_issues=10)
    assert len(res.issues) == 1
    assert res.issues[0]["number"] == 1
    assert res.issues[0]["title"] == "Legitimate Issue"
