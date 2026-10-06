"""Tests for trends, evaluation, corpus statistics, and export endpoints (PRD §11.7, §11.9, §11.10, §11.11, AC-09, AC-10)."""
from datetime import datetime, timezone
import json
import uuid
import pytest

from backend.database.models import (
    Analysis,
    Issue,
    IssueTopicDistribution,
    Repository,
    Topic,
    TopicWord,
)


@pytest.fixture
def multi_month_analysis_with_data(db_session, test_user):
    """Seed analysis with issues spanning 4 calendar months to test trend aggregation."""
    repo = Repository(
        id=uuid.uuid4(),
        user_id=test_user.id,
        github_repo_id=888999,
        owner="trends-org",
        name="trends-repo",
        full_name="trends-org/trends-repo",
        html_url="https://github.com/trends-org/trends-repo",
        stars=50,
        forks=5,
        open_issues_count=20,
    )
    db_session.add(repo)

    eval_data = [
        {"k": 3, "coherence_cv": 0.42, "log_perplexity_bound": -7.2, "perplexity": 147.0},
        {"k": 5, "coherence_cv": 0.48, "log_perplexity_bound": -7.0, "perplexity": 128.0},
    ]

    corpus_stats_data = {
        "num_issues_fetched": 50,
        "num_documents": 48,
        "num_dropped": 2,
        "vocab_size": 350,
        "total_tokens": 1200,
        "avg_tokens_per_doc": 25.0,
        "min_tokens_per_doc": 8,
        "max_tokens_per_doc": 100,
        "top_terms": [{"term": "memory", "document_frequency": 20, "total_count": 45}],
        "samples": [
            {
                "issue_number": 1,
                "raw": "Issue text sample",
                "cleaned": "issue text sample",
                "tokenized": ["issue", "text", "sample"],
                "stopword_filtered": ["sample"],
                "lemmatized": ["sample"],
                "bow": [{"term": "sample", "count": 1}],
            }
        ],
        "document_term_matrix_preview": {
            "terms": ["memory", "cuda"],
            "rows": [{"issue_number": 1, "counts": [2, 1]}],
        },
    }

    analysis = Analysis(
        id=uuid.uuid4(),
        user_id=test_user.id,
        repository_id=repo.id,
        status="COMPLETED",
        progress_percent=100,
        status_message="Analysis complete",
        num_topics=2,
        num_documents=4,
        coherence_cv=0.48,
        perplexity=128.0,
        config={"k_mode": "auto"},
        evaluation_results=eval_data,
        corpus_stats=corpus_stats_data,
        completed_at=datetime.now(timezone.utc),
    )
    db_session.add(analysis)

    # Create 2 topics
    topic1 = Topic(
        id=uuid.uuid4(),
        analysis_id=analysis.id,
        topic_index=0,
        auto_label="CUDA / Memory / Allocator",
        human_label=None,
        prevalence=0.60,
        dominant_issue_count=3,
    )
    topic2 = Topic(
        id=uuid.uuid4(),
        analysis_id=analysis.id,
        topic_index=1,
        auto_label="Build / CMake / Error",
        human_label=None,
        prevalence=0.40,
        dominant_issue_count=1,
    )
    db_session.add(topic1)
    db_session.add(topic2)

    # Add topic words
    for rank in range(1, 16):
        db_session.add(TopicWord(topic_id=topic1.id, rank=rank, word=f"w1_{rank}", probability=0.1 / rank))
        db_session.add(TopicWord(topic_id=topic2.id, rank=rank, word=f"w2_{rank}", probability=0.1 / rank))

    # Create 4 issues across 4 months: 2026-01, 2026-02, 2026-03, 2026-04
    months = ["2026-01-15T00:00:00Z", "2026-02-15T00:00:00Z", "2026-03-15T00:00:00Z", "2026-04-15T00:00:00Z"]
    for i, m_str in enumerate(months):
        dt = datetime.fromisoformat(m_str.replace("Z", "+00:00"))
        iss = Issue(
            id=uuid.uuid4(),
            repository_id=repo.id,
            github_issue_id=2000 + i,
            number=i + 1,
            title=f"Issue in month {i+1}",
            state="open",
            labels=["bug"],
            created_at_github=dt,
            updated_at_github=dt,
            html_url=f"https://github.com/trends-org/trends-repo/issues/{i+1}",
        )
        db_session.add(iss)

        # Topic distributions
        db_session.add(IssueTopicDistribution(analysis_id=analysis.id, issue_id=iss.id, topic_id=topic1.id, probability=0.70))
        db_session.add(IssueTopicDistribution(analysis_id=analysis.id, issue_id=iss.id, topic_id=topic2.id, probability=0.30))

    db_session.commit()
    return analysis


