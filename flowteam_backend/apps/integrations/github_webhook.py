from __future__ import annotations

import hashlib
import hmac
import json
import re
import uuid
from datetime import datetime

from django.db import transaction
from django.db.models import Q
from django.http import HttpResponse
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from apps.integrations.models import GitBranch, GitCommit, GitHubIntegration, WebhookDelivery

TASK_REF_RE = re.compile(r"#([A-Z0-9]+-\d+|[0-9a-f]{8}(?:-[0-9a-f]{4}){0,4}|\d+)", re.I)
TASK_IN_BRANCH_RE = re.compile(r"(?:^|/|-)([A-Z][A-Z0-9]+-\d+)(?:$|/|-)", re.I)


def _sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _integration_from_payload(payload: dict) -> GitHubIntegration | None:
    repo = (payload.get("repository") or {}).get("full_name") or ""
    if not repo or "/" not in repo:
        return None
    owner, name = repo.split("/", 1)
    return GitHubIntegration.objects.filter(repo_owner__iexact=owner.strip(), repo_name__iexact=name.strip()).select_related("project", "team").first()


def _verify_signature(secret: str, body: bytes, sig_header: str) -> bool:
    if not secret:
        return False
    expected = "sha256=" + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(sig_header or "", expected)


def _find_task(ref: str, integration: GitHubIntegration):
    from apps.projects.models import Task

    ref = (ref or "").strip()
    if not ref:
        return None

    queryset = Task.objects.filter(project_id=integration.project_id)
    try:
        return queryset.filter(id=uuid.UUID(ref)).first()
    except (ValueError, AttributeError):
        pass

    task = queryset.filter(id__istartswith=ref).first()
    if task:
        return task
    return queryset.filter(Q(title__icontains=f"#{ref}") | Q(title__icontains=ref)).first()


def _find_task_from_branch(branch_name: str, integration: GitHubIntegration):
    m = TASK_IN_BRANCH_RE.search(branch_name or "")
    if not m:
        return None
    return _find_task(m.group(1), integration)


def _parse_github_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    # GitHub sends ISO8601 with Z.
    try:
        if value.endswith("Z"):
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        return datetime.fromisoformat(value)
    except Exception:
        return None


def _compute_review_state(reviewers: list[dict]) -> str:
    # reviewers: [{login, state}]
    states = {str(r.get("state") or "").lower() for r in reviewers or [] if r.get("login")}
    if "changes_requested" in states:
        return "changes_requested"
    if "approved" in states:
        return "approved"
    return "pending"


def _compute_checks_status(conclusion: str | None, status: str | None) -> str:
    # GitHub check_run/check_suite uses (status: queued/in_progress/completed), (conclusion: success/failure/...)
    if (status or "").lower() != "completed":
        return "pending"
    concl = (conclusion or "").lower()
    if concl in ("success", "neutral", "skipped"):
        return "success" if concl == "success" else "skipped"
    if concl in ("failure", "timed_out", "cancelled", "action_required", "startup_failure", "stale"):
        return "failure"
    return "pending"


