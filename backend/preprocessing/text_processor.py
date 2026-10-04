"""GitHub-aware text preprocessing pipeline according to PRD §9.1."""
import re
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import spacy
from backend.preprocessing.protected_terms import PROTECTED_TERMS
from backend.preprocessing.stopwords import get_all_stopwords, TEMPLATE_PHRASES

# Global lazy-loaded spaCy model
_NLP = None


def get_spacy_nlp():
    """Load en_core_web_sm with parser and NER disabled."""
    global _NLP
    if _NLP is None:
        try:
            _NLP = spacy.load("en_core_web_sm", disable=["parser", "ner"])
        except OSError:
            from spacy.cli import download
            download("en_core_web_sm")
            _NLP = spacy.load("en_core_web_sm", disable=["parser", "ner"])
    return _NLP


@dataclass
class ProcessedDocument:
    """Intermediate and final representations of a preprocessed issue."""
    issue_number: int
    raw: str
    cleaned: str
    tokenized: List[str]
    stopword_filtered: List[str]
    lemmatized: List[str]


def clean_markdown_and_html(text: str) -> str:
    """Step 2: Clean HTML and Markdown elements from text."""
    # Strip HTML comments
    text = re.sub(r"<!--[\s\S]*?-->", " ", text)

    # Strip fenced code blocks (``` and ~~~)
    text = re.sub(r"```[\s\S]*?```", " ", text)
    text = re.sub(r"~~~[\s\S]*?~~~", " ", text)

    # Strip inline code (`...`)
    text = re.sub(r"`[^`\n]+`", " ", text)

    # Strip stack-trace lines
    cleaned_lines = []
    in_code_block = False
    for line in text.splitlines():
        stripped = line.strip()
        if (
            stripped.startswith("at ")
            or stripped.startswith('File "')
            or stripped.startswith("Traceback")
            or re.match(r"^[A-Za-z0-9_]*(Error|Exception)\s*:.*", stripped)
        ):
            continue
        cleaned_lines.append(line)
    text = "\n".join(cleaned_lines)

    # Strip HTML tags
    text = re.sub(r"<[^>]+>", " ", text)

    # Markdown images removed ![alt](url)
    text = re.sub(r"!\[.*?\]\(.*?\)", " ", text)

    # Markdown links [text](url) -> keep text only
    text = re.sub(r"\[(.*?)\]\(.*?\)", r" \1 ", text)

    # Task list checkboxes (- [ ], - [x], * [ ])
    text = re.sub(r"[-*]\s*\[[ xX]\]", " ", text)

    # Markdown emphasis/heading/list/table symbols (exclude # attached to numbers for issue refs)
    # Strip headings like '### Title'
    text = re.sub(r"(?m)^\s*#+\s*", " ", text)
    # Strip table pipes, blockquotes, bullets, formatting characters
    text = re.sub(r"[*_~|`>]", " ", text)

    # Strip template phrases
    for phrase in TEMPLATE_PHRASES:
        pattern = re.compile(re.escape(phrase), re.IGNORECASE)
        text = pattern.sub(" ", text)

    return text


def clean_text(raw_text: str) -> str:
    """
    Steps 2-6: Markdown/HTML cleanup, URL removal, mentions, lowercase,
    and special-character removal while preserving protected terms.
    """
    # Step 2: HTML / Markdown cleanup
    text = clean_markdown_and_html(raw_text)

    # Step 3: URL removal
    text = re.sub(r"https?://\S+|www\.\S+", " ", text)

    # Step 4: Mention and issue reference removal
    text = re.sub(r"(?<!\w)@[A-Za-z0-9_.-]+", " ", text)
    text = re.sub(r"(?<!\w)#\d+", " ", text)

    # Step 5: Lowercase
    text = text.lower()

    # Step 6: Special character removal
    # Replace everything except letters, digits, spaces with spaces
    # Protected terms in our dictionary are alphanumeric words, so this preserves them.
    text = re.sub(r"[^a-z0-9\s]", " ", text)

    # Collapse whitespace
    text = re.sub(r"\s+", " ", text).strip()
    return text


