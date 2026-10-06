"""Tests for Clerk JWT authentication and authorization (PRD §8.1, §13, D-17, D-19, D-20)."""
import time
import uuid
import jwt
import pytest
from fastapi import HTTPException

from backend.api.auth import verify_clerk_jwt
from backend.config import settings
from backend.database.models import Analysis, Repository, User


def test_health_check_unauthenticated(unauthed_client):
    """Health check must be publicly accessible without authentication (PRD §11)."""
    resp = unauthed_client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}

    api_resp = unauthed_client.get("/api/health")
    assert api_resp.status_code == 200
    assert api_resp.json() == {"status": "ok"}


def test_protected_endpoint_requires_auth(unauthed_client):
    """Protected endpoints must reject requests without Bearer token with 401 UNAUTHENTICATED (PRD §8.1)."""
    resp = unauthed_client.get("/api/analyses")
    assert resp.status_code == 401
    data = resp.json()
    assert data["error"]["code"] == "UNAUTHENTICATED"


def test_verify_jwt_malformed_token():
    """Malformed token string must raise 401 UNAUTHENTICATED."""
    with pytest.raises(HTTPException) as exc_info:
        verify_clerk_jwt("not.a.valid.jwt.token")
    assert exc_info.value.status_code == 401
    assert exc_info.value.detail["code"] == "UNAUTHENTICATED"


def test_verify_jwt_test_token_sub():
    """In offline test mode, test_token_{sub} returns payload with sub."""
    payload = verify_clerk_jwt("test_token_user_12345")
    assert payload["sub"] == "user_12345"


def test_cross_user_resource_access_returns_404(client, other_user, db_session):
    """
    Accessing another user's analysis must return 404 NOT_FOUND (PRD §1, D-20, AC-13).
    Must never leak resource existence via 403.
    """
    # Create repository and analysis owned by other_user
    other_repo = Repository(
        id=uuid.uuid4(),
        user_id=other_user.id,
        github_repo_id=999888,
        owner="other-owner",
        name="other-repo",
        full_name="other-owner/other-repo",
        html_url="https://github.com/other-owner/other-repo",
        stars=10,
        forks=2,
        open_issues_count=5,
    )
    db_session.add(other_repo)

    other_analysis = Analysis(
        id=uuid.uuid4(),
        user_id=other_user.id,
        repository_id=other_repo.id,
        status="COMPLETED",
        progress_percent=100,
        config={"k_mode": "auto"},
    )
    db_session.add(other_analysis)
    db_session.commit()

    # Current user (test_user) attempts to get other_user's analysis
    resp = client.get(f"/api/analyses/{other_analysis.id}")
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "NOT_FOUND"

    # Attempt delete
    del_resp = client.delete(f"/api/analyses/{other_analysis.id}")
    assert del_resp.status_code == 404
    assert del_resp.json()["error"]["code"] == "NOT_FOUND"