class GitHubWebhookView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        body: bytes = request.body or b""
        delivery_id = request.headers.get("X-GitHub-Delivery", "")[:64]
        event = request.headers.get("X-GitHub-Event", "")[:50]
        sig_header = request.headers.get("X-Hub-Signature-256", "")

        # Parse JSON ourselves so we can pick the correct per-integration secret.
        try:
            payload = json.loads(body.decode("utf-8") or "{}")
        except Exception:
            return HttpResponse("Bad Request", status=400)

        integration = _integration_from_payload(payload)
        if not integration or not integration.webhook_secret:
            return HttpResponse("Forbidden", status=403)

        if not _verify_signature(integration.webhook_secret, body, sig_header):
            return HttpResponse("Forbidden", status=403)

        payload_hash = _sha256_hex(body)

        # Dedupe on delivery id if present.
        delivery = None
        if delivery_id:
            delivery = WebhookDelivery.objects.filter(integration=integration, delivery_id=delivery_id).first()
            if delivery:
                return HttpResponse("ok")

        with transaction.atomic():
            delivery = WebhookDelivery.objects.create(
                integration=integration,
                event=event or "unknown",
                delivery_id=delivery_id or payload_hash[:64],
                payload_hash=payload_hash,
                payload=payload,
                status=WebhookDelivery.STATUS_RECEIVED,
            )

        try:
            handled = self._dispatch(event, payload, integration)
            WebhookDelivery.objects.filter(id=delivery.id).update(
                status=WebhookDelivery.STATUS_PROCESSED if handled else WebhookDelivery.STATUS_IGNORED,
                processed_at=timezone.now(),
                error="",
            )
        except Exception as e:
            WebhookDelivery.objects.filter(id=delivery.id).update(
                status=WebhookDelivery.STATUS_FAILED,
                processed_at=timezone.now(),
                error=str(e)[:5000],
            )
            return HttpResponse("error", status=500)

        return HttpResponse("ok")

    def _dispatch(self, event: str, payload: dict, integration: GitHubIntegration) -> bool:
        if event == "pull_request":
            return self._handle_pr(payload, integration)
        if event == "push":
            return self._handle_push(payload, integration)
        if event == "pull_request_review":
            return self._handle_pr_review(payload, integration)
        if event in ("check_run", "check_suite"):
            return self._handle_checks(payload, integration)
        return False

    def _handle_pr(self, payload: dict, integration: GitHubIntegration) -> bool:
        action = payload.get("action")
        pr = payload.get("pull_request") or {}
        repo = (payload.get("repository") or {}).get("full_name") or ""
        if not repo:
            return False

        title = pr.get("title") or ""
        body = pr.get("body") or ""
        pr_url = pr.get("html_url") or ""
        pr_num = pr.get("number")
        author = ((pr.get("user") or {}).get("login")) or ""
        merged = bool(pr.get("merged"))
        draft = bool(pr.get("draft"))
        merged_at = _parse_github_datetime(pr.get("merged_at"))
        head_branch = ((pr.get("head") or {}).get("ref")) or ""
        base_branch = ((pr.get("base") or {}).get("ref")) or ""
        head_sha = ((pr.get("head") or {}).get("sha")) or ""
        labels = [lbl.get("name") for lbl in (pr.get("labels") or []) if isinstance(lbl, dict) and lbl.get("name")]

        status = "open"
        if action == "closed":
            status = "merged" if merged else "closed"

        refs = TASK_REF_RE.findall(f"{title} {body}")
        if not refs or not pr_num:
            return False

        from apps.projects.models import GitHubPullRequest, TaskActivity, Column

        touched = False
        for ref in set(refs):
            task = _find_task(ref, integration)
            if not task:
                continue
            touched = True
            obj, _ = GitHubPullRequest.objects.update_or_create(
                task=task,
                pr_number=int(pr_num),
                repo=repo,
                defaults={
                    "pr_title": title[:255],
                    "pr_url": pr_url,
                    "status": status,
                    "author": author,
                    "head_branch": head_branch[:255],
                    "base_branch": base_branch[:255],
                    "head_sha": head_sha[:40],
                    "draft": draft,
                    "merged_at": merged_at,
                    "labels": labels,
                },
            )

            if action == "opened":
                TaskActivity.objects.create(task=task, actor=task.reporter, verb="updated", detail={"event": "pr_opened", "pr_url": pr_url, "pr_number": int(pr_num)})
            if status == "merged":
                TaskActivity.objects.create(task=task, actor=task.reporter, verb="updated", detail={"event": "pr_merged", "pr_url": pr_url, "pr_number": int(pr_num)})
                if integration.auto_advance_on_merge:
                    current_col = task.column
                    name = (current_col.name or "").lower()
                    if "review" in name or "testing" in name:
                        # Move to next column by order within the project.
                        cols = list(Column.objects.filter(project=task.project).order_by("order"))
                        for idx, c in enumerate(cols):
                            if c.id == current_col.id and idx + 1 < len(cols):
                                task.column = cols[idx + 1]
                                task.order = 0
                                task.save(update_fields=["column", "order", "updated_at"])
                                TaskActivity.objects.create(task=task, actor=task.reporter, verb="moved", detail={"column_id": str(task.column_id), "order": 0})
                                break

        return touched

    def _handle_push(self, payload: dict, integration: GitHubIntegration) -> bool:
        if not integration.sync_commits and not integration.sync_branches:
            return False

        ref_full = payload.get("ref") or ""
        branch_name = ref_full.replace("refs/heads/", "") if ref_full.startswith("refs/heads/") else ref_full
        after_sha = payload.get("after") or ""
        pusher = ((payload.get("pusher") or {}).get("name")) or ((payload.get("sender") or {}).get("login")) or ""

        task_from_branch = _find_task_from_branch(branch_name, integration)
        base_branch = integration.default_branch or "main"

        branch_obj = None
        if integration.sync_branches and branch_name:
            branch_obj, _ = GitBranch.objects.update_or_create(
                integration=integration,
                name=branch_name[:255],
                defaults={
                    "task": task_from_branch,
                    "base_branch": base_branch[:255],
                    "sha": after_sha[:40],
                    "author_login": (pusher or "")[:100],
                },
            )

        commits = payload.get("commits") or []
        touched = False
        from apps.projects.models import TaskActivity

        for c in commits:
            sha = (c.get("id") or "")[:40]
            if not sha:
                continue
            message = c.get("message") or ""
            url = c.get("url") or c.get("url") or ""
            author = (c.get("author") or {}) if isinstance(c.get("author"), dict) else {}
            author_login = (author.get("username") or author.get("name") or pusher or "")[:100]
            author_email = (author.get("email") or "")[:254]
            committed_at = _parse_github_datetime(c.get("timestamp")) or timezone.now()

            matched_task = None
            refs = TASK_REF_RE.findall(message)
            if refs:
                for ref in refs:
                    matched_task = _find_task(ref, integration)
                    if matched_task:
                        break
            if not matched_task:
                matched_task = task_from_branch

            if not integration.sync_commits:
                continue

            obj, created = GitCommit.objects.update_or_create(
                sha=sha,
                defaults={
                    "integration": integration,
                    "task": matched_task,
                    "branch": branch_obj,
                    "message": message,
                    "author_login": author_login,
                    "author_email": author_email,
                    "url": url,
                    "committed_at": committed_at,
                },
            )
            touched = True
            if created and matched_task:
                TaskActivity.objects.create(
                    task=matched_task,
                    actor=matched_task.reporter,
                    verb="updated",
                    detail={"event": "commit_pushed", "sha": sha, "message": message[:200], "url": url},
                )

        return touched

    def _handle_pr_review(self, payload: dict, integration: GitHubIntegration) -> bool:
        pr = payload.get("pull_request") or {}
        repo = (payload.get("repository") or {}).get("full_name") or ""
        pr_num = pr.get("number")
        if not repo or not pr_num:
            return False

        reviewer_login = ((payload.get("review") or {}).get("user") or {}).get("login") or ""
        state = (payload.get("review") or {}).get("state") or ""
        state_norm = state.lower().replace(" ", "_")
        if state_norm not in ("approved", "changes_requested", "commented", "dismissed"):
            return False

        from apps.projects.models import GitHubPullRequest, TaskWatcher
        from apps.projects.views import create_project_notification
        User = get_user_model()

        qs = GitHubPullRequest.objects.filter(repo=repo, pr_number=int(pr_num))
        prs = list(qs.select_related("task", "task__project"))
        if not prs:
            return False

        for pr_obj in prs:
            reviewers = list(pr_obj.reviewers or [])
            reviewers = [r for r in reviewers if (r.get("login") or "").lower() != reviewer_login.lower()]
            if reviewer_login:
                reviewers.append({"login": reviewer_login, "state": state_norm})

            review_state = _compute_review_state(reviewers)
            pr_obj.reviewers = reviewers
            pr_obj.review_state = review_state
            pr_obj.save(update_fields=["reviewers", "review_state", "updated_at"])

            # If approved and checks already passing, notify watchers.
            if review_state == "approved" and (pr_obj.checks_status or "") == "success":
                watcher_user_ids = list(TaskWatcher.objects.filter(task=pr_obj.task).values_list("user_id", flat=True))
                for u in User.objects.filter(id__in=watcher_user_ids):
                    create_project_notification(
                        recipient=u,
                        notification_type="pr_approved",
                        title=f"PR approved for {pr_obj.task.title}",
                        body=f"PR #{pr_obj.pr_number} is approved and checks are passing.",
                        reference_type="task",
                        reference_id=pr_obj.task.id,
                        action_url=f"/projects/{pr_obj.task.project_id}?task={pr_obj.task.id}",
                    )

        return True

    def _handle_checks(self, payload: dict, integration: GitHubIntegration) -> bool:
        repo = (payload.get("repository") or {}).get("full_name") or ""
        if not repo:
            return False

        head_sha = ""
        status = ""
        conclusion = ""
        if (payload.get("check_run") or {}).get("head_sha"):
            check = payload.get("check_run") or {}
            head_sha = (check.get("head_sha") or "")[:40]
            status = (check.get("status") or "")[:32]
            conclusion = (check.get("conclusion") or "")[:32]
        elif (payload.get("check_suite") or {}).get("head_sha"):
            check = payload.get("check_suite") or {}
            head_sha = (check.get("head_sha") or "")[:40]
            status = (check.get("status") or "")[:32]
            conclusion = (check.get("conclusion") or "")[:32]
        if not head_sha:
            return False

        checks_status = _compute_checks_status(conclusion, status)

        from apps.projects.models import GitHubPullRequest, TaskWatcher
        from apps.projects.views import create_project_notification
        User = get_user_model()

        prs = list(GitHubPullRequest.objects.filter(repo=repo, head_sha=head_sha).select_related("task"))
        if not prs:
            return False

        for pr_obj in prs:
            pr_obj.checks_status = checks_status
            pr_obj.save(update_fields=["checks_status", "updated_at"])

            if checks_status == "failure" and pr_obj.task and pr_obj.task.assignee:
                create_project_notification(
                    recipient=pr_obj.task.assignee,
                    notification_type="ci_failed",
                    title=f"CI failed on PR #{pr_obj.pr_number}",
                    body=pr_obj.pr_title,
                    reference_type="task",
                    reference_id=pr_obj.task.id,
                    action_url=f"/projects/{pr_obj.task.project_id}?task={pr_obj.task.id}",
                )

            # If checks are now passing and reviews are approved, notify watchers.
            if checks_status == "success" and (pr_obj.review_state or "") == "approved":
                watcher_user_ids = list(TaskWatcher.objects.filter(task=pr_obj.task).values_list("user_id", flat=True))
                for u in User.objects.filter(id__in=watcher_user_ids):
                    create_project_notification(
                        recipient=u,
                        notification_type="ci_passed",
                        title=f"CI passing for PR #{pr_obj.pr_number}",
                        body=pr_obj.pr_title,
                        reference_type="task",
                        reference_id=pr_obj.task.id,
                        action_url=f"/projects/{pr_obj.task.project_id}?task={pr_obj.task.id}",
                    )

        return True
