from __future__ import annotations

from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.conf import settings

from apps.audit.models import AuditLog


class Command(BaseCommand):
    help = "Purge audit logs older than AUDIT_LOG_RETENTION_DAYS (default 365)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--days",
            type=int,
            default=None,
            help="Override retention in days (defaults to settings.AUDIT_LOG_RETENTION_DAYS or 365).",
        )

    def handle(self, *args, **options):
        retention_days = options.get("days")
        if retention_days is None:
            retention_days = int(getattr(settings, "AUDIT_LOG_RETENTION_DAYS", 365))

        if retention_days < 0:
            self.stderr.write(self.style.ERROR("--days must be >= 0"))
            return 2

        cutoff = timezone.now() - timedelta(days=retention_days)
        qs = AuditLog.objects.filter(created_at__lt=cutoff)
        count = qs.count()
        qs.delete()

        self.stdout.write(f"Purged {count} audit logs older than {retention_days} days (cutoff={cutoff.isoformat()}).")
        return 0

