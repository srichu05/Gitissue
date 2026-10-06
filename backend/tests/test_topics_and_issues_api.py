"""Tests for topic and issue APIs, label editing, and top 5 + Other distribution (PRD §11.4–§11.8, AC-07, AC-08)."""
from datetime import datetime, timezone
import uuid
import pytest

from backend.database.models import (
    Analysis,
    Issue,
    IssueTopicDistribution,
    Repository,
    Topic,
    TopicWord,
    User,
)


@pytest.fixture
def completed_analysis_with_data(db_session, test_user):
    """Seed a fully completed analysis with topics, words, issues, and distributions."""
    repo = Repository(
        id=uuid.uuid4(),
        user_id=test_user.id,
        github_repo_id=777888,
        owner="test-org",
        name="test-repo",
        full_name="test-org/test-repo",
        html_url="https://github.com/test-org/test-repo",
        stars=100,
        forks=20,
        open_issues_count=50,
    )
    db_session.add(repo)

    analysis = Analysis(
        id=uuid.uuid4(),
        user_id=test_user.id,
        repository_id=repo.id,
        status="COMPLETED",
        progress_percent=100,
        status_message="Analysis complete",
        num_topics=6,
        num_documents=10,
        config={"k_mode": "auto"},
    )
    db_session.add(analysis)

    # Create 6 topics
    topics = []
    prevalences = [0.30, 0.25, 0.15, 0.12, 0.10, 0.08]
    for idx, prev in enumerate(prevalences):
        t = Topic(
            id=uuid.uuid4(),
            analysis_id=analysis.id,
            topic_index=idx,
            auto_label=f"Word{idx}A / Word{idx}B / Word{idx}C",
            human_label=None,
            prevalence=prev,
            dominant_issue_count=2,
        )
        db_session.add(t)
        topics.append(t)

        # Add 15 words
        for rank in range(1, 16):
            w = TopicWord(
                topic_id=t.id,
                rank=rank,
                word=f"term_{idx}_{rank}",
                probability=round(0.20 / rank, 4),
            )
            db_session.add(w)

    # Create 2 issues
    now = datetime.now(timezone.utc)
    issue1 = Issue(
        id=uuid.uuid4(),
        repository_id=repo.id,
        github_issue_id=1001,
        number=101,
        title="Issue 101: GPU memory overflow",
        state="open",
        labels=["bug", "gpu"],
        author="octocat",
        comments_count=3,
        created_at_github=now,
        updated_at_github=now,
        html_url="https://github.com/test-org/test-repo/issues/101",
    )
    issue2 = Issue(
        id=uuid.uuid4(),
        repository_id=repo.id,
        github_issue_id=1002,
        number=102,
        title="Issue 102: Build failure with cmake",
        state="closed",
        labels=["build"],
        author="developer",
        comments_count=1,
        created_at_github=now,
        updated_at_github=now,
        html_url="https://github.com/test-org/test-repo/issues/102",
    )
    db_session.add(issue1)
    db_session.add(issue2)

    # Inferred topic distributions summing to 1.0
    # Issue 1: [0.45, 0.20, 0.15, 0.10, 0.06, 0.04]
    probs1 = [0.45, 0.20, 0.15, 0.10, 0.06, 0.04]
    for idx, prob in enumerate(probs1):
        db_session.add(
            IssueTopicDistribution(
                analysis_id=analysis.id,
                issue_id=issue1.id,
                topic_id=topics[idx].id,
                probability=prob,
            )
        )

    # Issue 2: [0.10, 0.10, 0.10, 0.10, 0.30, 0.30]
    probs2 = [0.10, 0.10, 0.10, 0.10, 0.30, 0.30]
    for idx, prob in enumerate(probs2):
        db_session.add(
            IssueTopicDistribution(
                analysis_id=analysis.id,
                issue_id=issue2.id,
                topic_id=topics[idx].id,
                probability=prob,
            )
        )

    db_session.commit()
    return analysis, topics, [issue1, issue2]


