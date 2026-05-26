from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve
from apps.core.views import HealthView
from apps.core.metrics_views import MetricsView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", HealthView.as_view(), name="health"),
    path("api/metrics/", MetricsView.as_view(), name="metrics"),
    path("api/auth/", include("apps.users.urls")),
    path("api/super-admin/", include("apps.users.admin_urls")),
    path("api/companies/", include("apps.companies.urls")),
    path("api/teams/", include("apps.teams.urls")),
    path("api/projects/", include("apps.projects.urls")),
    path("api/tasks/", include("apps.projects.task_urls")),
    path("api/messaging/", include("apps.messaging.urls")),
    path("api/dashboard/", include("apps.dashboard.urls")),
    path("api/audit/", include("apps.audit.urls")),
    path("api/analytics/", include("apps.analytics.urls")),
    path("api/integrations/", include("apps.integrations.urls")),
    path("api/meetings/", include("apps.meetings.urls")),
    path("api/billing/", include("apps.billing.urls")),
    path("api/ai/", include("apps.ai.urls")),
    path("api/reports/", include("apps.reports.urls")),
]

import os
import urllib.parse
from django.views.static import serve
from django.views.decorators.clickjacking import xframe_options_exempt
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed
from apps.core.jwt_cookie_auth import CookieJWTAuthentication

def _auth_media_request(request):
    """Return True if the request carries a valid JWT (header or cookie)."""
    try:
        result = CookieJWTAuthentication().authenticate(request)
        return result is not None
    except (InvalidToken, AuthenticationFailed):
        return False

@xframe_options_exempt
def custom_serve(request, path, document_root=None, **kwargs):
    # Require authentication for all media files
    if not _auth_media_request(request):
        from django.http import HttpResponse
        return HttpResponse("Unauthorized", status=401)

    response = serve(request, path, document_root, **kwargs)

    # Sanitize filename to prevent header injection
    raw_name = os.path.basename(path)
    safe_name = urllib.parse.quote(raw_name, safe=" ._-")
    if safe_name:
        response['Content-Disposition'] = f"inline; filename*=UTF-8''{safe_name}"

    # Allow the frontend to embed this file in an iframe via CSP
    frontend_url = getattr(settings, 'FRONTEND_BASE_URL', 'http://localhost:3000')
    # Validate frontend_url is a proper origin, not attacker-controlled
    from urllib.parse import urlparse
    parsed = urlparse(frontend_url)
    safe_origin = f"{parsed.scheme}://{parsed.netloc}" if parsed.scheme and parsed.netloc else "'self'"
    response['Content-Security-Policy'] = f"frame-ancestors 'self' {safe_origin}"

    if 'X-Frame-Options' in response:
        del response['X-Frame-Options']

    return response

urlpatterns += [
    re_path(r'^media/(?P<path>.*)$', custom_serve, {'document_root': settings.MEDIA_ROOT}),
]