def process_single_issue(
    issue_number: int,
    title: str,
    body: Optional[str],
    nlp=None,
    all_stopwords=None,
) -> ProcessedDocument:
    """Preprocess a single issue and return all intermediate stages."""
    if nlp is None:
        nlp = get_spacy_nlp()
    if all_stopwords is None:
        all_stopwords = get_all_stopwords()

    # Step 1: Build raw text (title + "\n" + body[:10000])
    raw_body = (body or "")[:10000]
    raw = f"{title.strip()}\n{raw_body}".strip()

    # Steps 2-6: Cleaned text
    cleaned = clean_text(raw)

    # If cleaned is empty, return empty doc
    if not cleaned:
        return ProcessedDocument(
            issue_number=issue_number,
            raw=raw,
            cleaned=cleaned,
            tokenized=[],
            stopword_filtered=[],
            lemmatized=[],
        )

    # Steps 7-9: spaCy Tokenization, Stopword Removal, Lemmatization + POS filter
    doc = nlp(cleaned)

    tokenized: List[str] = []
    stopword_filtered: List[str] = []
    lemmatized: List[str] = []

    valid_pos = {"NOUN", "PROPN", "VERB", "ADJ"}

    for token in doc:
        if token.is_space or not token.text.strip():
            continue

        token_text = token.text.strip().lower()
        tokenized.append(token_text)

        is_protected = token_text in PROTECTED_TERMS

        # Step 8: Stopword filtering
        # Protected terms are never removed
        passes_stopword = is_protected or (
            token_text not in all_stopwords
            and 2 <= len(token_text) <= 30
            and not token_text.isdigit()
        )

        if passes_stopword:
            stopword_filtered.append(token_text)

        # Step 9: Lemmatization + POS filter
        # Protected terms are kept as-is (bypassing POS filter and lemmatization)
        if is_protected:
            lemmatized.append(token_text)
        elif passes_stopword and token.pos_ in valid_pos:
            lemma = token.lemma_.lower().strip()
            if (
                lemma
                and 2 <= len(lemma) <= 30
                and not lemma.isdigit()
                and lemma not in all_stopwords
            ):
                lemmatized.append(lemma)

    return ProcessedDocument(
        issue_number=issue_number,
        raw=raw,
        cleaned=cleaned,
        tokenized=tokenized,
        stopword_filtered=stopword_filtered,
        lemmatized=lemmatized,
    )


def process_issue_texts(
    issues: List[Any],
    batch_size: int = 64,
) -> List[ProcessedDocument]:
    """
    Process a collection of issues using nlp.pipe in batches (PRD §9.1).
    issues can be IssueInput objects or dicts with number, title, body.
    """
    nlp = get_spacy_nlp()
    all_stopwords = get_all_stopwords()

    # Prepare inputs and cleaned texts
    issue_data = []
    cleaned_texts = []
    for issue in issues:
        num = issue.number if hasattr(issue, "number") else issue["number"]
        title = (issue.title if hasattr(issue, "title") else issue.get("title", "")) or ""
        body = (issue.body if hasattr(issue, "body") else issue.get("body", "")) or ""

        raw_body = body[:10000]
        raw = f"{title.strip()}\n{raw_body}".strip()
        cleaned = clean_text(raw)

        issue_data.append((num, raw, cleaned))
        cleaned_texts.append(cleaned)

    # Process via nlp.pipe
    processed_docs: List[ProcessedDocument] = []
    valid_pos = {"NOUN", "PROPN", "VERB", "ADJ"}

    for (num, raw, cleaned), doc in zip(
        issue_data, nlp.pipe(cleaned_texts, batch_size=batch_size)
    ):
        tokenized: List[str] = []
        stopword_filtered: List[str] = []
        lemmatized: List[str] = []

        for token in doc:
            if token.is_space or not token.text.strip():
                continue

            token_text = token.text.strip().lower()
            tokenized.append(token_text)

            is_protected = token_text in PROTECTED_TERMS

            passes_stopword = is_protected or (
                token_text not in all_stopwords
                and 2 <= len(token_text) <= 30
                and not token_text.isdigit()
            )

            if passes_stopword:
                stopword_filtered.append(token_text)

            if is_protected:
                lemmatized.append(token_text)
            elif passes_stopword and token.pos_ in valid_pos:
                lemma = token.lemma_.lower().strip()
                if (
                    lemma
                    and 2 <= len(lemma) <= 30
                    and not lemma.isdigit()
                    and lemma not in all_stopwords
                ):
                    lemmatized.append(lemma)

        processed_docs.append(
            ProcessedDocument(
                issue_number=num,
                raw=raw,
                cleaned=cleaned,
                tokenized=tokenized,
                stopword_filtered=stopword_filtered,
                lemmatized=lemmatized,
            )
        )

    return processed_docs
