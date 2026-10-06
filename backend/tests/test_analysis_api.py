"""Tests for analysis lifecycle, limits, and CRUD endpoints (PRD §11.2, §11.3, AC-06, AC-11)."""
from datetime import datetime, timezone, timedelta
from unittest.mock import patch
import uuid
import pytest
import respx

from backend.database.models import Analysis, Repository, User


@respx.mock
def test_start_analysis_202_accepted(client, test_user, db_session):
    """Start analysis returns 202 with QUEUED status and queues background job (PRD §11.2)."""
    respx.get("https://api.github.com/repos/pallets/flask").respond(
        status_code=200,
        json={
            "id": 596892,
            "owner": {"login": "pallets"},
            "name": "flask",
            "full_name": "pallets/flask",
            "description": "Flask web microframework",
            "html_url": "https://github.com/pallets/flask",
            "stargazers_count": 68000,
            "forks_count": 16000,
            "open_issues_count": 12,
        },
    )

    req_payload = {
        "url": "https://github.com/pallets/flask",
        "config": {
            "k_mode": "auto",
            "issue_state": "all",
            "max_issues": 500,
            "min_doc_length": 8,
        },
    }

    with patch("backend.api.repositories.run_analysis_job") as mock_job:
        resp = client.post("/api/repositories/analyze", json=req_payload)
        assert resp.status_code == 202
        data = resp.json()
        assert "analysis_id" in data
        assert data["status"] == "QUEUED"
        mock_job.assert_called_once()

    # Verify repository was upserted for user
    repo = (
        db_session.query(Repository)
        .filter(Repository.user_id == test_user.id, Repository.full_name == "pallets/flask")
        .first()
    )
    assert repo is not None
    assert repo.github_repo_id == 596892

    # Verify analysis record was created in QUEUED status
    analysis_uuid = uuid.UUID(data["analysis_id"])
    analysis = db_session.query(Analysis).filter(Analysis.id == analysis_uuid).first()
    assert analysis is not None
    assert analysis.status == "QUEUED"
    assert analysis.progress_percent == 0


def test_start_analysis_config_validation(client):
    """Pydantic validation rejects manual mode without num_topics or auto with num_topics (PRD §8.3)."""
    # Manual mode without num_topics -> 422
    resp1 = client.post(
        "/api/repositories/analyze",
        json={"url": "https://github.com/owner/repo", "config": {"k_mode": "manual", "num_topics": None}},
    )
    assert resp1.status_code == 422
    assert resp1.json()["error"]["code"] == "VALIDATION_ERROR"

    # Auto mode with num_topics -> 422
    resp2 = client.post(
        "/api/repositories/analyze",
        json={"url": "https://github.com/owner/repo", "config": {"k_mode": "auto", "num_topics": 5}},
    )
    assert resp2.status_code == 422
    assert resp2.json()["error"]["code"] == "VALIDATION_ERROR"

    # num_topics out of range (< 3 or > 15) -> 422
    resp3 = client.post(
        "/api/repositories/analyze",
        json={"url": "https://github.com/owner/repo", "config": {"k_mode": "manual", "num_topics": 20}},
    )
    assert resp3.status_code == 422
    assert resp3.json()["error"]["code"] == "VALIDATION_ERROR"


@respx.mock
def test_per_user_active_limit_returns_429(client, test_user, db_session):
    """Second active analysis for the same user returns 429 ANALYSIS_LIMIT_REACHED (PRD §1, D-14, AC-06)."""
    # Create active analysis for test_user
    repo = Repository(
        id=uuid.uuid4(),
        user_id=test_user.id,
        github_repo_id=111,
        owner="owner",
        name="repo",
        full_name="owner/repo",
        html_url="https://github.com/owner/repo",
        stars=10,
        forks=2,
        open_issues_count=5,
    )
    db_session.add(repo)
    active_analysis = Analysis(
        id=uuid.uuid4(),
        user_id=test_user.id,
        repository_id=repo.id,
        status="FETCHING",
        progress_percent=15,
        config={"k_mode": "auto"},
    )
    db_session.add(active_analysis)
    db_session.commit()

    # Attempt to start a second analysis
    resp = client.post(
        "/api/repositories/analyze",
        json={"url": "https://github.com/owner/repo", "config": {"k_mode": "auto"}},
    )
    assert resp.status_code == 429
    assert resp.json()["error"]["code"] == "ANALYSIS_LIMIT_REACHED"


