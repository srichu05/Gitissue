"""Pydantic v2 request and response schemas for GitIssue API (PRD §11)."""
from datetime import datetime
from typing import Any, Dict, List, Literal, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


# ---------------------------------------------------------------------------
# Error Schemas (PRD §11.12)
# ---------------------------------------------------------------------------

class ErrorDetail(BaseModel):
    code: str
    message: str
    retry_after_seconds: Optional[int] = None


class ErrorResponse(BaseModel):
    error: ErrorDetail


# ---------------------------------------------------------------------------
# Repository Validation Schemas (PRD §11.1)
# ---------------------------------------------------------------------------

class ValidateRepoRequest(BaseModel):
    url: str = Field(..., description="GitHub repository URL")


class ValidateRepoResponse(BaseModel):
    owner: str
    name: str
    full_name: str
    description: Optional[str] = None
    html_url: str
    stars: int
    forks: int
    open_issues_count: int


# ---------------------------------------------------------------------------
# Analysis Configuration & Start Schemas (PRD §8.3, §11.2)
# ---------------------------------------------------------------------------

class AnalysisConfigInput(BaseModel):
    k_mode: Literal["auto", "manual"] = "auto"
    num_topics: Optional[int] = Field(default=None, ge=3, le=15)
    issue_state: Literal["open", "closed", "all"] = "all"
    max_issues: int = Field(default=500, ge=50, le=1000)
    min_doc_length: int = Field(default=8, ge=3, le=100)

    @model_validator(mode="after")
    def validate_k_mode_and_topics(self) -> "AnalysisConfigInput":
        if self.k_mode == "manual":
            if self.num_topics is None:
                raise ValueError("num_topics is required when k_mode is 'manual'")
        elif self.k_mode == "auto":
            if self.num_topics is not None:
                raise ValueError("num_topics must be null when k_mode is 'auto'")
        return self


class StartAnalysisRequest(BaseModel):
    url: str
    config: AnalysisConfigInput = Field(default_factory=AnalysisConfigInput)


class StartAnalysisResponse(BaseModel):
    analysis_id: UUID
    status: str


# ---------------------------------------------------------------------------
# Analysis Detail & Summary Schemas (PRD §11.3)
# ---------------------------------------------------------------------------

class RepositorySummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    owner: str
    name: str
    full_name: str
    html_url: str
    stars: int
    forks: int
    open_issues_count: int


class WarningItem(BaseModel):
    code: str
    message: str


class AnalysisSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    status: str
    progress_percent: int
    repository_full_name: str
    k_mode: str
    num_topics: Optional[int] = None
    num_documents: Optional[int] = None
    created_at: datetime
    completed_at: Optional[datetime] = None


class AnalysisListResponse(BaseModel):
    items: List[AnalysisSummary]
    total: int
    limit: int
    offset: int


class AnalysisDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    status: str
    progress_percent: int
    status_message: Optional[str] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    warnings: List[WarningItem] = Field(default_factory=list)
    repository: Optional[RepositorySummary] = None
    config: Dict[str, Any]
    hyperparameters: Optional[Dict[str, Any]] = None
    num_topics: Optional[int] = None
    num_issues_fetched: Optional[int] = None
    num_documents: Optional[int] = None
    num_dropped: Optional[int] = None
    vocab_size: Optional[int] = None
    coherence_cv: Optional[float] = None
    perplexity: Optional[float] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


# ---------------------------------------------------------------------------
# Topic Schemas (PRD §11.4, §11.5, §11.6)
# ---------------------------------------------------------------------------

class TopicWordItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    rank: int
    word: str
    probability: float


class TopicResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    analysis_id: UUID
    topic_index: int
    auto_label: str
    human_label: Optional[str] = None
    display_label: str
    label_source: Literal["auto", "human"]
    prevalence: float
    dominant_issue_count: int
    top_words: List[TopicWordItem]


class TopicListResponse(BaseModel):
    topics: List[TopicResponse]


class UpdateTopicLabelRequest(BaseModel):
    human_label: Optional[str] = Field(
        default=None,
        description="Editable human topic label (1-60 chars) or null to reset to auto_label",
    )

    @field_validator("human_label")
    @classmethod
    def validate_label_length(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        trimmed = v.strip()
        if not trimmed:
            return None
        if len(trimmed) > 60:
            raise ValueError("human_label cannot exceed 60 characters")
        return trimmed


class RepresentativeIssueItem(BaseModel):
    id: UUID
    number: int
    title: str
    state: str
    probability: float
    html_url: str


class RepresentativeIssuesResponse(BaseModel):
    items: List[RepresentativeIssueItem]
    total: int
    limit: int
    offset: int


# ---------------------------------------------------------------------------
# Trend Schemas (PRD §9.9, §11.7)
# ---------------------------------------------------------------------------

class MonthlyTrendTopic(BaseModel):
    topic_id: UUID
    prevalence: float


class MonthlyTrendSeries(BaseModel):
    month: str  # YYYY-MM
    issue_count: int
    topics: List[MonthlyTrendTopic]


class TrendsResponse(BaseModel):
    method: str = "probability_weighted_mean"
    granularity: str = "month"
    sufficient: bool
    series: List[MonthlyTrendSeries]


# ---------------------------------------------------------------------------
# Issue Detail Schemas (PRD §11.8)
# ---------------------------------------------------------------------------

class IssueDistributionItem(BaseModel):
    topic_id: UUID
    topic_index: int
    display_label: str
    probability: float


class IssueDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    number: int
    title: str
    state: str
    labels: List[str]
    author: Optional[str] = None
    comments_count: int
    created_at_github: datetime
    updated_at_github: datetime
    closed_at_github: Optional[datetime] = None
    html_url: str
    distribution: List[IssueDistributionItem]


# ---------------------------------------------------------------------------
# Evaluation & Corpus Stats Schemas (PRD §11.9, §11.10)
# ---------------------------------------------------------------------------

class EvaluationResultItem(BaseModel):
    k: int
    coherence_cv: float
    log_perplexity_bound: float
    perplexity: float


class EvaluationResponse(BaseModel):
    k_mode: str
    selected_k: int
    best_k_by_coherence: int
    criterion: str = "c_v_coherence"
    results: List[EvaluationResultItem]
    note: str = "K is chosen by C_v coherence; perplexity is training-set and informational only."


class TermFrequencyItem(BaseModel):
    term: str
    document_frequency: int
    total_count: int


class PreprocessingSample(BaseModel):
    issue_number: int
    raw: str
    cleaned: str
    tokenized: List[str]
    stopword_filtered: List[str]
    lemmatized: List[str]
    bow: List[Dict[str, Any]]


class DTMPreviewRow(BaseModel):
    issue_number: int
    counts: List[int]


class DTMPreview(BaseModel):
    terms: List[str]
    rows: List[DTMPreviewRow]


class CorpusStatsResponse(BaseModel):
    num_issues_fetched: int
    num_documents: int
    num_dropped: int
    vocab_size: int
    total_tokens: int
    avg_tokens_per_doc: float
    min_tokens_per_doc: int
    max_tokens_per_doc: int
    top_terms: List[TermFrequencyItem]
    samples: List[PreprocessingSample]
    document_term_matrix_preview: DTMPreview
