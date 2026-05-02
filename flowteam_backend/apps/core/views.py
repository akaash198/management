from __future__ import annotations

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.core.cache import cache
from django.db import connections

from config.utils import standardize_response


class HealthView(APIView):
    permission_classes = (permissions.AllowAny,)

    def get(self, request):
        checks: dict[str, dict[str, object]] = {"db": {"ok": False}, "cache": {"ok": False}}

        try:
            with connections["default"].cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
            checks["db"]["ok"] = True
        except Exception as e:
            checks["db"]["error"] = str(e)

        try:
            cache.set("health:ping", "1", timeout=5)
            checks["cache"]["ok"] = cache.get("health:ping") == "1"
        except Exception as e:
            checks["cache"]["error"] = str(e)

        ok = bool(checks["db"]["ok"]) and bool(checks["cache"]["ok"])
        return standardize_response(
            data={"ok": ok, "checks": checks},
            success=ok,
            status=status.HTTP_200_OK if ok else status.HTTP_503_SERVICE_UNAVAILABLE,
        )

