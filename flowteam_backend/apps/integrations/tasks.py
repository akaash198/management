from __future__ import annotations

import json
import requests
from celery import shared_task
from django.db import transaction
from django.utils import timezone

from apps.integrations.models import OutboxEvent, SlackWebhook
from apps.integrations.outbox import compute_next_attempt
from apps.core.metrics import outbox_events_total
from apps.integrations.models import GitHubIntegration
from apps.integrations.github_client import add_pr_labels, remove_pr_label, list_open_pull_requests
from apps.integrations.github_webhook import TASK_REF_RE, _find_task  # re-use matching logic safely


def _slack_payload(event: OutboxEvent) -> dict:
    payload = event.payload or {}
    # Allow callers to supply a full slack payload if desired.
    if isinstance(payload, dict) and ("text" in payload or "blocks" in payload):
        return payload
    return {"text": json.dumps(payload, ensure_ascii=False)[:3500]}


@shared_task
def process_outbox(batch_size: int = 50) -> dict:
    """
    Sends pending outbox events with retries and backoff.
    """
    now = timezone.now()
    sent = 0
    failed = 0

    qs = (
        OutboxEvent.objects.filter(status=OutboxEvent.STATUS_PENDING, next_attempt_at__lte=now)
        .order_by("next_attempt_at", "created_at")[: max(1, min(200, int(batch_size or 50)))]
    )
    events = list(qs)

    for event in events:
        with transaction.atomic():
            locked = OutboxEvent.objects.select_for_update().filter(id=event.id).first()
            if not locked or locked.status != OutboxEvent.STATUS_PENDING:
                continue
            locked.status = OutboxEvent.STATUS_PROCESSING
            locked.save(update_fields=["status", "updated_at"])

        try:
            if event.destination == OutboxEvent.DEST_SLACK:
                hooks = SlackWebhook.objects.filter(team_id=event.team_id, enabled=True)
                if not hooks.exists():
                    # Nothing to deliver; treat as sent.
                    OutboxEvent.objects.filter(id=event.id).update(
                        status=OutboxEvent.STATUS_SENT, last_error=None, updated_at=timezone.now()
                    )
                    sent += 1
                    continue

                payload = _slack_payload(event)
                for hook in hooks:
                    requests.post(hook.webhook_url, json=payload, timeout=5).raise_for_status()

            OutboxEvent.objects.filter(id=event.id).update(
                status=OutboxEvent.STATUS_SENT, last_error=None, updated_at=timezone.now()
            )
            sent += 1
            try:
                outbox_events_total.labels(event.destination, "sent").inc()
            except Exception:
                pass
        except Exception as e:
            attempts = int(event.attempts or 0) + 1
            OutboxEvent.objects.filter(id=event.id).update(
                status=OutboxEvent.STATUS_PENDING,
                attempts=attempts,
                next_attempt_at=compute_next_attempt(attempts),
                last_error=str(e)[:2000],
                updated_at=timezone.now(),
            )
            failed += 1
            try:
                outbox_events_total.labels(event.destination, "failed").inc()
            except Exception:
                pass

    return {"sent": sent, "failed": failed, "total": len(events)}


@shared_task
def github_apply_pr_labels(integration_id: str, repo: str, pr_number: int, *, add: list[str] | None = None, remove: list[str] | None = None) -> dict:
    integration = GitHubIntegration.objects.filter(id=integration_id).first()
    if not integration:
        return {"ok": False, "error": "integration_not_found"}
    add = [x for x in (add or []) if x]
    remove = [x for x in (remove or []) if x]
    try:
        if add:
            add_pr_labels(integration, repo=repo, pr_number=int(pr_number), labels=add)
        for lbl in remove:
            try:
                remove_pr_label(integration, repo=repo, pr_number=int(pr_number), label=lbl)
            except Exception:
                # Ignore if label doesn't exist.
                pass
        return {"ok": True}
    except Exception as e:
        return {"ok": False, "error": str(e)[:1000]}


@shared_task
def github_sync_open_prs() -> dict:
    """
    Periodic re-sync for open PRs to backfill missed webhooks.
    """
    from apps.projects.models import GitHubPullRequest

    synced = 0
    integrations = GitHubIntegration.objects.exclude(repo_owner="").exclude(repo_name="").select_related("project")
    for integration in integrations:
        if not integration.project_id:
            continue
        repo = integration.full_repo
        if not repo:
            continue
        try:
            prs = list_open_pull_requests(integration, repo=repo)
        except Exception:
            continue

        for pr in prs:
            pr_number = pr.get("number")
            title = pr.get("title") or ""
            body = pr.get("body") or ""
            pr_url = pr.get("html_url") or ""
            author = ((pr.get("user") or {}).get("login")) or ""
            draft = bool(pr.get("draft"))
            head_branch = ((pr.get("head") or {}).get("ref")) or ""
            base_branch = ((pr.get("base") or {}).get("ref")) or ""
            head_sha = ((pr.get("head") or {}).get("sha")) or ""
            labels = [lbl.get("name") for lbl in (pr.get("labels") or []) if isinstance(lbl, dict) and lbl.get("name")]

            refs = TASK_REF_RE.findall(f"{title} {body}")
            if not refs or not pr_number:
                continue

            for ref in set(refs):
                task = _find_task(ref, integration)
                if not task:
                    continue
                GitHubPullRequest.objects.update_or_create(
                    task=task,
                    repo=repo,
                    pr_number=int(pr_number),
                    defaults={
                        "pr_title": title[:255],
                        "pr_url": pr_url,
                        "status": "open",
                        "author": author,
                        "head_branch": head_branch[:255],
                        "base_branch": base_branch[:255],
                        "head_sha": head_sha[:40],
                        "draft": draft,
                        "labels": labels,
                    },
                )
                synced += 1
    GitHubIntegration.objects.filter(id__in=list(integrations.values_list("id", flat=True))).update(last_synced_at=timezone.now())
    return {"synced": synced}


