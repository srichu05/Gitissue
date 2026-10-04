"""Unit tests for GitHub-aware preprocessing (PRD §9.1 & §9.2)."""
import pytest
from backend.preprocessing.text_processor import (
    clean_text,
    clean_markdown_and_html,
    process_single_issue,
    process_issue_texts,
)
from backend.preprocessing.protected_terms import (
    PROTECTED_TERMS,
    DISPLAY_CASE,
    display_case,
)
from backend.preprocessing.stopwords import (
    DOMAIN_STOPWORDS,
    TEMPLATE_PHRASES,
    get_all_stopwords,
)


def test_protected_terms_presence():
    """Verify that all core technical terms from PRD §9.2 are protected."""
    core_terms = [
        "cuda", "cudnn", "gpu", "cpu", "tpu", "tensorflow", "pytorch",
        "keras", "numpy", "pandas", "sklearn", "python", "docker",
        "kubernetes", "linux", "windows", "api", "git", "github", "nan",
    ]
    for term in core_terms:
        assert term in PROTECTED_TERMS, f"Expected {term} in PROTECTED_TERMS"


def test_display_case():
    """Verify display casing map adheres to PRD §9.2."""
    assert display_case("gpu") == "GPU"
    assert display_case("cuda") == "CUDA"
    assert display_case("api") == "API"
    assert display_case("tensorflow") == "TensorFlow"
    assert display_case("pytorch") == "PyTorch"
    assert display_case("python") == "Python"
    assert display_case("macos") == "macOS"
    assert display_case("ios") == "iOS"
    assert display_case("unknown_term") == "Unknown_term"


def test_markdown_and_html_cleaning():
    """Verify stripping of markdown, HTML, code blocks, stack traces, and templates."""
    raw = """
    <!-- This is a comment -->
    <h1>Error in module</h1>
    ```python
    import torch
    x = torch.zeros(10)
    ```
    Inline `code_snippet` should be removed.
    Here is a stack trace:
    Traceback (most recent call last):
      File "test.py", line 12, in <module>
    RuntimeError: CUDA out of memory
    Check [documentation](https://example.com) and image ![alt](https://img.png).
    - [ ] Task checkbox
    ### Steps to reproduce
    Please describe the bug here.
    """
    cleaned = clean_markdown_and_html(raw)
    assert "<!--" not in cleaned
    assert "<h1>" not in cleaned
    assert "import torch" not in cleaned
    assert "code_snippet" not in cleaned
    assert "test.py" not in cleaned
    assert "https://example.com" not in cleaned
    assert "documentation" in cleaned  # Link text kept!
    assert "- [ ]" not in cleaned
    assert "Steps to reproduce" not in cleaned


def test_mention_and_url_removal():
    """Verify removal of URLs, @mentions, and #issue references."""
    text = "Hey @octocat check https://github.com/pytorch/pytorch/issues/100 and issue #456."
    cleaned = clean_text(text)
    assert "@octocat" not in cleaned
    assert "octocat" not in cleaned
    assert "https" not in cleaned
    assert "#456" not in cleaned
    assert "456" not in cleaned


def test_protected_terms_preserved_in_preprocessing():
    """Protected terms should not be removed, lemmatized, or filtered by POS."""
    issue_num = 1
    title = "CUDA memory leak on GPU with PyTorch"
    body = "When using TensorFlow and scikit-learn (sklearn), GPU allocation fails with NaN."

    doc = process_single_issue(issue_num, title, body)

    for term in ["cuda", "gpu", "pytorch", "tensorflow", "sklearn", "nan"]:
        assert term in doc.lemmatized, f"Protected term '{term}' was dropped from lemmatized tokens!"


def test_stopwords_removal():
    """Domain stopwords and NLTK stopwords must be removed."""
    issue_num = 2
    title = "Please would you like to help with this issue"
    body = "Thank you, thanks, hi, hey, seem, thing, way, use, working."

    doc = process_single_issue(issue_num, title, body)
    for sw in ["please", "would", "like", "issue", "thank", "thanks", "hello", "hi", "hey"]:
        assert sw not in doc.lemmatized, f"Stopword '{sw}' was not filtered!"
