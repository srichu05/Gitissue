"""Tests for analysis lifecycle, startup recovery, and data retention rules (PRD §12, AC-01, AC-02, AC-05, AC-12, AC-14)."""
import uuid
from datetime import datetime, timezone
import pytest
from unittest.mock import MagicMock, patch

from backend.database.models import Analysis, Issue, Repository, Topic
from backend.services.analysis_runner import (
    recover_stale_analyses,
    run_analysis_job,
)


def test_startup_recovery_marks_non_terminal_failed(db_session, test_user):
    """
    On backend startup, any analysis in a non-terminal status must be marked FAILED
    with error_code = SERVER_RESTARTED (PRD §1, D-15, AC-12).
    """
    repo = Repository(
        id=uuid.uuid4(),
        user_id=test_user.id,
        github_repo_id=999111,
        owner="owner",
        name="repo",
        full_name="owner/repo",
        html_url="https://github.com/owner/repo",
        stars=10,
        forks=2,
        open_issues_count=5,
    )
    db_session.add(repo)

    # Insert analyses across all non-terminal states
    non_terminal_statuses = ["QUEUED", "FETCHING", "PREPROCESSING", "TRAINING", "ANALYZING"]
    stale_ids = []
    for st in non_terminal_statuses:
        stale_a = Analysis(
            id=uuid.uuid4(),
            user_id=test_user.id,
            repository_id=repo.id,
            status=st,
            progress_percent=20,
            config={"k_mode": "auto"},
        )
        db_session.add(stale_a)
        stale_ids.append(stale_a.id)

    # Insert COMPLETED and FAILED analyses
    completed_a = Analysis(
        id=uuid.uuid4(),
        user_id=test_user.id,
        repository_id=repo.id,
        status="COMPLETED",
        progress_percent=100,
        config={"k_mode": "auto"},
    )
    db_session.add(completed_a)

    failed_a = Analysis(
        id=uuid.uuid4(),
        user_id=test_user.id,
        repository_id=repo.id,
        status="FAILED",
        progress_percent=40,
        error_code="CUSTOM_ERROR",
        config={"k_mode": "auto"},
    )
    db_session.add(failed_a)
    db_session.commit()

    # Execute recovery
    recovered_count = recover_stale_analyses(db_session)
    assert recovered_count == 5

    # Verify all non-terminal analyses are now FAILED with SERVER_RESTARTED
    for a_id in stale_ids:
        a = db_session.query(Analysis).filter(Analysis.id == a_id).first()
        assert a.status == "FAILED"
        assert a.error_code == "SERVER_RESTARTED"
        assert "server restart" in a.error_message.lower()

    # Verify terminal analyses were left untouched
    c = db_session.query(Analysis).filter(Analysis.id == completed_a.id).first()
    assert c.status == "COMPLETED"
    f = db_session.query(Analysis).filter(Analysis.id == failed_a.id).first()
    assert f.status == "FAILED"
    assert f.error_code == "CUSTOM_ERROR"


def test_issue_body_never_persisted_in_database():
    """
    Issue BODY must NEVER be stored in PostgreSQL or the issues table (PRD §1, D-09, §10, AC-14).
    Verified via SQLAlchemy column inspection.
    """
    column_names = [col.name for col in Issue.__table__.columns]
    assert "body" not in column_names
    assert "raw_body" not in column_names
    assert "content" not in column_names
    assert "text" not in column_names


def test_insufficient_data_fails_analysis(db_session, test_user):
    """
    Repositories with fewer than 50 usable issues fail with INSUFFICIENT_DATA (PRD §9.3, AC-05).
    """
    repo = Repository(
        id=uuid.uuid4(),
        user_id=test_user.id,
        github_repo_id=999222,
        owner="owner",
        name="sparse-repo",
        full_name="owner/sparse-repo",
        html_url="https://github.com/owner/sparse-repo",
        stars=10,
        forks=2,
        open_issues_count=5,
    )
    db_session.add(repo)

    analysis = Analysis(
        id=uuid.uuid4(),
        user_id=test_user.id,
        repository_id=repo.id,
        status="QUEUED",
        progress_percent=0,
        config={"k_mode": "auto"},
    )
    db_session.add(analysis)
    db_session.commit()

    # Mock GitHubClient to return only 10 issues
    mock_issues = [
        {
            "github_issue_id": 100 + i,
            "number": i + 1,
            "title": f"Sparse issue {i}",
            "body": "Brief body description here.",
            "state": "open",
            "labels": ["bug"],
            "comments_count": 0,
            "created_at_github": "2026-01-01T00:00:00Z",
            "updated_at_github": "2026-01-01T00:00:00Z",
            "html_url": f"https://github.com/owner/sparse-repo/issues/{i+1}",
        }
        for i in range(10)
    ]

    with patch("backend.services.analysis_runner.GitHubClient") as MockClient:
        mock_instance = MockClient.return_value
        mock_instance.fetch_issues.return_value = MagicMock(
            issues=mock_issues,
            warnings=[],
            total_fetched=10,
        )

        with patch.object(db_session, "close"):
            with patch("backend.services.analysis_runner.SessionLocal", return_value=db_session):
                run_analysis_job(
                    analysis_id=analysis.id,
                    repository_id=repo.id,
                    user_id=test_user.id,
                    owner="owner",
                    repo="sparse-repo",
                    config={"k_mode": "auto"},
                )

        db_session.refresh(analysis)
        assert analysis.status == "FAILED"
        assert analysis.error_code == "INSUFFICIENT_DATA"
        assert "minimum 50 required" in analysis.error_message.lower()