def test_list_topics_and_detail(client, completed_analysis_with_data):
    """GET /api/analyses/{id}/topics returns topics ordered by prevalence with 15 words (PRD §11.4)."""
    analysis, topics, _ = completed_analysis_with_data

    resp = client.get(f"/api/analyses/{analysis.id}/topics")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["topics"]) == 6
    # Ensure ordered by prevalence descending
    prevalences = [t["prevalence"] for t in data["topics"]]
    assert prevalences == sorted(prevalences, reverse=True)

    first_topic = data["topics"][0]
    assert len(first_topic["top_words"]) == 15
    assert first_topic["label_source"] == "auto"
    assert first_topic["display_label"] == first_topic["auto_label"]

    # Detail endpoint
    detail_resp = client.get(f"/api/topics/{first_topic['id']}")
    assert detail_resp.status_code == 200
    assert detail_resp.json()["id"] == first_topic["id"]


def test_topic_label_edit_and_reset(client, completed_analysis_with_data):
    """PATCH /api/topics/{id} edits label and reset toggles badge (PRD §8.6, §11.5, AC-08)."""
    _, topics, _ = completed_analysis_with_data
    topic = topics[0]

    # 1. Edit human label
    patch_resp = client.patch(
        f"/api/topics/{topic.id}",
        json={"human_label": "GPU Memory Failures"},
    )
    assert patch_resp.status_code == 200
    data = patch_resp.json()
    assert data["human_label"] == "GPU Memory Failures"
    assert data["display_label"] == "GPU Memory Failures"
    assert data["label_source"] == "human"

    # 2. Reset human label by sending null
    reset_resp = client.patch(
        f"/api/topics/{topic.id}",
        json={"human_label": None},
    )
    assert reset_resp.status_code == 200
    reset_data = reset_resp.json()
    assert reset_data["human_label"] is None
    assert reset_data["display_label"] == reset_data["auto_label"]
    assert reset_data["label_source"] == "auto"


def test_topic_representative_issues(client, completed_analysis_with_data):
    """GET /api/topics/{id}/issues returns representative issues ordered by probability desc (PRD §11.6)."""
    _, topics, issues = completed_analysis_with_data
    topic0 = topics[0]  # Issue 1 has prob 0.45, Issue 2 has prob 0.10

    resp = client.get(f"/api/topics/{topic0.id}/issues")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 2
    assert len(data["items"]) == 2
    assert data["items"][0]["number"] == 101
    assert data["items"][0]["probability"] == 0.45


def test_issue_detail_distribution_and_top5_other_sum(client, completed_analysis_with_data):
    """
    Issue detail returns distribution.
    When aggregated as Top 5 + Other, probabilities sum to 100% (PRD §11.8, AC-07).
    """
    analysis, _, issues = completed_analysis_with_data
    issue = issues[0]

    resp = client.get(f"/api/issues/{issue.id}?analysis_id={analysis.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["number"] == 101
    assert data["title"] == "Issue 101: GPU memory overflow"

    dist = data["distribution"]
    assert len(dist) == 6  # 6 topics total

    # Sum of all probabilities in distribution
    total_prob = sum(item["probability"] for item in dist)
    assert abs(total_prob - 1.0) < 1e-3

    # Client-side top 5 + Other aggregation rule (PRD §15.2, AC-07)
    top_5 = dist[:5]
    other = dist[5:]
    top_5_sum = sum(item["probability"] for item in top_5)
    other_sum = sum(item["probability"] for item in other)
    assert abs((top_5_sum + other_sum) - 1.0) < 1e-3


def test_issue_not_in_analysis_returns_404(client, completed_analysis_with_data, db_session):
    """Issue not in analysis corpus returns 404 ISSUE_NOT_IN_ANALYSIS (PRD §11.8)."""
    analysis, _, _ = completed_analysis_with_data

    # Create unanalyzed issue
    unrelated_issue = Issue(
        id=uuid.uuid4(),
        repository_id=analysis.repository_id,
        github_issue_id=9999,
        number=999,
        title="Unrelated issue",
        state="open",
        labels=[],
        created_at_github=datetime.now(timezone.utc),
        updated_at_github=datetime.now(timezone.utc),
        html_url="https://github.com/test-org/test-repo/issues/999",
    )
    db_session.add(unrelated_issue)
    db_session.commit()

    resp = client.get(f"/api/issues/{unrelated_issue.id}?analysis_id={analysis.id}")
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "ISSUE_NOT_IN_ANALYSIS"
