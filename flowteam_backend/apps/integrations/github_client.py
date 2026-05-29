from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import requests

from apps.integrations.models import GitHubIntegration


GITHUB_API_BASE = "https://api.github.com"


@dataclass
class GitHubApiError(Exception):
    status_code: int
    message: str
    details: str = ""

    def __str__(self) -> str:
        extra = f" ({self.details})" if self.details else ""
        return f"GitHub API error {self.status_code}: {self.message}{extra}"


def _headers(integration: GitHubIntegration) -> dict[str, str]:
    return {
        "Authorization": f"token {integration.access_token}",
        "Accept": "application/vnd.github+json",
    }


def request_github(
    integration: GitHubIntegration,
    method: str,
    path: str,
    *,
    params: dict[str, Any] | None = None,
    json_body: dict[str, Any] | None = None,
    timeout: int = 15,
) -> Any:
    url = f"{GITHUB_API_BASE}{path}"
    res = requests.request(
        method=method.upper(),
        url=url,
        headers=_headers(integration),
        params=params,
        json=json_body,
        timeout=timeout,
    )
    if not res.ok:
        text = ""
        try:
            text = res.text
        except Exception:
            pass
        raise GitHubApiError(res.status_code, "request_failed", details=text[:1500])
    if res.status_code == 204:
        return None
    try:
        return res.json()
    except Exception:
        return res.text


def ensure_repo_webhook(
    integration: GitHubIntegration,
    *,
    webhook_url: str,
    events: list[str],
) -> str:
    """
    Creates a webhook if missing. Returns webhook id (string).
    """
    if not integration.repo_owner or not integration.repo_name:
        raise GitHubApiError(400, "repo_not_set")
    if not integration.webhook_secret:
        raise GitHubApiError(400, "webhook_secret_missing")

    payload = {
        "name": "web",
        "active": True,
        "events": events,
        "config": {
            "url": webhook_url,
            "content_type": "json",
            "secret": integration.webhook_secret,
            "insecure_ssl": "0",
        },
    }
    data = request_github(
        integration,
        "POST",
        f"/repos/{integration.repo_owner}/{integration.repo_name}/hooks",
        json_body=payload,
        timeout=10,
    )
    return str((data or {}).get("id") or "")


def add_pr_labels(integration: GitHubIntegration, *, repo: str, pr_number: int, labels: list[str]) -> None:
    owner, _, name = repo.partition("/")
    if not owner or not name:
        raise GitHubApiError(400, "invalid_repo")
    request_github(
        integration,
        "POST",
        f"/repos/{owner}/{name}/issues/{int(pr_number)}/labels",
        json_body={"labels": labels},
        timeout=10,
    )


def remove_pr_label(integration: GitHubIntegration, *, repo: str, pr_number: int, label: str) -> None:
    owner, _, name = repo.partition("/")
    if not owner or not name:
        raise GitHubApiError(400, "invalid_repo")
    request_github(
        integration,
        "DELETE",
        f"/repos/{owner}/{name}/issues/{int(pr_number)}/labels/{label}",
        timeout=10,
    )


def create_pull_request(
    integration: GitHubIntegration,
    *,
    repo: str,
    head_branch: str,
    base_branch: str,
    title: str,
    body: str,
) -> dict[str, Any]:
    owner, _, name = repo.partition("/")
    if not owner or not name:
        raise GitHubApiError(400, "invalid_repo")
    return request_github(
        integration,
        "POST",
        f"/repos/{owner}/{name}/pulls",
        json_body={"title": title, "head": head_branch, "base": base_branch, "body": body},
        timeout=15,
    )


def list_open_pull_requests(integration: GitHubIntegration, *, repo: str) -> list[dict[str, Any]]:
    owner, _, name = repo.partition("/")
    if not owner or not name:
        raise GitHubApiError(400, "invalid_repo")
    data = request_github(
        integration,
        "GET",
        f"/repos/{owner}/{name}/pulls",
        params={"state": "open", "per_page": 100},
        timeout=20,
    )
    return list(data or [])

