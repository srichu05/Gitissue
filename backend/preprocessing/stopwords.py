"""Domain stopwords, template phrases, and NLTK stopword handling for GitIssue."""
from typing import Set, List
import nltk

DOMAIN_STOPWORDS: Set[str] = {
    "issue",
    "issues",
    "please",
    "thanks",
    "thank",
    "hello",
    "hi",
    "hey",
    "would",
    "could",
    "should",
    "also",
    "like",
    "get",
    "got",
    "make",
    "want",
    "try",
    "tried",
    "seem",
    "seems",
    "thing",
    "way",
    "use",
    "using",
    "used",
    "work",
    "working",
}

TEMPLATE_PHRASES: List[str] = [
    "describe the bug",
    "steps to reproduce",
    "to reproduce",
    "reproduction steps",
    "minimal reproduction",
    "expected behavior",
    "actual behavior",
    "expected result",
    "actual result",
    "environment",
    "additional context",
    "screenshots",
    "system info",
    "error message",
    "stack trace",
]

_NLTK_STOPWORDS: Set[str] = set()


def get_nltk_stopwords() -> Set[str]:
    """Retrieve NLTK English stopwords, downloading if necessary."""
    global _NLTK_STOPWORDS
    if not _NLTK_STOPWORDS:
        try:
            from nltk.corpus import stopwords
            _NLTK_STOPWORDS = set(stopwords.words("english"))
        except LookupError:
            nltk.download("stopwords", quiet=True)
            from nltk.corpus import stopwords
            _NLTK_STOPWORDS = set(stopwords.words("english"))
    return _NLTK_STOPWORDS


def get_all_stopwords() -> Set[str]:
    """Return the union of NLTK English stopwords and domain stopwords."""
    return get_nltk_stopwords().union(DOMAIN_STOPWORDS)
