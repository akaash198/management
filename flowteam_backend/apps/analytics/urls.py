from django.urls import path
from .views import (
    velocity_analytics, 
    burndown_analytics, 
    member_stats_analytics, 
    project_health_analytics
)

urlpatterns = [
    path("velocity/", velocity_analytics, name="analytics-velocity"),
    path("burndown/", burndown_analytics, name="analytics-burndown"),
    path("member-stats/", member_stats_analytics, name="analytics-member-stats"),
    path("project-health/", project_health_analytics, name="analytics-project-health"),
]
