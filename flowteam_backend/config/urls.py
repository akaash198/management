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
from django.views.static import serve
from django.views.decorators.clickjacking import xframe_options_exempt

@xframe_options_exempt
def custom_serve(request, path, document_root=None, **kwargs):
    response = serve(request, path, document_root, **kwargs)
    filename = os.path.basename(path)
    if filename:
        # This helps PDF viewers display the correct filename instead of "(anonymous)"
        response['Content-Disposition'] = f'inline; filename="{filename}"'
    
    # Allow the frontend to embed this file in an iframe
    # We use CSP frame-ancestors because X-Frame-Options doesn't support multiple ports well
    frontend_url = getattr(settings, 'FRONTEND_BASE_URL', 'http://localhost:3000')
    response['Content-Security-Policy'] = f"frame-ancestors 'self' {frontend_url}"
    
    # Remove X-Frame-Options to let CSP take precedence in modern browsers
    if 'X-Frame-Options' in response:
        del response['X-Frame-Options']
    
    return response

if settings.DEBUG:
    # We use re_path here instead of static() to use our custom_serve
    urlpatterns += [
        re_path(r'^%s(?P<path>.*)$' % settings.MEDIA_URL, custom_serve, {'document_root': settings.MEDIA_ROOT}),
    ]
else:
    urlpatterns += [
        re_path(r'^media/(?P<path>.*)$', custom_serve, {'document_root': settings.MEDIA_ROOT}),
    ]
