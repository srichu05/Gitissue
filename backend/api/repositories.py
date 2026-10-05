"""Repository validation and analysis initiation endpoints (PRD §11.1, §11.2)."""
import logging
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.api.auth import get_current_user
from backend.database.database import get_db
from backend.database.models import Analysis, Repository, User
from backend.github.github_client import (
    GitHubClient,
    GitHubError,
    GitHubInvalidURLError,
    parse_github_url,
)
from backend.schemas import (
    StartAnalysisRequest,
    StartAnalysisResponse,
    ValidateRepoRequest,
    ValidateRepoResponse,
)
from backend.services.analysis_runner import (
    AnalysisLimitReachedError,
    check_user_limits,
    run_analysis_job,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/repositories", tags=["repositories"])


@router.post(
    "/validate",
    response_model=ValidateRepoResponse,
    status_code=status.HTTP_200_OK,
    summary="Validate GitHub repository URL and fetch metadata without creating analysis",
)
def validate_repository(
    request: ValidateRepoRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Validate repository URL format and check public accessibility against GitHub REST API (PRD §11.1).
    Stateless: writes nothing to database.
    """
    try:
        owner, repo_name = parse_github_url(request.url)
    except GitHubInvalidURLError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_URL", "message": str(e)},
        )

    github_client = GitHubClient()
    try:
        metadata = github_client.validate_repository(owner, repo_name)
    except GitHubError as e:
        status_code = status.HTTP_400_BAD_REQUEST
        if e.code == "REPO_NOT_FOUND":
            status_code = status.HTTP_404_NOT_FOUND
        elif e.code == "GITHUB_RATE_LIMITED":
            status_code = status.HTTP_429_TOO_MANY_REQUESTS
        elif e.code == "REPO_UNAVAILABLE":
            status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
        elif e.code == "GITHUB_UNAVAILABLE":
            status_code = status.HTTP_502_BAD_GATEWAY
        raise HTTPException(
            status_code=status_code,
            detail={"code": e.code, "message": e.message, "retry_after_seconds": e.retry_after_seconds},
        )
    except Exception as e:
        logger.exception("Unexpected error during repository validation")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "INTERNAL_ERROR", "message": "Failed to validate repository."},
        )

    return ValidateRepoResponse(
        owner=metadata["owner"],
        name=metadata["name"],
        full_name=metadata["full_name"],
        description=metadata.get("description"),
        html_url=metadata["html_url"],
        stars=metadata["stars"],
        forks=metadata["forks"],
        open_issues_count=metadata["open_issues_count"],
    )


@router.post(
    "/analyze",
    response_model=StartAnalysisResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Validate repository, enforce concurrency limits, and queue background analysis",
)
def start_analysis(
    request: StartAnalysisRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Queue a new topic analysis job for a repository (PRD §11.2).
    Enforces per-user concurrency and hourly rate limits (PRD §1, D-14).
    """
    # 1. Validate repository URL
    try:
        owner, repo_name = parse_github_url(request.url)
    except GitHubInvalidURLError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_URL", "message": str(e)},
        )

    # 2. Check user concurrency and rate limits
    try:
        check_user_limits(current_user.id, db)
    except AnalysisLimitReachedError as e:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={"code": "ANALYSIS_LIMIT_REACHED", "message": str(e)},
        )

    # 3. Re-validate repository accessibility
    github_client = GitHubClient()
    try:
        metadata = github_client.validate_repository(owner, repo_name)
    except GitHubError as e:
        status_code = status.HTTP_400_BAD_REQUEST
        if e.code == "REPO_NOT_FOUND":
            status_code = status.HTTP_404_NOT_FOUND
        elif e.code == "GITHUB_RATE_LIMITED":
            status_code = status.HTTP_429_TOO_MANY_REQUESTS
        elif e.code == "REPO_UNAVAILABLE":
            status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
        elif e.code == "GITHUB_UNAVAILABLE":
            status_code = status.HTTP_502_BAD_GATEWAY
        raise HTTPException(
            status_code=status_code,
            detail={"code": e.code, "message": e.message, "retry_after_seconds": e.retry_after_seconds},
        )

    # 4. Upsert repository for this user
    github_repo_id = metadata["github_repo_id"]
    repo = (
        db.query(Repository)
        .filter(
            Repository.user_id == current_user.id,
            Repository.github_repo_id == github_repo_id,
        )
        .first()
    )

    if repo:
        repo.owner = metadata["owner"]
        repo.name = metadata["name"]
        repo.full_name = metadata["full_name"]
        repo.html_url = metadata["html_url"]
        repo.description = metadata.get("description")
        repo.stars = metadata["stars"]
        repo.forks = metadata["forks"]
        repo.open_issues_count = metadata["open_issues_count"]
    else:
        repo = Repository(
            user_id=current_user.id,
            github_repo_id=github_repo_id,
            owner=metadata["owner"],
            name=metadata["name"],
            full_name=metadata["full_name"],
            html_url=metadata["html_url"],
            description=metadata.get("description"),
            stars=metadata["stars"],
            forks=metadata["forks"],
            open_issues_count=metadata["open_issues_count"],
        )
        db.add(repo)

    db.commit()
    db.refresh(repo)

    # 5. Create Analysis record in QUEUED status
    config_dict = request.config.model_dump()
    analysis = Analysis(
        user_id=current_user.id,
        repository_id=repo.id,
        status="QUEUED",
        progress_percent=0,
        status_message="Queued for execution...",
        config=config_dict,
        warnings=[],
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    # 6. Schedule background job via FastAPI BackgroundTasks
    background_tasks.add_task(
        run_analysis_job,
        analysis_id=analysis.id,
        repository_id=repo.id,
        user_id=current_user.id,
        owner=owner,
        repo=repo_name,
        config=config_dict,
    )

    return StartAnalysisResponse(
        analysis_id=analysis.id,
        status="QUEUED",
    )
