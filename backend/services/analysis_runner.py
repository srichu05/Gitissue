"""Asynchronous analysis runner, lifecycle management, and persistence (PRD §8.8, §12, D-14, D-15)."""
from datetime import datetime, timezone, timedelta
import logging
import threading
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy.orm import Session

from backend.config import settings
from backend.database.database import SessionLocal
from backend.database.models import (
    Analysis,
    Issue,
    IssueTopicDistribution,
    Repository,
    Topic,
    TopicWord,
)
from backend.github.github_client import GitHubClient, GitHubError
from backend.lda.model import InsufficientDataError
from backend.lda.pipeline import IssueInput, PipelineConfig, run_lda_pipeline

logger = logging.getLogger(__name__)

# Global concurrency semaphore (PRD §1, D-14)
_global_semaphore = threading.BoundedSemaphore(settings.MAX_CONCURRENT_ANALYSES)


class AnalysisLimitReachedError(Exception):
    """Raised when a user exceeds active or hourly analysis limits (PRD §11.12, 429)."""
    pass


def check_user_limits(user_id: UUID, db: Session) -> None:
    """Enforce per-user concurrency and hourly rate limits (PRD §1, D-14)."""
    # 1. Active analysis limit: max 1 active analysis per user
    active_count = (
        db.query(Analysis)
        .filter(
            Analysis.user_id == user_id,
            Analysis.status.in_(["QUEUED", "FETCHING", "PREPROCESSING", "TRAINING", "ANALYZING"]),
        )
        .count()
    )
    if active_count > 0:
        raise AnalysisLimitReachedError(
            "You already have an active analysis running. Please wait for it to complete."
        )

    # 2. Hourly limit: max 10 analyses started per rolling hour
    one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
    hourly_count = (
        db.query(Analysis)
        .filter(
            Analysis.user_id == user_id,
            Analysis.created_at >= one_hour_ago,
        )
        .count()
    )
    if hourly_count >= settings.MAX_ANALYSES_PER_USER_PER_HOUR:
        raise AnalysisLimitReachedError(
            "Hourly analysis limit reached (maximum 10 analyses started per rolling hour)."
        )


def recover_stale_analyses(db: Session) -> int:
    """
    On backend startup, find any non-terminal analyses and mark them FAILED
    with error_code = SERVER_RESTARTED (PRD §1, D-15, §16).
    """
    stale_analyses = (
        db.query(Analysis)
        .filter(
            Analysis.status.in_(["QUEUED", "FETCHING", "PREPROCESSING", "TRAINING", "ANALYZING"])
        )
        .all()
    )
    count = len(stale_analyses)
    for analysis in stale_analyses:
        analysis.status = "FAILED"
        analysis.error_code = "SERVER_RESTARTED"
        analysis.error_message = (
            "Analysis was interrupted by a server restart. Please start a new analysis."
        )
        analysis.status_message = "Interrupted by server restart"

    if count > 0:
        db.commit()
        logger.warning(f"Startup recovery: marked {count} stale analyses as FAILED (SERVER_RESTARTED).")
    return count


def _update_analysis_progress(
    db: Session,
    analysis_id: UUID,
    status: str,
    progress_percent: int,
    status_message: str,
    started: bool = False,
) -> None:
    """Update analysis status and progress in a short committed transaction."""
    analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if analysis:
        analysis.status = status
        analysis.progress_percent = progress_percent
        analysis.status_message = status_message
        if started and not analysis.started_at:
            analysis.started_at = datetime.now(timezone.utc)
        db.commit()


