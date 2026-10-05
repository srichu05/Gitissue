"""SQLAlchemy 2.x database models for GitIssue."""
import uuid
from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    JSON,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from backend.database.database import Base

# Universal JSON type supporting PostgreSQL JSONB and SQLite JSON
JsonType = JSON().with_variant(JSONB, "postgresql")


class User(Base):
    """Registered application user identified by Clerk user ID."""
    __tablename__ = "users"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    clerk_user_id = Column(String(255), unique=True, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    repositories = relationship("Repository", back_populates="user", cascade="all, delete-orphan")
    analyses = relationship("Analysis", back_populates="user", cascade="all, delete-orphan")


class Repository(Base):
    """GitHub repository associated with a user."""
    __tablename__ = "repositories"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    github_repo_id = Column(BigInteger, nullable=False)
    owner = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    full_name = Column(String(512), nullable=False)
    html_url = Column(String(1024), nullable=False)
    description = Column(Text, nullable=True)
    stars = Column(Integer, nullable=False, default=0)
    forks = Column(Integer, nullable=False, default=0)
    open_issues_count = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    __table_args__ = (
        UniqueConstraint("user_id", "github_repo_id", name="uq_repositories_user_repo"),
    )

    user = relationship("User", back_populates="repositories")
    issues = relationship("Issue", back_populates="repository", cascade="all, delete-orphan")
    analyses = relationship("Analysis", back_populates="repository", cascade="all, delete-orphan")


class Issue(Base):
    """Metadata-only GitHub issue representation (never persists issue body per PRD §10)."""
    __tablename__ = "issues"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    repository_id = Column(Uuid(as_uuid=True), ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False)
    github_issue_id = Column(BigInteger, nullable=False)
    number = Column(Integer, nullable=False)
    title = Column(Text, nullable=False)
    state = Column(String(32), nullable=False)
    labels = Column(JsonType, nullable=False, default=list)
    author = Column(String(255), nullable=True)
    comments_count = Column(Integer, nullable=False, default=0)
    created_at_github = Column(DateTime(timezone=True), nullable=False)
    updated_at_github = Column(DateTime(timezone=True), nullable=False)
    closed_at_github = Column(DateTime(timezone=True), nullable=True)
    html_url = Column(String(1024), nullable=False)
    fetched_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (
        UniqueConstraint("repository_id", "github_issue_id", name="uq_issues_repo_issue_id"),
        Index("ix_issues_repository_id_number", "repository_id", "number"),
        CheckConstraint("state IN ('open', 'closed')", name="ck_issues_state"),
    )

    repository = relationship("Repository", back_populates="issues")
    distributions = relationship("IssueTopicDistribution", back_populates="issue", cascade="all, delete-orphan")


class Analysis(Base):
    """Analysis record tracking lifecycle, parameters, and LDA results."""
    __tablename__ = "analyses"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    repository_id = Column(Uuid(as_uuid=True), ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(32), nullable=False, default="QUEUED")
    progress_percent = Column(SmallInteger, nullable=False, default=0)
    status_message = Column(Text, nullable=True)
    error_code = Column(String(64), nullable=True)
    error_message = Column(Text, nullable=True)
    warnings = Column(JsonType, nullable=False, default=list)
    config = Column(JsonType, nullable=False)
    hyperparameters = Column(JsonType, nullable=True)
    num_topics = Column(SmallInteger, nullable=True)
    num_issues_fetched = Column(Integer, nullable=True)
    num_documents = Column(Integer, nullable=True)
    num_dropped = Column(Integer, nullable=True)
    vocab_size = Column(Integer, nullable=True)
    coherence_cv = Column(Float, nullable=True)
    perplexity = Column(Float, nullable=True)
    evaluation_results = Column(JsonType, nullable=True)
    corpus_stats = Column(JsonType, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        CheckConstraint(
            "status IN ('QUEUED', 'FETCHING', 'PREPROCESSING', 'TRAINING', 'ANALYZING', 'COMPLETED', 'FAILED')",
            name="ck_analyses_status",
        ),
        Index("ix_analyses_user_id_created_at", "user_id", "created_at"),
        Index("ix_analyses_repository_id", "repository_id"),
    )

    user = relationship("User", back_populates="analyses")
    repository = relationship("Repository", back_populates="analyses")
    topics = relationship("Topic", back_populates="analysis", cascade="all, delete-orphan")
    distributions = relationship("IssueTopicDistribution", back_populates="analysis", cascade="all, delete-orphan")


class Topic(Base):
    """Discovered topic for an analysis."""
    __tablename__ = "topics"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    analysis_id = Column(Uuid(as_uuid=True), ForeignKey("analyses.id", ondelete="CASCADE"), nullable=False)
    topic_index = Column(SmallInteger, nullable=False)
    auto_label = Column(String(255), nullable=False)
    human_label = Column(String(60), nullable=True)
    prevalence = Column(Float, nullable=False)
    dominant_issue_count = Column(Integer, nullable=False, default=0)

    __table_args__ = (
        UniqueConstraint("analysis_id", "topic_index", name="uq_topics_analysis_index"),
    )

    analysis = relationship("Analysis", back_populates="topics")
    words = relationship("TopicWord", back_populates="topic", cascade="all, delete-orphan")
    distributions = relationship("IssueTopicDistribution", back_populates="topic", cascade="all, delete-orphan")


class TopicWord(Base):
    """Top-15 word distribution entry for a topic."""
    __tablename__ = "topic_words"

    id = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    topic_id = Column(Uuid(as_uuid=True), ForeignKey("topics.id", ondelete="CASCADE"), nullable=False)
    rank = Column(SmallInteger, nullable=False)
    word = Column(String(255), nullable=False)
    probability = Column(Float, nullable=False)

    __table_args__ = (
        UniqueConstraint("topic_id", "rank", name="uq_topic_words_topic_rank"),
    )

    topic = relationship("Topic", back_populates="words")


class IssueTopicDistribution(Base):
    """Inferred topic distribution probability for an issue in an analysis."""
    __tablename__ = "issue_topic_distributions"

    id = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    analysis_id = Column(Uuid(as_uuid=True), ForeignKey("analyses.id", ondelete="CASCADE"), nullable=False)
    issue_id = Column(Uuid(as_uuid=True), ForeignKey("issues.id", ondelete="CASCADE"), nullable=False)
    topic_id = Column(Uuid(as_uuid=True), ForeignKey("topics.id", ondelete="CASCADE"), nullable=False)
    probability = Column(Float, nullable=False)

    __table_args__ = (
        CheckConstraint("probability >= 0.0 AND probability <= 1.0", name="ck_issue_topic_prob"),
        UniqueConstraint("analysis_id", "issue_id", "topic_id", name="uq_issue_topic_dist"),
        Index("ix_itd_topic_id_probability", "topic_id", "probability"),
        Index("ix_itd_analysis_id_issue_id", "analysis_id", "issue_id"),
    )

    analysis = relationship("Analysis", back_populates="distributions")
    issue = relationship("Issue", back_populates="distributions")
    topic = relationship("Topic", back_populates="distributions")
