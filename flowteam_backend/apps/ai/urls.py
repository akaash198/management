from django.urls import path

from . import views

urlpatterns = [
    path("generate-tasks/", views.GenerateTasksView.as_view(), name="ai-generate-tasks"),
    path("summarize-task/", views.TaskSummarizeView.as_view(), name="ai-summarize-task"),
    path("sprint-plan/", views.SprintPlanView.as_view(), name="ai-sprint-plan"),
    path("channel-summary/", views.ChannelSummaryView.as_view(), name="ai-channel-summary"),
    path("health-score/", views.ProjectHealthScoreView.as_view(), name="ai-health-score"),
    path("retrospective/", views.RetrospectiveView.as_view(), name="ai-retrospective"),
    path("workload-balance/", views.WorkloadBalanceView.as_view(), name="ai-workload-balance"),
    path("client-report/", views.ClientReportView.as_view(), name="ai-client-report"),
    path("meeting-action-items/", views.MeetingActionItemsView.as_view(), name="ai-meeting-action-items"),
    path("build-automation/", views.AutomationBuilderView.as_view(), name="ai-build-automation"),
    path("daily-briefing/", views.DailyBriefingView.as_view(), name="ai-daily-briefing"),
    path("task-description/", views.TaskDescriptionView.as_view(), name="ai-task-description"),
    path("focus-recommend/", views.FocusRecommendView.as_view(), name="ai-focus-recommend"),
    path("weekly-report/", views.WeeklyReportView.as_view(), name="ai-weekly-report"),
    path("auto-label/", views.AutoLabelView.as_view(), name="ai-auto-label"),
    path("dashboard/", views.AIUsageDashboardView.as_view(), name="ai-dashboard"),
    path("test-connection/", views.AITestConnectionView.as_view(), name="ai-test-connection"),
]