def run_analysis_job(
    analysis_id: UUID,
    repository_id: UUID,
    user_id: UUID,
    owner: str,
    repo: str,
    config: Dict[str, Any],
) -> None:
    """
    Synchronous analysis job executed via FastAPI BackgroundTasks in a worker thread (PRD §12).
    Acquires global semaphore, transitions through lifecycle, and transactionally persists results.
    """
    acquired = _global_semaphore.acquire(blocking=True)
    db = SessionLocal()
    try:
        # Mark as started in FETCHING stage (PRD §12)
        _update_analysis_progress(
            db=db,
            analysis_id=analysis_id,
            status="FETCHING",
            progress_percent=5,
            status_message="Connecting to GitHub and fetching issues...",
            started=True,
        )

        max_issues = config.get("max_issues", 500)
        issue_state = config.get("issue_state", "all")
        github_client = GitHubClient()

        # Step 1: Fetch issues from GitHub (PRD §14)
        def on_fetch_progress(fetched: int, target: int):
            # Scale progress from 5% to 30%
            pct = 5 + int((min(fetched, target) / max(target, 1)) * 25)
            _update_analysis_progress(
                db=db,
                analysis_id=analysis_id,
                status="FETCHING",
                progress_percent=pct,
                status_message=f"Fetched {fetched} issues...",
            )

        fetch_result = github_client.fetch_issues(
            owner=owner,
            repo=repo,
            state=issue_state,
            max_issues=max_issues,
            progress_cb=on_fetch_progress,
        )

        raw_issues = fetch_result.issues
        warnings = list(fetch_result.warnings)

        if len(raw_issues) < 50:
            raise InsufficientDataError(
                f"Not enough usable issues to model topics (found {len(raw_issues)}, minimum 50 required)."
            )

        # Step 2: Upsert issues in database (METADATA ONLY, NEVER persist body per PRD §10, D-09)
        _update_analysis_progress(
            db=db,
            analysis_id=analysis_id,
            status="PREPROCESSING",
            progress_percent=30,
            status_message="Synchronizing issue metadata...",
        )

        # Keep issue body in memory only for LDA pipeline (IssueInput)
        pipeline_issues: List[IssueInput] = []
        for raw in raw_issues:
            # Upsert into database without body
            existing_issue = (
                db.query(Issue)
                .filter(
                    Issue.repository_id == repository_id,
                    Issue.github_issue_id == raw["github_issue_id"],
                )
                .first()
            )

            # Parse GitHub timestamp
            created_at_dt = None
            if raw.get("created_at_github"):
                try:
                    created_at_dt = datetime.fromisoformat(
                        raw["created_at_github"].replace("Z", "+00:00")
                    )
                except Exception:
                    created_at_dt = datetime.now(timezone.utc)
            else:
                created_at_dt = datetime.now(timezone.utc)

            updated_at_dt = created_at_dt
            if raw.get("updated_at_github"):
                try:
                    updated_at_dt = datetime.fromisoformat(
                        raw["updated_at_github"].replace("Z", "+00:00")
                    )
                except Exception:
                    pass

            closed_at_dt = None
            if raw.get("closed_at_github"):
                try:
                    closed_at_dt = datetime.fromisoformat(
                        raw["closed_at_github"].replace("Z", "+00:00")
                    )
                except Exception:
                    pass

            if existing_issue:
                existing_issue.number = raw["number"]
                existing_issue.title = raw["title"]
                existing_issue.state = raw.get("state", "open")
                existing_issue.labels = raw.get("labels", [])
                existing_issue.author = raw.get("author")
                existing_issue.comments_count = raw.get("comments_count", 0)
                existing_issue.created_at_github = created_at_dt
                existing_issue.updated_at_github = updated_at_dt
                existing_issue.closed_at_github = closed_at_dt
                existing_issue.html_url = raw.get("html_url", "")
                existing_issue.fetched_at = datetime.now(timezone.utc)
            else:
                new_issue = Issue(
                    repository_id=repository_id,
                    github_issue_id=raw["github_issue_id"],
                    number=raw["number"],
                    title=raw["title"],
                    state=raw.get("state", "open"),
                    labels=raw.get("labels", []),
                    author=raw.get("author"),
                    comments_count=raw.get("comments_count", 0),
                    created_at_github=created_at_dt,
                    updated_at_github=updated_at_dt,
                    closed_at_github=closed_at_dt,
                    html_url=raw.get("html_url", ""),
                    fetched_at=datetime.now(timezone.utc),
                )
                db.add(new_issue)

            # In-memory only issue input with body for text processor
            pipeline_issues.append(
                IssueInput(
                    number=raw["number"],
                    title=raw["title"],
                    body=raw.get("body", ""),
                    created_at=created_at_dt,
                    github_issue_id=raw["github_issue_id"],
                )
            )

        db.commit()

        # Step 3: Run the shared Phase 1 LDA pipeline (PRD §7.2, §9)
        pipeline_config = PipelineConfig(
            k_mode=config.get("k_mode", "auto"),
            num_topics=config.get("num_topics"),
            min_doc_length=config.get("min_doc_length", 8),
            seed=settings.DEFAULT_SEED,
        )

        def on_pipeline_progress(msg: str, step: int, total: int):
            # Map steps to lifecycle stages:
            # 10..35: PREPROCESSING (30% -> 45%)
            # 45..85: TRAINING (45% -> 85%)
            # 85..100: ANALYZING (85% -> 99%)
            if step <= 35:
                stage = "PREPROCESSING"
                scaled_pct = 30 + int((step / 35) * 15)
            elif step <= 85:
                stage = "TRAINING"
                scaled_pct = 45 + int(((step - 35) / 50) * 40)
            else:
                stage = "ANALYZING"
                scaled_pct = 85 + int(((step - 85) / 15) * 14)

            _update_analysis_progress(
                db=db,
                analysis_id=analysis_id,
                status=stage,
                progress_percent=min(99, max(5, scaled_pct)),
                status_message=msg,
            )

        pipeline_result = run_lda_pipeline(
            issues=pipeline_issues,
            config=pipeline_config,
            progress_cb=on_pipeline_progress,
        )

        warnings.extend(pipeline_result.warnings)

        # Step 4: Transactional Persistence of Results (PRD §12)
        _update_analysis_progress(
            db=db,
            analysis_id=analysis_id,
            status="ANALYZING",
            progress_percent=95,
            status_message="Persisting discovered topics and issue distributions...",
        )

        # Map retained issue numbers to Issue DB IDs
        retained_numbers = pipeline_result.documents
        db_issues = (
            db.query(Issue)
            .filter(
                Issue.repository_id == repository_id,
                Issue.number.in_(retained_numbers),
            )
            .all()
        )
        issue_map = {issue.number: issue.id for issue in db_issues}

        # 4a. Create Topic records
        created_topics: Dict[int, Topic] = {}
        for topic_dict in pipeline_result.topics:
            t_idx = topic_dict["index"]
            new_topic = Topic(
                analysis_id=analysis_id,
                topic_index=t_idx,
                auto_label=topic_dict["auto_label"],
                human_label=None,
                prevalence=topic_dict["prevalence"],
                dominant_issue_count=topic_dict["dominant_issue_count"],
            )
            db.add(new_topic)
            created_topics[t_idx] = new_topic

        db.flush()  # Assign UUIDs to topics

        # 4b. Create TopicWord records
        for topic_dict in pipeline_result.topics:
            t_idx = topic_dict["index"]
            topic_record = created_topics[t_idx]
            for word_item in topic_dict["top_words"]:
                word_record = TopicWord(
                    topic_id=topic_record.id,
                    rank=word_item["rank"],
                    word=word_item["word"],
                    probability=word_item["probability"],
                )
                db.add(word_record)

        # 4c. Create IssueTopicDistribution records (all K rows per retained document)
        doc_topic_matrix = pipeline_result.doc_topic
        for doc_idx, issue_num in enumerate(retained_numbers):
            issue_id = issue_map.get(issue_num)
            if not issue_id:
                continue
            probs = doc_topic_matrix[doc_idx]
            for t_idx, prob in enumerate(probs):
                topic_record = created_topics.get(t_idx)
                if topic_record:
                    itd = IssueTopicDistribution(
                        analysis_id=analysis_id,
                        issue_id=issue_id,
                        topic_id=topic_record.id,
                        probability=prob,
                    )
                    db.add(itd)

        # 4d. Finalize Analysis row
        analysis_record = db.query(Analysis).filter(Analysis.id == analysis_id).first()
        if analysis_record:
            analysis_record.status = "COMPLETED"
            analysis_record.progress_percent = 100
            analysis_record.status_message = "Analysis complete"
            analysis_record.completed_at = datetime.now(timezone.utc)
            analysis_record.num_topics = pipeline_result.selected_k
            analysis_record.num_issues_fetched = len(raw_issues)
            analysis_record.num_documents = len(retained_numbers)
            analysis_record.num_dropped = pipeline_result.num_dropped
            analysis_record.vocab_size = pipeline_result.vocab_size
            analysis_record.coherence_cv = pipeline_result.coherence_cv
            analysis_record.perplexity = pipeline_result.perplexity
            analysis_record.hyperparameters = pipeline_result.hyperparameters
            analysis_record.evaluation_results = pipeline_result.evaluation_results
            analysis_record.corpus_stats = pipeline_result.corpus_stats
            analysis_record.warnings = warnings

        # Commit everything in ONE single transaction (PRD §12)
        db.commit()
        logger.info(f"Analysis {analysis_id} completed successfully (K={pipeline_result.selected_k}).")

    except InsufficientDataError as e:
        db.rollback()
        logger.warning(f"Analysis {analysis_id} failed: INSUFFICIENT_DATA - {str(e)}")
        _mark_analysis_failed(db, analysis_id, "INSUFFICIENT_DATA", str(e))
    except GitHubError as e:
        db.rollback()
        logger.warning(f"Analysis {analysis_id} failed: {e.code} - {e.message}")
        _mark_analysis_failed(db, analysis_id, e.code, e.message)
    except Exception as e:
        db.rollback()
        logger.exception(f"Analysis {analysis_id} unexpected failure: {str(e)}")
        _mark_analysis_failed(
            db,
            analysis_id,
            "INTERNAL_ERROR",
            "An unexpected error occurred during analysis processing.",
        )
    finally:
        db.close()
        if acquired:
            _global_semaphore.release()


def _mark_analysis_failed(
    db: Session,
    analysis_id: UUID,
    error_code: str,
    error_message: str,
) -> None:
    """Mark analysis as FAILED with specific code and message without leaking stack traces."""
    try:
        analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
        if analysis:
            analysis.status = "FAILED"
            analysis.error_code = error_code
            analysis.error_message = error_message
            analysis.status_message = f"Failed: {error_message}"
            analysis.completed_at = datetime.now(timezone.utc)
            db.commit()
    except Exception as e:
        logger.error(f"Failed to record failure state for analysis {analysis_id}: {str(e)}")
