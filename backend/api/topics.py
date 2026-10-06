"""Topic discovery, detail, label editing, and representative issue endpoints (PRD §8.6, §11.4, §11.5, §11.6)."""
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
    TopicWord,
    User,
)
from backend.schemas import (
    RepresentativeIssueItem,
    RepresentativeIssuesResponse,
    TopicListResponse,
    TopicResponse,
    TopicWordItem,
    UpdateTopicLabelRequest,
)

router = APIRouter(tags=["topics"])


def _build_topic_response(topic: Topic, db: Session) -> TopicResponse:
    """Construct TopicResponse with 15 raw top words and source badge indicator."""
    display_label = topic.human_label if topic.human_label else topic.auto_label
    label_source = "human" if topic.human_label else "auto"

    words = (
        db.query(TopicWord)
        .filter(TopicWord.topic_id == topic.id)
        .order_by(TopicWord.rank.asc())
        .all()
    )

    top_words = [
        TopicWordItem(rank=w.rank, word=w.word, probability=w.probability)
        for w in words
    ]

    return TopicResponse(
        id=topic.id,
        analysis_id=topic.analysis_id,
        topic_index=topic.topic_index,
        auto_label=topic.auto_label,
        human_label=topic.human_label,
        display_label=display_label,
        label_source=label_source,
        prevalence=topic.prevalence,
        dominant_issue_count=topic.dominant_issue_count,
        top_words=top_words,
    )


# ---------------------------------------------------------------------------
# GET /api/analyses/{id}/topics
# ---------------------------------------------------------------------------
@router.get(
    "/analyses/{id}/topics",
    response_model=TopicListResponse,
    summary="List all discovered topics for an analysis ordered by prevalence desc",
)
def list_analysis_topics(
    id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve all discovered topics with raw top 15 words (PRD §11.4)."""
    analysis = (
        db.query(Analysis)
        .filter(Analysis.id == id, Analysis.user_id == current_user.id)
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

    topics = (
        db.query(Topic)
        .filter(Topic.analysis_id == id)
        .order_by(Topic.prevalence.desc())
        .all()
    )

    topic_items = [_build_topic_response(t, db) for t in topics]
    return TopicListResponse(topics=topic_items)


# ---------------------------------------------------------------------------
# GET /api/topics/{topic_id} and GET /api/analyses/{id}/topics/{topic_id}
# ---------------------------------------------------------------------------
@router.get(
    "/topics/{topic_id}",
    response_model=TopicResponse,
    summary="Get topic detail by topic ID",
)
@router.get(
    "/analyses/{id}/topics/{topic_id}",
    response_model=TopicResponse,
    summary="Get topic detail scoped by analysis ID",
)
def get_topic_detail(
    topic_id: UUID,
    id: Optional[UUID] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve single topic detail with top 15 word probabilities (PRD §11.5)."""
    topic = db.query(Topic).filter(Topic.id == topic_id).first()
    if not topic or not topic.analysis or topic.analysis.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Topic not found."},
        )
    if id and topic.analysis_id != id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Topic not found in specified analysis."},
        )
    if topic.analysis.status != "COMPLETED":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "ANALYSIS_NOT_COMPLETED", "message": "Analysis is not completed."},
        )

    return _build_topic_response(topic, db)


# ---------------------------------------------------------------------------
# PATCH /api/topics/{topic_id} and PATCH /api/analyses/{id}/topics/{topic_id}/label
# ---------------------------------------------------------------------------
@router.patch(
    "/topics/{topic_id}",
    response_model=TopicResponse,
    summary="Edit or reset human topic label",
)
@router.patch(
    "/analyses/{id}/topics/{topic_id}/label",
    response_model=TopicResponse,
    summary="Edit or reset human topic label scoped by analysis",
)
def update_topic_label(
    topic_id: UUID,
    request: UpdateTopicLabelRequest,
    id: Optional[UUID] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update human-edited topic label (1-60 chars) or pass null to reset to auto_label (PRD §8.6, §11.5).
    Allowed only when analysis is COMPLETED.
    """
    topic = db.query(Topic).filter(Topic.id == topic_id).first()
    if not topic or not topic.analysis or topic.analysis.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Topic not found."},
        )
    if id and topic.analysis_id != id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Topic not found in specified analysis."},
        )
    if topic.analysis.status != "COMPLETED":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "ANALYSIS_NOT_COMPLETED", "message": "Cannot edit topic label for uncompleted analysis."},
        )

    topic.human_label = request.human_label
    db.commit()
    db.refresh(topic)

    return _build_topic_response(topic, db)


# ---------------------------------------------------------------------------
# GET /api/topics/{topic_id}/issues and GET /api/analyses/{id}/topics/{topic_id}/issues
# ---------------------------------------------------------------------------
@router.get(
    "/topics/{topic_id}/issues",
    response_model=RepresentativeIssuesResponse,
    summary="Get representative issues for a topic",
)
@router.get(
    "/analyses/{id}/topics/{topic_id}/issues",
    response_model=RepresentativeIssuesResponse,
    summary="Get representative issues for a topic scoped by analysis",
)
def get_topic_representative_issues(
    topic_id: UUID,
    id: Optional[UUID] = None,
    limit: int = Query(default=10, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve representative issues ordered by probability DESC, number DESC (PRD §11.6).
    """
    topic = db.query(Topic).filter(Topic.id == topic_id).first()
    if not topic or not topic.analysis or topic.analysis.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Topic not found."},
        )
    if id and topic.analysis_id != id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Topic not found in specified analysis."},
        )
    if topic.analysis.status != "COMPLETED":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "ANALYSIS_NOT_COMPLETED", "message": "Analysis is not completed."},
        )

    query = (
        db.query(
            Issue.id,
            Issue.number,
            Issue.title,
            Issue.state,
            IssueTopicDistribution.probability,
            Issue.html_url,
        )
        .join(Issue, IssueTopicDistribution.issue_id == Issue.id)
        .filter(IssueTopicDistribution.topic_id == topic_id)
        .order_by(IssueTopicDistribution.probability.desc(), Issue.number.desc())
    )

    total = query.count()
    rows = query.offset(offset).limit(limit).all()

    items = [
        RepresentativeIssueItem(
            id=r[0],
            number=r[1],
            title=r[2],
            state=r[3],
            probability=r[4],
            html_url=r[5],
        )
        for r in rows
    ]

    return RepresentativeIssuesResponse(items=items, total=total, limit=limit, offset=offset)
