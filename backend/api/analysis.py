"""Analysis CRUD, status, trends, evaluation, corpus statistics, and export endpoints (PRD §11.3, §11.7, §11.9, §11.10, §11.11)."""
import csv
import io
import json
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.api.auth import get_current_user
from backend.database.database import get_db
from backend.database.models import (
    Analysis,
    Issue,
    IssueTopicDistribution,
    Repository,
    Topic,
    TopicWord,
    User,
)
from backend.schemas import (
    AnalysisDetailResponse,
    AnalysisListResponse,
    AnalysisSummary,
    CorpusStatsResponse,
    EvaluationResponse,
    EvaluationResultItem,
    MonthlyTrendSeries,
    MonthlyTrendTopic,
    RepositorySummary,
    TrendsResponse,
    WarningItem,
)

router = APIRouter(prefix="/analyses", tags=["analyses"])


def _get_user_analysis(analysis_id: UUID, user_id: UUID, db: Session) -> Analysis:
    """Fetch analysis ensuring user ownership. Returns 404 NOT_FOUND if missing or owned by another user (PRD D-20)."""
    analysis = (
        db.query(Analysis)
        .filter(Analysis.id == analysis_id, Analysis.user_id == user_id)
        .first()
    )
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Analysis not found."},
        )
    return analysis


