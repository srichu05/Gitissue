"""GitHub REST API client implementing PRD §14."""
import time
import re
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
import httpx
from backend.config import settings


class GitHubError(Exception):
    """Base exception for GitHub API errors."""
    def __init__(self, code: str, message: str, retry_after_seconds: Optional[int] = None):
        super().__init__(message)
        self.code = code
        self.message = message
        self.retry_after_seconds = retry_after_seconds


class GitHubInvalidURLError(GitHubError):
    def __init__(self, message: str = "Invalid GitHub repository URL."):
        super().__init__("INVALID_URL", message)


class GitHubRepoNotFoundError(GitHubError):
    def __init__(self, message: str = "Repository not found or is not public."):
        super().__init__("REPO_NOT_FOUND", message)


class GitHubRepoUnavailableError(GitHubError):
    def __init__(self, message: str = "Repository is unavailable."):
        super().__init__("REPO_UNAVAILABLE", message)


class GitHubRateLimitedError(GitHubError):
    def __init__(self, message: str = "GitHub API rate limit exceeded.", retry_after_seconds: Optional[int] = None):
        super().__init__("GITHUB_RATE_LIMITED", message, retry_after_seconds)


class GitHubUnavailableError(GitHubError):
    def __init__(self, message: str = "GitHub API is currently unavailable."):
        super().__init__("GITHUB_UNAVAILABLE", message)


GITHUB_URL_PATTERN = re.compile(
    r"^https?://(www\.)?github\.com/([A-Za-z0-9_.-]+)/([A-Za-z0-9_.-]+?)(\.git)?(/.*)?$"
)


def parse_github_url(url: str) -> Tuple[str, str]:
    """Parse and validate GitHub repository URL according to PRD §8.2 FR-REPO-1.

    Accepts: https://github.com/owner/repo or http://github.com/...
    Rejects: shorthand 'owner/repo', non-github domains (SSRF guard).
    Returns (owner, repo).
    Raises GitHubInvalidURLError if invalid.
    """
    if not url or not isinstance(url, str):
        raise GitHubInvalidURLError("GitHub repository URL is required.")

    match = GITHUB_URL_PATTERN.match(url.strip())
    if not match:
        raise GitHubInvalidURLError("Invalid GitHub repository URL. Must be in format https://github.com/owner/repo")

    owner = match.group(2)
    repo = match.group(3)
    return owner, repo


@dataclass
class FetchResult:
    issues: List[Dict[str, Any]]
    warnings: List[Dict[str, str]]
    total_fetched: int


def parse_next_link(link_header: Optional[str]) -> Optional[str]:
    """Extract rel='next' URL from GitHub Link header."""
    if not link_header:
        return None
    for part in link_header.split(","):
        segments = part.strip().split(";")
        if len(segments) >= 2 and 'rel="next"' in segments[1]:
            match = re.search(r"<([^>]+)>", segments[0])
            if match:
                return match.group(1)
    return None