def test_per_user_hourly_limit_returns_429(client, test_user, db_session):
    """User exceeding 10 started analyses per rolling hour receives 429 (PRD D-14)."""
    repo = Repository(
        id=uuid.uuid4(),
        user_id=test_user.id,
        github_repo_id=222,
        owner="owner",
        name="repo",
        full_name="owner/repo",
        html_url="https://github.com/owner/repo",
        stars=10,
        forks=2,
        open_issues_count=5,
    )
    db_session.add(repo)

    # Insert 10 completed analyses started in the last 30 minutes
    now = datetime.now(timezone.utc)
    for i in range(10):
        db_session.add(
            Analysis(
                id=uuid.uuid4(),
                user_id=test_user.id,
                repository_id=repo.id,
                status="COMPLETED",
                progress_percent=100,
                created_at=now - timedelta(minutes=5 * i),
                config={"k_mode": "auto"},
            )
        )
    db_session.commit()

    # 11th request triggers hourly rate limit
    resp = client.post(
        "/api/repositories/analyze",
        json={"url": "https://github.com/owner/repo", "config": {"k_mode": "auto"}},
    )
    assert resp.status_code == 429
    assert resp.json()["error"]["code"] == "ANALYSIS_LIMIT_REACHED"


def test_list_analyses_pagination(client, test_user, db_session):
    """GET /api/analyses lists analyses newest first with total and items (PRD §11.3)."""
    repo = Repository(
        id=uuid.uuid4(),
        user_id=test_user.id,
        github_repo_id=333,
        owner="owner",
        name="repo",
        full_name="owner/repo",
        html_url="https://github.com/owner/repo",
        stars=10,
        forks=2,
        open_issues_count=5,
    )
    db_session.add(repo)

    now = datetime.now(timezone.utc)
    for i in range(5):
        db_session.add(
            Analysis(
                id=uuid.uuid4(),
                user_id=test_user.id,
                repository_id=repo.id,
                status="COMPLETED",
                progress_percent=100,
                created_at=now - timedelta(days=i),
                config={"k_mode": "auto"},
            )
        )
    db_session.commit()

    resp = client.get("/api/analyses?limit=3&offset=0")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 5
    assert len(data["items"]) == 3
    assert data["limit"] == 3
    assert data["offset"] == 0


def test_delete_analysis_active_returns_409(client, test_user, db_session):
    """Deleting an active analysis returns 409 ANALYSIS_ACTIVE (PRD §11.3, D-16)."""
    repo = Repository(
        id=uuid.uuid4(),
        user_id=test_user.id,
        github_repo_id=444,
        owner="owner",
        name="repo",
        full_name="owner/repo",
        html_url="https://github.com/owner/repo",
        stars=10,
        forks=2,
        open_issues_count=5,
    )
    db_session.add(repo)
    active_analysis = Analysis(
        id=uuid.uuid4(),
        user_id=test_user.id,
        repository_id=repo.id,
        status="TRAINING",
        progress_percent=60,
        config={"k_mode": "auto"},
    )
    db_session.add(active_analysis)
    db_session.commit()

    resp = client.delete(f"/api/analyses/{active_analysis.id}")
    assert resp.status_code == 409
    assert resp.json()["error"]["code"] == "ANALYSIS_ACTIVE"


def test_delete_analysis_completed_cascades_repository(client, test_user, db_session):
    """
    Deleting completed analysis returns 204.
    If repository has no remaining analyses, cascades repository deletion (PRD §10, D-10, AC-11).
    """
    repo = Repository(
        id=uuid.uuid4(),
        user_id=test_user.id,
        github_repo_id=555,
        owner="owner",
        name="repo",
        full_name="owner/repo",
        html_url="https://github.com/owner/repo",
        stars=10,
        forks=2,
        open_issues_count=5,
    )
    db_session.add(repo)
    completed_analysis = Analysis(
        id=uuid.uuid4(),
        user_id=test_user.id,
        repository_id=repo.id,
        status="COMPLETED",
        progress_percent=100,
        config={"k_mode": "auto"},
    )
    db_session.add(completed_analysis)
    db_session.commit()

    resp = client.delete(f"/api/analyses/{completed_analysis.id}")
    assert resp.status_code == 204

    # Verify analysis is deleted
    assert db_session.query(Analysis).filter(Analysis.id == completed_analysis.id).first() is None

    # Verify repository is also deleted since no remaining analyses exist for user
    assert db_session.query(Repository).filter(Repository.id == repo.id).first() is None
