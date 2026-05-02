from __future__ import annotations

import re
import uuid

from django.http import HttpResponse
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from apps.projects.models import VcsPullRequest

TASK_REF_RE = re.compile(r"#([A-Z0-9]+-\d+|[0-9a-f]{8}(?:-[0-9a-f]{4}){0,4}|\d+)", re.I)


def _find_task(ref: str, repo_full_name: str):
    from apps.projects.models import Task

    ref = ref.strip()
    queryset = Task.objects.filter(
        project__bitbucket_integration__workspace__isnull=False,
    )

    # Match by workspace/repo_slug if present
    if "/" in repo_full_name:
        workspace, repo_slug = repo_full_name.split("/", 1)
        queryset = queryset.filter(
            project__bitbucket_integration__workspace__iexact=workspace,
            project__bitbucket_integration__repo_slug__iexact=repo_slug,
        )
    else:
        queryset = queryset.filter(project__bitbucket_integration__repo_slug__iexact=repo_full_name)

    try:
        return queryset.filter(id=uuid.UUID(ref)).first()
    except (ValueError, AttributeError):
        pass

    task = queryset.filter(id__istartswith=ref).first()
    if task:
        return task

    return queryset.filter(title__icontains=ref).first()


class BitbucketWebhookView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        event = request.headers.get("X-Event-Key", "")
        payload = request.data

        if event.startswith("pullrequest:"):
            self._handle_pull_request(event, payload)
        return HttpResponse("ok")

    def _handle_pull_request(self, event: str, payload):
        pr = payload.get("pullrequest") or {}
        repo = payload.get("repository") or {}

        title = pr.get("title") or ""
        body = pr.get("description") or ""
        pr_url = ((pr.get("links") or {}).get("html") or {}).get("href") or ""
        pr_num = pr.get("id")
        author = ((pr.get("author") or {}).get("user") or {}).get("display_name") or ""

        full_name = repo.get("full_name") or ""
        if not full_name:
            workspace = (repo.get("workspace") or {}).get("slug") or ""
            slug = repo.get("slug") or ""
            full_name = f"{workspace}/{slug}" if workspace and slug else slug

        status = "open"
        if event.endswith("fulfilled"):
            status = "merged"
        elif event.endswith("rejected"):
            status = "closed"

        refs = TASK_REF_RE.findall(f"{title} {body}")
        if not refs or not full_name or not pr_num:
            return

        for ref in set(refs):
            task = _find_task(ref, full_name)
            if not task:
                continue
            VcsPullRequest.objects.update_or_create(
                task=task,
                provider=VcsPullRequest.PROVIDER_BITBUCKET,
                repo=full_name,
                pr_number=int(pr_num),
                defaults={
                    "pr_title": title[:255],
                    "pr_url": pr_url,
                    "status": status,
                    "author": author[:255],
                },
            )

