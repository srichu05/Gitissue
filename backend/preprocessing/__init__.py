"""Preprocessing package for GitIssue."""
from backend.preprocessing.protected_terms import PROTECTED_TERMS, DISPLAY_CASE, display_case
from backend.preprocessing.stopwords import DOMAIN_STOPWORDS, TEMPLATE_PHRASES, get_all_stopwords
from backend.preprocessing.text_processor import clean_text, process_issue_texts, ProcessedDocument

__all__ = [
    "PROTECTED_TERMS",
    "DISPLAY_CASE",
    "display_case",
    "DOMAIN_STOPWORDS",
    "TEMPLATE_PHRASES",
    "get_all_stopwords",
    "clean_text",
    "process_issue_texts",
    "ProcessedDocument",
]
