from __future__ import annotations

from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework import permissions

try:
    from prometheus_client import CONTENT_TYPE_LATEST, generate_latest
except Exception:  # pragma: no cover
    CONTENT_TYPE_LATEST = "text/plain; version=0.0.4; charset=utf-8"
    generate_latest = None


class MetricsView(APIView):
    permission_classes = (permissions.AllowAny,)

    def get(self, request):
        if generate_latest is None:
            return HttpResponse(b"prometheus_client not installed", status=501, content_type="text/plain")

        data = generate_latest()
        return HttpResponse(data, content_type=CONTENT_TYPE_LATEST)