@router.get("", response_model=AnalysisListResponse, summary="List user analyses paginated newest first")
def list_analyses(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all analyses for authenticated user sorted by created_at descending (PRD §11.3)."""
    query = (
        db.query(Analysis)
        .filter(Analysis.user_id == current_user.id)
        .order_by(Analysis.created_at.desc())
    )
    total = query.count()
    analyses = query.offset(offset).limit(limit).all()

    items = []
    for a in analyses:
        repo_name = a.repository.full_name if a.repository else "unknown/repo"
        k_mode = a.config.get("k_mode", "auto") if a.config else "auto"
        items.append(
            AnalysisSummary(
                id=a.id,
                status=a.status,
                progress_percent=a.progress_percent,
                repository_full_name=repo_name,
                k_mode=k_mode,
                num_topics=a.num_topics,
                num_documents=a.num_documents,
                created_at=a.created_at,
                completed_at=a.completed_at,
            )
        )

    return AnalysisListResponse(items=items, total=total, limit=limit, offset=offset)


@router.get("/{id}", response_model=AnalysisDetailResponse, summary="Get full analysis detail and progress")
def get_analysis(
    id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve full analysis detail (valid in any status; unfilled fields are null) (PRD §11.3)."""
    analysis = _get_user_analysis(id, current_user.id, db)

    repo_summary = None
    if analysis.repository:
        repo_summary = RepositorySummary(
            id=analysis.repository.id,
            owner=analysis.repository.owner,
            name=analysis.repository.name,
            full_name=analysis.repository.full_name,
            html_url=analysis.repository.html_url,
            stars=analysis.repository.stars,
            forks=analysis.repository.forks,
            open_issues_count=analysis.repository.open_issues_count,
        )

    warnings = [WarningItem(**w) for w in (analysis.warnings or [])]

    return AnalysisDetailResponse(
        id=analysis.id,
        status=analysis.status,
        progress_percent=analysis.progress_percent,
        status_message=analysis.status_message,
        error_code=analysis.error_code,
        error_message=analysis.error_message,
        warnings=warnings,
        repository=repo_summary,
        config=analysis.config or {},
        hyperparameters=analysis.hyperparameters,
        num_topics=analysis.num_topics,
        num_issues_fetched=analysis.num_issues_fetched,
        num_documents=analysis.num_documents,
        num_dropped=analysis.num_dropped,
        vocab_size=analysis.vocab_size,
        coherence_cv=analysis.coherence_cv,
        perplexity=analysis.perplexity,
        created_at=analysis.created_at,
        started_at=analysis.started_at,
        completed_at=analysis.completed_at,
    )


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete analysis with cascade cleanup")
def delete_analysis(
    id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Delete an analysis. Rejects with 409 if analysis is active.
    If repository has no remaining analyses for this user, deletes repository + issues (PRD §10, §11.3, D-10).
    """
    analysis = _get_user_analysis(id, current_user.id, db)

    # Cannot delete active analysis
    if analysis.status not in ["COMPLETED", "FAILED"]:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "ANALYSIS_ACTIVE", "message": "Cannot delete an active analysis."},
        )

    repo_id = analysis.repository_id

    # Delete analysis (cascades to topics, topic_words, issue_topic_distributions)
    db.delete(analysis)
    db.flush()

    # If repo has no remaining analyses for this user, delete repo and cascading issues
    remaining_analyses = (
        db.query(Analysis)
        .filter(Analysis.repository_id == repo_id, Analysis.user_id == current_user.id)
        .count()
    )

    if remaining_analyses == 0:
        repo = db.query(Repository).filter(Repository.id == repo_id).first()
        if repo:
            db.delete(repo)

    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{id}/trends", response_model=TrendsResponse, summary="Get monthly topic prevalence trends")
def get_analysis_trends(
    id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Compute monthly probability-weighted topic trends from issue_topic_distributions (PRD §9.9, §11.7, D-03).
    Each month's topic prevalence sums to 1.0.
    """
    analysis = _get_user_analysis(id, current_user.id, db)
    if analysis.status != "COMPLETED":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "ANALYSIS_NOT_COMPLETED", "message": "Analysis is not completed."},
        )

    # Fetch all distributions with issue created_at_github
    rows = (
        db.query(
            IssueTopicDistribution.topic_id,
            IssueTopicDistribution.probability,
            Issue.created_at_github,
            Issue.id.label("issue_id"),
        )
        .join(Issue, IssueTopicDistribution.issue_id == Issue.id)
        .filter(IssueTopicDistribution.analysis_id == id)
        .all()
    )

    # Group by month string (YYYY-MM)
    monthly_data = {}  # {month: {issue_ids: set, topic_probs: {topic_id: [probs]}}}
    all_topics = db.query(Topic).filter(Topic.analysis_id == id).all()
    topic_ids = [t.id for t in all_topics]

    for topic_id, prob, created_at, issue_id in rows:
        if not created_at:
            continue
        month_str = created_at.strftime("%Y-%m")
        if month_str not in monthly_data:
            monthly_data[month_str] = {"issues": set(), "topic_probs": {tid: [] for tid in topic_ids}}
        monthly_data[month_str]["issues"].add(issue_id)
        if topic_id in monthly_data[month_str]["topic_probs"]:
            monthly_data[month_str]["topic_probs"][topic_id].append(prob)

    sorted_months = sorted(monthly_data.keys())
    series: List[MonthlyTrendSeries] = []

    for month in sorted_months:
        m_info = monthly_data[month]
        issue_count = len(m_info["issues"])
        topic_means = []
        raw_sum = 0.0

        for tid in topic_ids:
            p_list = m_info["topic_probs"].get(tid, [])
            avg_p = sum(p_list) / len(p_list) if p_list else 0.0
            raw_sum += avg_p
            topic_means.append((tid, avg_p))

        # Renormalize to sum strictly to 1.0 (PRD §9.9, D-03)
        normalized_topics = []
        if raw_sum > 0:
            for tid, avg_p in topic_means:
                normalized_topics.append(MonthlyTrendTopic(topic_id=tid, prevalence=round(avg_p / raw_sum, 4)))
        else:
            eq_val = round(1.0 / max(len(topic_ids), 1), 4)
            for tid, _ in topic_means:
                normalized_topics.append(MonthlyTrendTopic(topic_id=tid, prevalence=eq_val))

        series.append(MonthlyTrendSeries(month=month, issue_count=issue_count, topics=normalized_topics))

    sufficient = len(sorted_months) >= 3

    return TrendsResponse(
        method="probability_weighted_mean",
        granularity="month",
        sufficient=sufficient,
        series=series,
    )


