from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
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

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