class GitHubClient:
    """Client for interacting with GitHub REST API v3."""

    def __init__(self, token: Optional[str] = None):
        self.token = token or settings.GITHUB_TOKEN
        self.headers = {
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }
        if self.token:
            self.headers["Authorization"] = f"Bearer {self.token}"

    def _get_headers(self) -> Dict[str, str]:
        headers = dict(self.headers)
        return headers

    def validate_repository(self, owner: str, repo: str) -> Dict[str, Any]:
        """Validate repository existence and return summary metadata (PRD §8.2)."""
        url = f"https://api.github.com/repos/{owner}/{repo}"
        headers = self._get_headers()

        with httpx.Client(timeout=20.0) as client:
            for attempt in range(4):
                try:
                    resp = client.get(url, headers=headers)
                    if resp.status_code == 200:
                        data = resp.json()
                        return {
                            "github_repo_id": data.get("id"),
                            "owner": data.get("owner", {}).get("login", owner),
                            "name": data.get("name", repo),
                            "full_name": data.get("full_name", f"{owner}/{repo}"),
                            "description": data.get("description"),
                            "html_url": data.get("html_url", f"https://github.com/{owner}/{repo}"),
                            "stars": data.get("stargazers_count", 0),
                            "forks": data.get("forks_count", 0),
                            "open_issues_count": data.get("open_issues_count", 0),
                        }
                    elif resp.status_code == 404:
                        raise GitHubRepoNotFoundError()
                    elif resp.status_code in (403, 429):
                        remaining = resp.headers.get("x-ratelimit-remaining")
                        retry_after = resp.headers.get("retry-after")
                        reset = resp.headers.get("x-ratelimit-reset")
                        if (remaining is not None and int(remaining) == 0) or retry_after:
                            wait_sec = int(retry_after) if retry_after else (
                                max(1, int(reset) - int(time.time())) if reset else 60
                            )
                            raise GitHubRateLimitedError(retry_after_seconds=wait_sec)
                        raise GitHubRepoUnavailableError(f"GitHub access forbidden (status {resp.status_code})")
                    elif resp.status_code in (451,):
                        raise GitHubRepoUnavailableError("Repository unavailable due to legal/administrative reasons.")
                    elif resp.status_code >= 500:
                        if attempt < 3:
                            time.sleep(2 ** attempt)
                            continue
                        raise GitHubUnavailableError()
                    else:
                        resp.raise_for_status()
                except httpx.RequestError:
                    if attempt < 3:
                        time.sleep(2 ** attempt)
                        continue
                    raise GitHubUnavailableError()

        raise GitHubUnavailableError()

    def fetch_issues(
        self,
        owner: str,
        repo: str,
        state: str = "all",
        max_issues: int = 500,
        progress_cb=None,
    ) -> FetchResult:
        """
        Fetch issues excluding PRs according to PRD §14.
        """
        issues: List[Dict[str, Any]] = []
        warnings: List[Dict[str, str]] = []
        pages_scanned = 0
        max_pages = 30
        headers = self._get_headers()

        next_url = (
            f"https://api.github.com/repos/{owner}/{repo}/issues"
            f"?state={state}&sort=created&direction=desc&per_page=100&page=1"
        )

        with httpx.Client(timeout=20.0) as client:
            while len(issues) < max_issues and pages_scanned < max_pages and next_url:
                pages_scanned += 1
                resp = None

                for attempt in range(4):
                    try:
                        resp = client.get(next_url, headers=headers)
                        if resp.status_code == 200:
                            break
                        elif resp.status_code == 404:
                            raise GitHubRepoNotFoundError()
                        elif resp.status_code in (403, 429):
                            remaining = resp.headers.get("x-ratelimit-remaining")
                            retry_after = resp.headers.get("retry-after")
                            reset = resp.headers.get("x-ratelimit-reset")
                            is_ratelimit = (remaining is not None and int(remaining) == 0) or bool(retry_after)

                            if is_ratelimit:
                                wait_sec = int(retry_after) if retry_after else (
                                    max(1, int(reset) - int(time.time())) if reset else 60
                                )
                                if len(issues) >= 50:
                                    warnings.append({
                                        "code": "FETCH_PARTIAL_RATE_LIMIT",
                                        "message": f"Hit rate limit; continuing with {len(issues)} issues fetched."
                                    })
                                    return FetchResult(issues=issues, warnings=warnings, total_fetched=len(issues))
                                else:
                                    raise GitHubRateLimitedError(retry_after_seconds=wait_sec)
                            raise GitHubRepoUnavailableError()
                        elif resp.status_code == 422:
                            # GitHub pagination limit (e.g. page > 10 without cursor)
                            # Stop scanning and proceed with collected issues
                            break
                        elif resp.status_code >= 500:
                            if attempt < 3:
                                time.sleep(2 ** attempt)
                                continue
                            raise GitHubUnavailableError()
                        else:
                            resp.raise_for_status()
                    except httpx.RequestError:
                        if attempt < 3:
                            time.sleep(2 ** attempt)
                            continue
                        raise GitHubUnavailableError()

                if resp is None:
                    raise GitHubUnavailableError()

                if resp.status_code == 422:
                    break

                if resp.status_code != 200:
                    raise GitHubUnavailableError()

                page_items = resp.json()
                if not page_items or not isinstance(page_items, list):
                    break

                for item in page_items:
                    if "pull_request" in item:
                        continue

                    raw_body = item.get("body") or ""
                    issue_obj = {
                        "github_issue_id": item["id"],
                        "number": item["number"],
                        "title": item.get("title", ""),
                        "body": raw_body,
                        "state": item.get("state", "open"),
                        "labels": [
                            label["name"] if isinstance(label, dict) else str(label)
                            for label in item.get("labels", [])
                        ],
                        "author": item.get("user", {}).get("login") if item.get("user") else None,
                        "comments_count": item.get("comments", 0),
                        "created_at_github": item.get("created_at"),
                        "updated_at_github": item.get("updated_at"),
                        "closed_at_github": item.get("closed_at"),
                        "html_url": item.get("html_url", f"https://github.com/{owner}/{repo}/issues/{item['number']}"),
                    }
                    issues.append(issue_obj)
                    if len(issues) >= max_issues:
                        break

                if progress_cb:
                    progress_cb(len(issues), max_issues)

                # Get next URL from Link header (supports cursor pagination)
                next_url = parse_next_link(resp.headers.get("link"))

        # Check for FETCH_TRUNCATED warning
        if len(issues) >= max_issues or pages_scanned >= max_pages or (next_url is None and len(issues) < max_issues):
            if len(issues) < max_issues:
                warnings.append({
                    "code": "FETCH_TRUNCATED",
                    "message": f"Fetch ended with {len(issues)} issues after {pages_scanned} pages scanned."
                })
            else:
                warnings.append({
                    "code": "FETCH_TRUNCATED",
                    "message": f"Fetch capped at {len(issues)} issues (limit reached)."
                })

        return FetchResult(issues=issues, warnings=warnings, total_fetched=len(issues))