@router.get("/{id}/evaluation", response_model=EvaluationResponse, summary="Get K sweep coherence and perplexity evaluation")
def get_analysis_evaluation(
    id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve K sweep coherence and perplexity metrics (PRD §11.9)."""
    analysis = _get_user_analysis(id, current_user.id, db)
    if analysis.status != "COMPLETED":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "ANALYSIS_NOT_COMPLETED", "message": "Analysis is not completed."},
        )

    results_raw = analysis.evaluation_results or []
    eval_items = [
        EvaluationResultItem(
            k=item["k"],
            coherence_cv=item["coherence_cv"],
            log_perplexity_bound=item["log_perplexity_bound"],
            perplexity=item["perplexity"],
        )
        for item in results_raw
    ]

    best_k = analysis.num_topics or 5
    if eval_items:
        best_k = max(eval_items, key=lambda x: (x.coherence_cv, -x.k)).k

    return EvaluationResponse(
        k_mode=analysis.config.get("k_mode", "auto"),
        selected_k=analysis.num_topics or best_k,
        best_k_by_coherence=best_k,
        criterion="c_v_coherence",
        results=eval_items,
    )


@router.get("/{id}/corpus-stats", response_model=CorpusStatsResponse, summary="Get corpus vocabulary, statistics, and preprocessing samples")
def get_analysis_corpus_stats(
    id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve corpus vocabulary, length distributions, and 10 preprocessing samples (PRD §11.10)."""
    analysis = _get_user_analysis(id, current_user.id, db)
    if analysis.status != "COMPLETED":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "ANALYSIS_NOT_COMPLETED", "message": "Analysis is not completed."},
        )

    if not analysis.corpus_stats:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Corpus statistics not available."},
        )

    return CorpusStatsResponse(**analysis.corpus_stats)


