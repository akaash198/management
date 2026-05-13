from __future__ import annotations

from django.conf import settings
from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework import permissions

try:
    from prometheus_client import CONTENT_TYPE_LATEST, generate_latest
except Exception:  # pragma: no cover
    CONTENT_TYPE_LATEST = "text/plain; version=0.0.4; charset=utf-8"
    generate_latest = None


class MetricsView(APIView):
    """
    Exposes Prometheus metrics at /api/metrics/.
    Restricted to authenticated superusers by default.
    Override PROMETHEUS_ALLOWED_IPS env var for internal-network access.
    """
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        if generate_latest is None:
            return HttpResponse(b"prometheus_client not installed", status=501, content_type="text/plain")

        allowed_ips_str = getattr(settings, "PROMETHEUS_ALLOWED_IPS", "")
        if allowed_ips_str:
            client_ip = request.META.get("REMOTE_ADDR", "") or ""
            forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
            if forwarded:
                client_ip = forwarded.split(",")[0].strip()
            allowed = [ip.strip() for ip in allowed_ips_str.split(",")]
            if client_ip not in allowed and not request.user.is_superuser:
                return HttpResponse(b"Forbidden", status=403, content_type="text/plain")

        if not request.user.is_superuser:
            return HttpResponse(b"Forbidden", status=403, content_type="text/plain")

        data = generate_latest()
        return HttpResponse(data, content_type=CONTENT_TYPE_LATEST)
