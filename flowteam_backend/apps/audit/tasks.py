from __future__ import annotations

from datetime import timedelta

from celery import shared_task
from django.conf import settings
from django.utils import timezone

from apps.audit.models import AuditLog


@shared_task
def purge_old_audit_logs() -> int:
    """
    Best-effort retention purge task.

    If you use `django-celery-beat`, schedule this daily (or weekly).
    """
    retention_days = int(getattr(settings, "AUDIT_LOG_RETENTION_DAYS", 365))
    cutoff = timezone.now() - timedelta(days=retention_days)
    qs = AuditLog.objects.filter(created_at__lt=cutoff)
    count = qs.count()
    qs.delete()
    return count