@router.get("/{id}/export", summary="Export analysis report, topic words, or document-topic CSV")
def export_analysis(
    id: UUID,
    type: str = Query(
        ...,
        alias="type",
        pattern="^(report_md|report_json|topic_words_csv|doc_topics_csv)$",
        description="Export format type",
    ),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Export analysis data in one of 4 formats (PRD §11.11, D-30)."""
    analysis = _get_user_analysis(id, current_user.id, db)
    if analysis.status != "COMPLETED":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "ANALYSIS_NOT_COMPLETED", "message": "Analysis is not completed."},
        )

    repo_owner = analysis.repository.owner if analysis.repository else "owner"
    repo_name = analysis.repository.name if analysis.repository else "repo"
    short_id = str(analysis.id)[:8]

    # Fetch topics with top words
    topics = (
        db.query(Topic)
        .filter(Topic.analysis_id == id)
        .order_by(Topic.prevalence.desc())
        .all()
    )

    if type == "topic_words_csv":
        filename = f"gitissue-{repo_owner}-{repo_name}-{short_id}-topic_words.csv"
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["topic_index", "display_label", "rank", "word", "probability"])

        for t in topics:
            display_label = t.human_label if t.human_label else t.auto_label
            words = (
                db.query(TopicWord)
                .filter(TopicWord.topic_id == t.id)
                .order_by(TopicWord.rank.asc())
                .all()
            )
            for w in words:
                writer.writerow([t.topic_index, display_label, w.rank, w.word, f"{w.probability:.6f}"])

        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    elif type == "doc_topics_csv":
        filename = f"gitissue-{repo_owner}-{repo_name}-{short_id}-doc_topics.csv"
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["issue_number", "topic_index", "probability"])

        rows = (
            db.query(Issue.number, Topic.topic_index, IssueTopicDistribution.probability)
            .join(Issue, IssueTopicDistribution.issue_id == Issue.id)
            .join(Topic, IssueTopicDistribution.topic_id == Topic.id)
            .filter(IssueTopicDistribution.analysis_id == id)
            .order_by(Issue.number.asc(), Topic.topic_index.asc())
            .all()
        )

        for num, t_idx, prob in rows:
            writer.writerow([num, t_idx, f"{prob:.6f}"])

        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    elif type in ("report_md", "report_json"):
        # Build Topic Interpretation Report data structure
        report_data = {
            "repository": f"{repo_owner}/{repo_name}",
            "analysis_id": str(analysis.id),
            "date": analysis.completed_at.isoformat() if analysis.completed_at else None,
            "configuration": analysis.config,
            "hyperparameters": analysis.hyperparameters,
            "selected_k": analysis.num_topics,
            "coherence_cv": analysis.coherence_cv,
            "perplexity": analysis.perplexity,
            "num_documents": analysis.num_documents,
            "topics": [],
        }

        for t in topics:
            display_label = t.human_label if t.human_label else t.auto_label
            label_source = "human" if t.human_label else "auto"
            words = (
                db.query(TopicWord)
                .filter(TopicWord.topic_id == t.id)
                .order_by(TopicWord.rank.asc())
                .all()
            )
            # Fetch top 5 representative issues
            rep_issues = (
                db.query(Issue.number, Issue.title, Issue.html_url, IssueTopicDistribution.probability)
                .join(Issue, IssueTopicDistribution.issue_id == Issue.id)
                .filter(IssueTopicDistribution.topic_id == t.id)
                .order_by(IssueTopicDistribution.probability.desc(), Issue.number.desc())
                .limit(5)
                .all()
            )

            report_data["topics"].append({
                "topic_index": t.topic_index,
                "display_label": display_label,
                "label_source": label_source,
                "prevalence": t.prevalence,
                "dominant_issue_count": t.dominant_issue_count,
                "top_words": [{"rank": w.rank, "word": w.word, "probability": w.probability} for w in words],
                "representative_issues": [
                    {"number": num, "title": title, "url": url, "probability": prob}
                    for num, title, url, prob in rep_issues
                ],
            })

        if type == "report_json":
            filename = f"gitissue-{repo_owner}-{repo_name}-{short_id}-report.json"
            return Response(
                content=json.dumps(report_data, indent=2),
                media_type="application/json",
                headers={"Content-Disposition": f'attachment; filename="{filename}"'},
            )
        else:
            filename = f"gitissue-{repo_owner}-{repo_name}-{short_id}-report.md"
            md_lines = [
                f"# Topic Interpretation Report: {repo_owner}/{repo_name}",
                f"**Analysis ID:** `{str(analysis.id)}`  ",
                f"**Date:** {report_data['date']}  ",
                f"**Selected K:** {analysis.num_topics} | **C_v Coherence:** {analysis.coherence_cv:.4f} | **Perplexity:** {analysis.perplexity:.2f}  ",
                f"**Corpus Size:** {analysis.num_documents} issues  \n",
                "---",
                "## Discovered Topics\n",
            ]
            for t_item in report_data["topics"]:
                md_lines.append(f"### Topic {t_item['topic_index'] + 1}: {t_item['display_label']} ({t_item['label_source'].upper()})")
                md_lines.append(f"- **Prevalence:** {t_item['prevalence'] * 100:.1f}% ({t_item['dominant_issue_count']} dominant issues)")
                top_words_str = ", ".join([f"{w['word']} ({w['probability']:.3f})" for w in t_item['top_words'][:10]])
                md_lines.append(f"- **Top Words:** {top_words_str}")
                md_lines.append("- **Representative Issues:**")
                for r_issue in t_item["representative_issues"]:
                    md_lines.append(f"  - [#{r_issue['number']}]({r_issue['url']}) {r_issue['title']} (P={r_issue['probability']:.2f})")
                md_lines.append("")

            return Response(
                content="\n".join(md_lines),
                media_type="text/markdown",
                headers={"Content-Disposition": f'attachment; filename="{filename}"'},
            )

    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid export type.")
