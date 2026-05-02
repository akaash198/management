from __future__ import annotations
import re
import uuid
import hmac

from django.conf import settings
from django.http import HttpResponse
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from apps.projects.models import VcsPullRequest

TASK_REF_RE = re.compile(r"#([A-Z0-9]+-\d+|[0-9a-f]{8}(?:-[0-9a-f]{4}){0,4}|\d+)", re.I)


def _verify_signature(request) -> bool:
    # GitLab "Secret token" is sent as a literal header value in X-Gitlab-Token.
    secret = (getattr(settings, "GITLAB_WEBHOOK_SECRET", "") or "").strip()
    if not secret:
        return True
    token = (request.headers.get("X-Gitlab-Token", "") or "").strip()
    return hmac.compare_digest(token, secret)


def _find_task(ref: str, repo_full_path: str):
    from apps.projects.models import Task

    ref = ref.strip()
    queryset = Task.objects.filter(project__gitlab_integration__repo_full_path__iexact=repo_full_path)

    try:
        return queryset.filter(id=uuid.UUID(ref)).first()
    except (ValueError, AttributeError):
        pass

    task = queryset.filter(id__istartswith=ref).first()
    if task:
        return task

    return queryset.filter(title__icontains=ref).first()


class GitLabWebhookView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        if not _verify_signature(request):
            return HttpResponse("Forbidden", status=403)

        event = request.headers.get("X-Gitlab-Event", "")
        payload = request.data

        # Merge Request Hook
        if event.lower().startswith("merge request") or payload.get("object_kind") == "merge_request":
            self._handle_merge_request(payload)
        return HttpResponse("ok")

    def _handle_merge_request(self, payload):
        attrs = payload.get("object_attributes") or {}
        project = payload.get("project") or {}

        repo_full_path = project.get("path_with_namespace") or ""
        title = attrs.get("title") or ""
        body = attrs.get("description") or ""
        pr_url = attrs.get("url") or attrs.get("url") or ""
        pr_num = attrs.get("iid") or attrs.get("id")
        state = (attrs.get("state") or "").lower()
        merged = bool(attrs.get("merged_at"))

        status = "open"
        if state in {"merged"} or merged:
            status = "merged"
        elif state in {"closed"}:
            status = "closed"

        author = (payload.get("user") or {}).get("username") or ""

        refs = TASK_REF_RE.findall(f"{title} {body}")
        if not refs or not repo_full_path or not pr_num:
            return

        for ref in set(refs):
            task = _find_task(ref, repo_full_path)
            if not task:
                continue
            VcsPullRequest.objects.update_or_create(
                task=task,
                provider=VcsPullRequest.PROVIDER_GITLAB,
                repo=repo_full_path,
                pr_number=int(pr_num),
                defaults={
                    "pr_title": title[:255],
                    "pr_url": pr_url,
                    "status": status,
                    "author": author[:255],
                },
            )
