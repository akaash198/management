from __future__ import annotations

import json
import requests
from celery import shared_task
from django.db import transaction
from django.utils import timezone

from apps.integrations.models import OutboxEvent, SlackWebhook
from apps.integrations.outbox import compute_next_attempt
from apps.core.metrics import outbox_events_total


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
