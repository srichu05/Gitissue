"""Fetch sample GitHub issues for Phase 1 datasets (PRD §20.2)."""
import os
import json
from pathlib import Path
from backend.github.github_client import GitHubClient

SAMPLE_REPOSITORIES = [
    ("pytorch", "pytorch"),
    ("tensorflow", "tensorflow"),
    ("scikit-learn", "scikit-learn"),
]


def fetch_and_save_samples(output_dir: str = "data/samples", max_issues: int = 500):
    """Fetch 500 most recent issues for the three benchmark repositories."""
    client = GitHubClient()
    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    results = {}
    for owner, repo in SAMPLE_REPOSITORIES:
        filename = f"{owner}_{repo}.json"
        target_file = out_path / filename

        # Check if already fetched with target count
        if target_file.exists():
            try:
                with open(target_file, "r", encoding="utf-8") as f:
                    existing = json.load(f)
                if isinstance(existing, list) and len(existing) >= max_issues:
                    print(f"Dataset for {owner}/{repo} already has {len(existing)} issues at {target_file}. Skipping fetch.")
                    results[f"{owner}/{repo}"] = {
                        "file": str(target_file),
                        "count": len(existing),
                        "warnings": [],
                    }
                    continue
            except Exception:
                pass

        print(f"Fetching {max_issues} issues for {owner}/{repo}...")
        try:
            fetch_res = client.fetch_issues(owner=owner, repo=repo, state="all", max_issues=max_issues)
            print(f"Fetched {len(fetch_res.issues)} issues for {owner}/{repo}. Warnings: {fetch_res.warnings}")

            with open(target_file, "w", encoding="utf-8") as f:
                json.dump(fetch_res.issues, f, indent=2, ensure_ascii=False)

            results[f"{owner}/{repo}"] = {
                "file": str(target_file),
                "count": len(fetch_res.issues),
                "warnings": fetch_res.warnings,
            }
        except Exception as e:
            print(f"Error fetching {owner}/{repo}: {e}")
            raise

    return results


if __name__ == "__main__":
    fetch_and_save_samples()
