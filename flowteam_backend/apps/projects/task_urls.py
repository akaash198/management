"""
Dedicated task URL router — avoids conflict with ProjectViewSet's catch-all '' pattern.
Accessible at: /api/tasks/
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TaskViewSet,
    AttachmentUploadView,
    AttachmentDetailView,
    AttachmentReplaceView,
    TimeLogViewSet,
    task_pull_requests,
    task_git_branches,
    task_git_commits,
    task_create_pr,
)
from apps.messaging.views import TaskCommentView

router = DefaultRouter()
router.register(r"", TaskViewSet, basename="task-standalone")

urlpatterns = [
    path("", include(router.urls)),
    path("<uuid:task_id>/attachments/", AttachmentUploadView.as_view(), name="task-attachment-upload-standalone"),
    path("attachments/<uuid:attachment_id>/", AttachmentDetailView.as_view(), name="task-attachment-detail"),
    path("attachments/<uuid:attachment_id>/replace/", AttachmentReplaceView.as_view(), name="task-attachment-replace"),
    path("<uuid:task_id>/pull-requests/", task_pull_requests, name="task-pull-requests-standalone"),
    path("<uuid:task_id>/git/branches/", task_git_branches, name="task-git-branches-standalone"),
    path("<uuid:task_id>/git/commits/", task_git_commits, name="task-git-commits-standalone"),
    path("<uuid:task_id>/create-pr/", task_create_pr, name="task-create-pr-standalone"),
    path("<uuid:task_pk>/timelogs/", TimeLogViewSet.as_view({"get": "list", "post": "create"}), name="task-timelog-list-standalone"),
    path("<uuid:task_pk>/timelogs/<uuid:pk>/", TimeLogViewSet.as_view({"patch": "partial_update", "delete": "destroy"}), name="task-timelog-detail-standalone"),
    path("<uuid:id>/comments/", TaskCommentView.as_view(), name="task-comments"),
]
