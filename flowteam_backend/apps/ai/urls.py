from django.urls import path

from . import views

urlpatterns = [
    # ── Individual contributor ──────────────────────────────────────────────
    path("generate-tasks/", views.GenerateTasksView.as_view(), name="ai-generate-tasks"),
    path("summarize-task/", views.TaskSummarizeView.as_view(), name="ai-summarize-task"),
    path("task-description/", views.TaskDescriptionView.as_view(), name="ai-task-description"),
    path("focus-recommend/", views.FocusRecommendView.as_view(), name="ai-focus-recommend"),
    path("daily-briefing/", views.DailyBriefingView.as_view(), name="ai-daily-briefing"),
    path("auto-label/", views.AutoLabelView.as_view(), name="ai-auto-label"),
    path("thread-reply-draft/", views.ThreadReplyDraftView.as_view(), name="ai-thread-reply-draft"),

    # ── Manager ─────────────────────────────────────────────────────────────
    path("sprint-plan/", views.SprintPlanView.as_view(), name="ai-sprint-plan"),
    path("retrospective/", views.RetrospectiveView.as_view(), name="ai-retrospective"),
    path("workload-balance/", views.WorkloadBalanceView.as_view(), name="ai-workload-balance"),
    path("health-score/", views.ProjectHealthScoreView.as_view(), name="ai-health-score"),
    path("blocker-detect/", views.BlockerDetectView.as_view(), name="ai-blocker-detect"),
    path("escalation-scan/", views.EscalationScanView.as_view(), name="ai-escalation-scan"),
    path("weekly-report/", views.WeeklyReportView.as_view(), name="ai-weekly-report"),
    path("channel-summary/", views.ChannelSummaryView.as_view(), name="ai-channel-summary"),
    path("meeting-action-items/", views.MeetingActionItemsView.as_view(), name="ai-meeting-action-items"),
    path("client-report/", views.ClientReportView.as_view(), name="ai-client-report"),
    path("build-automation/", views.AutomationBuilderView.as_view(), name="ai-build-automation"),
    path("manager-risk-rollup/", views.ManagerRiskRollupView.as_view(), name="ai-manager-risk-rollup"),

    # ── Leadership / portfolio ───────────────────────────────────────────────
    path("portfolio-summary/", views.PortfolioSummaryView.as_view(), name="ai-portfolio-summary"),

    # ── DS / AI teams ────────────────────────────────────────────────────────
    path("experiment-summary/", views.ExperimentSummaryView.as_view(), name="ai-experiment-summary"),
    path("model-card-draft/", views.ModelCardDraftView.as_view(), name="ai-model-card-draft"),

    # ── Usage / audit / admin ────────────────────────────────────────────────
    path("dashboard/", views.AIUsageDashboardView.as_view(), name="ai-dashboard"),
    path("test-connection/", views.AITestConnectionView.as_view(), name="ai-test-connection"),
    path("logs/<uuid:log_id>/feedback/", views.AIFeedbackView.as_view(), name="ai-feedback"),
    path("daily-budget/", views.AIDailyBudgetView.as_view(), name="ai-daily-budget"),
    path("feature-policy/", views.AIFeaturePolicyView.as_view(), name="ai-feature-policy"),
]
