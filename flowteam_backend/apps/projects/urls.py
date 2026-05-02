from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ProjectViewSet, ColumnViewSet, TaskViewSet, AttachmentUploadView,
    ProjectRoleViewSet, TimeLogViewSet, SprintViewSet, MilestoneViewSet,
    TaskLinkViewSet, SavedIssueViewViewSet, ProjectTemplateViewSet,
    RecurringTaskRuleViewSet, roadmap_overview, workload_overview,
    TaskApprovalViewSet, ProjectDocumentViewSet, NotificationRuleViewSet,
    IssueTypeFieldDefinitionViewSet, TaskCustomFieldValueViewSet,
    AutomationRuleViewSet, ClientPortalAccessViewSet, CommentAttachmentUploadView,
    AttachmentVersionUploadView, activity_feed, advanced_reporting,
    calendar_export, client_portal_detail, task_pull_requests
)

router = DefaultRouter()
router.register(r"tasks", TaskViewSet, basename="task")
router.register(r"sprints", SprintViewSet, basename="sprint")
router.register(r"milestones", MilestoneViewSet, basename="milestone")
router.register(r"task-links", TaskLinkViewSet, basename="task-link")
router.register(r"saved-views", SavedIssueViewViewSet, basename="saved-issue-view")
router.register(r"templates", ProjectTemplateViewSet, basename="project-template")
router.register(r"recurring-rules", RecurringTaskRuleViewSet, basename="recurring-task-rule")
router.register(r"approvals", TaskApprovalViewSet, basename="task-approval")
router.register(r"documents", ProjectDocumentViewSet, basename="project-document")
router.register(r"notification-rules", NotificationRuleViewSet, basename="notification-rule")
router.register(r"issue-fields", IssueTypeFieldDefinitionViewSet, basename="issue-field-definition")
router.register(r"custom-field-values", TaskCustomFieldValueViewSet, basename="task-custom-field-value")
router.register(r"automation-rules", AutomationRuleViewSet, basename="automation-rule")
router.register(r"client-access", ClientPortalAccessViewSet, basename="client-portal-access")
router.register(r"", ProjectViewSet, basename="project")

urlpatterns = [
    path("", include(router.urls)),
    path("roadmap/overview/", roadmap_overview, name="roadmap-overview"),
    path("workload/overview/", workload_overview, name="workload-overview"),
    path("activity/feed/", activity_feed, name="activity-feed"),
    path("reporting/advanced/", advanced_reporting, name="advanced-reporting"),
    path("calendar/export/", calendar_export, name="calendar-export"),
    path("client-portal/<uuid:token>/", client_portal_detail, name="client-portal-detail"),
    path("<uuid:project_pk>/columns/", ColumnViewSet.as_view({"get": "list", "post": "create"}), name="column-list"),
    path("<uuid:project_pk>/columns/<uuid:pk>/", ColumnViewSet.as_view({"patch": "partial_update", "delete": "destroy"}), name="column-detail"),
    path("tasks/<uuid:task_id>/attachments/", AttachmentUploadView.as_view(), name="task-attachment-upload"),
    path("tasks/<uuid:task_id>/pull-requests/", task_pull_requests, name="task-pull-requests"),
    path("comments/<uuid:comment_id>/attachments/", CommentAttachmentUploadView.as_view(), name="comment-attachment-upload"),
    path("attachments/<uuid:attachment_id>/versions/", AttachmentVersionUploadView.as_view(), name="attachment-version-upload"),
    
    # Project Roles
    path("<uuid:project_pk>/roles/", ProjectRoleViewSet.as_view({"get": "list", "post": "create"}), name="project-role-list"),
    path("<uuid:project_pk>/roles/<uuid:pk>/", ProjectRoleViewSet.as_view({"patch": "partial_update", "delete": "destroy"}), name="project-role-detail"),
    
    # Time Logs
    path("tasks/<uuid:task_pk>/timelogs/", TimeLogViewSet.as_view({"get": "list", "post": "create"}), name="task-timelog-list"),
    path("tasks/<uuid:task_pk>/timelogs/<uuid:pk>/", TimeLogViewSet.as_view({"patch": "partial_update", "delete": "destroy"}), name="task-timelog-detail"),
]