@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=3600,  # cap at 1 hour
    max_retries=7,
)
def deliver_webhook(self, event_id: str) -> dict:
    """
    Deliver a single OutboxEvent with celery-managed exponential backoff.
    Falls back to the existing outbox logic but bound to a specific event.
    """
    event = OutboxEvent.objects.filter(id=event_id).first()
    if not event:
        return {"ok": False, "error": "event_not_found"}

    if event.status == OutboxEvent.STATUS_SENT:
        return {"ok": True, "skipped": True}

    try:
        if event.destination == OutboxEvent.DEST_SLACK:
            hooks = SlackWebhook.objects.filter(team_id=event.team_id, enabled=True)
            payload = _slack_payload(event)
            for hook in hooks:
                requests.post(hook.webhook_url, json=payload, timeout=5).raise_for_status()

        OutboxEvent.objects.filter(id=event_id).update(
            status=OutboxEvent.STATUS_SENT,
            last_error=None,
            updated_at=timezone.now(),
        )
        return {"ok": True}
    except Exception as exc:
        OutboxEvent.objects.filter(id=event_id).update(
            attempts=OutboxEvent.objects.filter(id=event_id).values_list("attempts", flat=True).first() + 1,
            last_error=str(exc)[:2000],
            updated_at=timezone.now(),
        )
        raise  # Celery handles retry with backoff


@shared_task
def rotate_expiring_oauth_tokens() -> dict:
    """
    Refresh OAuth tokens that expire within the next 30 minutes.
    Runs every 6 hours via celery-beat. Only handles Google/Microsoft calendar for now.
    """
    import requests as _req
    from django.conf import settings as _settings
    from apps.integrations.models import ExternalCalendarAccount

    cutoff = timezone.now() + timezone.timedelta(minutes=30)
    candidates = ExternalCalendarAccount.objects.filter(
        enabled=True,
        expires_at__lte=cutoff,
    ).exclude(refresh_token_enc="").exclude(refresh_token="")

    refreshed = 0
    failed = 0

    for account in candidates:
        refresh_tok = account.get_refresh_token()
        if not refresh_tok:
            continue
        try:
            if account.provider == ExternalCalendarAccount.PROVIDER_GOOGLE:
                resp = _req.post(
                    "https://oauth2.googleapis.com/token",
                    data={
                        "client_id": getattr(_settings, "GOOGLE_CLIENT_ID", ""),
                        "client_secret": getattr(_settings, "GOOGLE_CLIENT_SECRET", ""),
                        "refresh_token": refresh_tok,
                        "grant_type": "refresh_token",
                    },
                    timeout=10,
                )
                resp.raise_for_status()
                new_data = resp.json()
                new_access = new_data.get("access_token", "")
                expires_in = int(new_data.get("expires_in", 3600))

            elif account.provider == ExternalCalendarAccount.PROVIDER_MICROSOFT:
                resp = _req.post(
                    "https://login.microsoftonline.com/common/oauth2/v2.0/token",
                    data={
                        "client_id": getattr(_settings, "MICROSOFT_CLIENT_ID", ""),
                        "client_secret": getattr(_settings, "MICROSOFT_CLIENT_SECRET", ""),
                        "refresh_token": refresh_tok,
                        "grant_type": "refresh_token",
                        "scope": "https://graph.microsoft.com/Calendars.ReadWrite offline_access",
                    },
                    timeout=10,
                )
                resp.raise_for_status()
                new_data = resp.json()
                new_access = new_data.get("access_token", "")
                new_refresh = new_data.get("refresh_token", refresh_tok)
                expires_in = int(new_data.get("expires_in", 3600))
                account.set_tokens(new_access, new_refresh)
            else:
                continue

            if account.provider == ExternalCalendarAccount.PROVIDER_GOOGLE:
                account.set_tokens(new_access, refresh_tok)  # Google doesn't rotate refresh token

            account.expires_at = timezone.now() + timezone.timedelta(seconds=expires_in)
            account.save(update_fields=["access_token_enc", "refresh_token_enc", "expires_at"])
            refreshed += 1

        except Exception as exc:
            failed += 1
            import logging
            logging.getLogger(__name__).warning("Token refresh failed for account %s: %s", account.id, exc)

    return {"refreshed": refreshed, "failed": failed}
