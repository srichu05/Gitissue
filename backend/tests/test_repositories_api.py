"""Tests for repository validation and initiation API (PRD §8.2, §11.1, AC-03, AC-04)."""
import respx
import httpx
import pytest
from backend.database.models import Repository


@respx.mock
def test_validate_repository_success(client, db_session):
    """Valid repository returns 200 with metadata and writes nothing to DB (PRD §11.1)."""
    respx.get("https://api.github.com/repos/pallets/flask").respond(
        status_code=200,
        json={
            "id": 596892,
            "owner": {"login": "pallets"},
            "name": "flask",
            "full_name": "pallets/flask",
            "description": "The Python micro framework for building web applications.",
            "html_url": "https://github.com/pallets/flask",
            "stargazers_count": 68000,
            "forks_count": 16000,
            "open_issues_count": 12,
        },
    )

    resp = client.post("/api/repositories/validate", json={"url": "https://github.com/pallets/flask"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["owner"] == "pallets"
    assert data["name"] == "flask"
    assert data["full_name"] == "pallets/flask"
    assert data["stars"] == 68000
    assert data["open_issues_count"] == 12

    # Verify statelessness: nothing persisted to database
    repo_count = db_session.query(Repository).count()
    assert repo_count == 0


def test_validate_repository_invalid_url(client):
    """Invalid URL format or non-github domain returns 400 INVALID_URL without DB write (PRD AC-03)."""
    # Non-github domain (SSRF guard)
    resp = client.post("/api/repositories/validate", json={"url": "https://gitlab.com/owner/repo"})
    assert resp.status_code == 400
    assert resp.json()["error"]["code"] == "INVALID_URL"

    # Shorthand notation rejected
    resp_short = client.post("/api/repositories/validate", json={"url": "owner/repo"})
    assert resp_short.status_code == 400
    assert resp_short.json()["error"]["code"] == "INVALID_URL"

    # Empty URL rejected
    resp_empty = client.post("/api/repositories/validate", json={"url": ""})
    assert resp_empty.status_code == 400
    assert resp_empty.json()["error"]["code"] == "INVALID_URL"


@respx.mock
def test_validate_repository_not_found(client):
    """Nonexistent or private repository returns 404 REPO_NOT_FOUND (PRD AC-04)."""
    respx.get("https://api.github.com/repos/nonexistent/private-repo").respond(
        status_code=404,
        json={"message": "Not Found"},
    )

    resp = client.post(
        "/api/repositories/validate",
        json={"url": "https://github.com/nonexistent/private-repo"},
    )
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "REPO_NOT_FOUND"


@respx.mock
def test_validate_repository_rate_limited(client):
    """Rate limited request returns 429 GITHUB_RATE_LIMITED with retry_after_seconds."""
    respx.get("https://api.github.com/repos/owner/repo").respond(
        status_code=403,
        headers={"x-ratelimit-remaining": "0", "retry-after": "120"},
        json={"message": "API rate limit exceeded"},
    )

    resp = client.post("/api/repositories/validate", json={"url": "https://github.com/owner/repo"})
    assert resp.status_code == 429
    data = resp.json()
    assert data["error"]["code"] == "GITHUB_RATE_LIMITED"
    assert data["error"]["retry_after_seconds"] == 120


@respx.mock
def test_validate_repository_unavailable(client):
    """GitHub 451 or administrative block returns 422 REPO_UNAVAILABLE."""
    respx.get("https://api.github.com/repos/owner/dmca-repo").respond(
        status_code=451,
        json={"message": "Repository unavailable due to DMCA takedown"},
    )

    resp = client.post("/api/repositories/validate", json={"url": "https://github.com/owner/dmca-repo"})
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "REPO_UNAVAILABLE"


@respx.mock
def test_validate_repository_server_error(client):
    """GitHub 5xx failures return 502 GITHUB_UNAVAILABLE."""
    respx.get("https://api.github.com/repos/owner/repo").respond(
        status_code=500,
        json={"message": "Internal Server Error"},
    )

    resp = client.post("/api/repositories/validate", json={"url": "https://github.com/owner/repo"})
    assert resp.status_code == 502
    assert resp.json()["error"]["code"] == "GITHUB_UNAVAILABLE"