def test_trends_endpoint_and_monthly_normalization(client, multi_month_analysis_with_data):
    """GET /api/analyses/{id}/trends: distinct months >= 3 sets sufficient=True, monthly totals sum to 1.0 (AC-09)."""
    analysis = multi_month_analysis_with_data

    resp = client.get(f"/api/analyses/{analysis.id}/trends")
    assert resp.status_code == 200
    data = resp.json()
    assert data["sufficient"] is True
    assert len(data["series"]) == 4

    for series_item in data["series"]:
        month_sum = sum(t["prevalence"] for t in series_item["topics"])
        assert abs(month_sum - 1.0) < 1e-3


def test_evaluation_and_corpus_stats(client, multi_month_analysis_with_data):
    """GET evaluation and corpus-stats return documented shapes (PRD §11.9, §11.10)."""
    analysis = multi_month_analysis_with_data

    # Evaluation
    eval_resp = client.get(f"/api/analyses/{analysis.id}/evaluation")
    assert eval_resp.status_code == 200
    eval_data = eval_resp.json()
    assert eval_data["criterion"] == "c_v_coherence"
    assert eval_data["best_k_by_coherence"] == 5
    assert len(eval_data["results"]) == 2

    # Corpus stats
    cs_resp = client.get(f"/api/analyses/{analysis.id}/corpus-stats")
    assert cs_resp.status_code == 200
    cs_data = cs_resp.json()
    assert cs_data["vocab_size"] == 350
    assert len(cs_data["samples"]) == 1
    assert "document_term_matrix_preview" in cs_data


def test_all_four_exports(client, multi_month_analysis_with_data):
    """Verify all 4 export types return correct content and attachment headers (PRD §11.11, AC-10)."""
    analysis = multi_month_analysis_with_data

    # 1. Topic words CSV
    resp_tw = client.get(f"/api/analyses/{analysis.id}/export?type=topic_words_csv")
    assert resp_tw.status_code == 200
    assert resp_tw.headers["content-type"].startswith("text/csv")
    assert "attachment; filename=" in resp_tw.headers["content-disposition"]
    assert "topic_index,display_label,rank,word,probability" in resp_tw.text

    # 2. Document topic distributions CSV
    resp_dt = client.get(f"/api/analyses/{analysis.id}/export?type=doc_topics_csv")
    assert resp_dt.status_code == 200
    assert resp_dt.headers["content-type"].startswith("text/csv")
    assert "issue_number,topic_index,probability" in resp_dt.text

    # 3. Topic interpretation report Markdown
    resp_md = client.get(f"/api/analyses/{analysis.id}/export?type=report_md")
    assert resp_md.status_code == 200
    assert "text/markdown" in resp_md.headers["content-type"]
    assert "# Topic Interpretation Report:" in resp_md.text
    assert "## Discovered Topics" in resp_md.text

    # 4. Topic interpretation report JSON
    resp_json = client.get(f"/api/analyses/{analysis.id}/export?type=report_json")
    assert resp_json.status_code == 200
    assert "application/json" in resp_json.headers["content-type"]
    parsed = resp_json.json()
    assert "repository" in parsed
    assert "topics" in parsed
    assert len(parsed["topics"]) == 2
