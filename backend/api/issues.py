"""Issue detail and topic distribution endpoints (PRD §11.8)."""
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.api.auth import get_current_user
from backend.database.database import get_db
from backend.database.models import (
    Analysis,
    Issue,
    IssueTopicDistribution,
    Topic,
    User,
)
from backend.schemas import IssueDetailResponse, IssueDistributionItem

router = APIRouter(tags=["issues"])


def _get_issue_detail(
    issue_id: UUID,
    analysis_id: UUID,
    current_user_id: UUID,
    db: Session,
) -> IssueDetailResponse:
    """Helper to fetch and format issue detail with topic distribution."""
    # Verify user ownership of the analysis
    analysis = (
        db.query(Analysis)
        .filter(Analysis.id == analysis_id, Analysis.user_id == current_user_id)
        .first()
    )
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Analysis not found."},
        )

    if analysis.status != "COMPLETED":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "ANALYSIS_NOT_COMPLETED", "message": "Analysis is not completed."},
        )

    # Fetch issue
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Issue not found."},
        )

    # Fetch distributions for this issue in this analysis
    dist_rows = (
        db.query(
            IssueTopicDistribution.topic_id,
            IssueTopicDistribution.probability,
            Topic.topic_index,
            Topic.auto_label,
            Topic.human_label,
        )
        .join(Topic, IssueTopicDistribution.topic_id == Topic.id)
        .filter(
            IssueTopicDistribution.analysis_id == analysis_id,
            IssueTopicDistribution.issue_id == issue_id,
        )
        .order_by(IssueTopicDistribution.probability.desc(), Topic.topic_index.asc())
        .all()
    )

    if not dist_rows:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "ISSUE_NOT_IN_ANALYSIS",
                "message": "Issue was not part of this analysis' corpus (e.g. excluded during preprocessing).",
            },
        )

    distribution_items = []
    for topic_id, prob, t_idx, auto_label, human_label in dist_rows:
        display_label = human_label if human_label else auto_label
        distribution_items.append(
            IssueDistributionItem(
                topic_id=topic_id,
                topic_index=t_idx,
                display_label=display_label,
                probability=prob,
            )
        )

    return IssueDetailResponse(
        id=issue.id,
        number=issue.number,
        title=issue.title,
        state=issue.state,
        labels=issue.labels or [],
        author=issue.author,
        comments_count=issue.comments_count,
        created_at_github=issue.created_at_github,
        updated_at_github=issue.updated_at_github,
        closed_at_github=issue.closed_at_github,
        html_url=issue.html_url,
        distribution=distribution_items,
    )


# ---------------------------------------------------------------------------
# GET /api/issues/{id}?analysis_id={analysis_id}
# ---------------------------------------------------------------------------
@router.get(
    "/issues/{id}",
    response_model=IssueDetailResponse,
    summary="Get issue detail and topic distribution by issue ID and analysis_id query param",
)
def get_issue(
    id: UUID,
    analysis_id: UUID = Query(..., description="Analysis ID for which to retrieve topic distribution"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve issue detail with its complete topic distribution in the specified analysis (PRD §11.8)."""
    return _get_issue_detail(
        issue_id=id,
        analysis_id=analysis_id,
        current_user_id=current_user.id,
        db=db,
    )


# ---------------------------------------------------------------------------
# GET /api/analyses/{id}/issues/{issue_id}
# ---------------------------------------------------------------------------
@router.get(
    "/analyses/{id}/issues/{issue_id}",
    response_model=IssueDetailResponse,
    summary="Get issue detail and topic distribution scoped by analysis ID",
)
def get_analysis_issue(
    id: UUID,
    issue_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve issue detail with topic distribution scoped by analysis ID."""
    return _get_issue_detail(
        issue_id=issue_id,
        analysis_id=id,
        current_user_id=current_user.id,
        db=db,
    )
