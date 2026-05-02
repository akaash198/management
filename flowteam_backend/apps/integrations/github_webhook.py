from __future__ import annotations

import hashlib
import hmac
import re
import uuid

from django.conf import settings
from django.db.models import Q
from django.http import HttpResponse
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

TASK_REF_RE = re.compile(r"#([A-Z0-9]+-\d+|[0-9a-f]{8}(?:-[0-9a-f]{4}){0,4}|\d+)", re.I)


def _verify_signature(request) -> bool:
    secret = getattr(settings, "GITHUB_WEBHOOK_SECRET", "").encode()
    if not secret:
        return True
    sig_header = request.headers.get("X-Hub-Signature-256", "")
    expected = "sha256=" + hmac.new(secret, request.body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(sig_header, expected)


def _find_task(ref: str, repo: str):
    from apps.projects.models import Task

    ref = ref.strip()
    repo_owner, _, repo_name = repo.partition("/")
    queryset = Task.objects.filter(
        project__github_integration__repo_owner__iexact=repo_owner,
        project__github_integration__repo_name__iexact=repo_name,
    )

    try:
        return queryset.filter(id=uuid.UUID(ref)).first()
    except (ValueError, AttributeError):
        pass

    task = queryset.filter(id__istartswith=ref).first()
    if task:
        return task

    return queryset.filter(Q(title__icontains=f"#{ref}") | Q(title__icontains=ref)).first()


class GitHubWebhookView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        if not _verify_signature(request):
            return HttpResponse("Forbidden", status=403)

        event = request.headers.get("X-GitHub-Event", "")
        payload = request.data
        if event == "pull_request":
            self._handle_pr(payload)
        elif event == "push":
            self._handle_push(payload)
        return HttpResponse("ok")

    def _handle_pr(self, payload):
        action = payload.get("action")
        pr = payload.get("pull_request", {})
        repo = payload.get("repository", {}).get("full_name", "")
        title = pr.get("title", "")
        body = pr.get("body") or ""
        pr_url = pr.get("html_url", "")
        pr_num = pr.get("number")
        author = pr.get("user", {}).get("login", "")
        merged = pr.get("merged", False)

        status = "open"
        if action == "closed":
            status = "merged" if merged else "closed"

        refs = TASK_REF_RE.findall(f"{title} {body}")
        if not refs or not repo or not pr_num:
            return

        from apps.projects.models import GitHubPullRequest

        for ref in set(refs):
            task = _find_task(ref, repo)
            if not task:
                continue
            GitHubPullRequest.objects.update_or_create(
                task=task,
                pr_number=pr_num,
                repo=repo,
                defaults={
                    "pr_title": title[:255],
                    "pr_url": pr_url,
                    "status": status,
                    "author": author,
                },
            )

    def _handle_push(self, payload):
        return None
