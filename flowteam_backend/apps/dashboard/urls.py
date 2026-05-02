from django.urls import path
from .views import (
    DashboardView, 
    SuperAdminDashboardView,
    WorkloadView, 
    CalendarView, 
    GlobalSearchView, 
    ProjectVisitView
)

urlpatterns = [
    path("", DashboardView.as_view(), name="dashboard"),
    path("super-admin/", SuperAdminDashboardView.as_view(), name="super-admin-dashboard"),
    path("workload/", WorkloadView.as_view(), name="workload"),
    path("calendar/", CalendarView.as_view(), name="calendar"),
    path("search/", GlobalSearchView.as_view(), name="search"),
    path("visit/<uuid:id>/", ProjectVisitView.as_view(), name="project-visit"),
]
