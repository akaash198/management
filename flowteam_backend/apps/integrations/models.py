from __future__ import annotations

import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone

from apps.teams.models import Team


class SlackWebhook(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="slack_webhooks")
    name = models.CharField(max_length=120, default="Default")
    webhook_url = models.URLField(max_length=500)
    enabled = models.BooleanField(default=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("team", "name")
        indexes = [models.Index(fields=["team", "enabled"], name="integrations_team_en_idx")]


class GitHubIntegration(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="github_integrations")
    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="github_integration",
    )
    access_token = models.TextField()
    github_user = models.CharField(max_length=255)
    repo_owner = models.CharField(max_length=255, blank=True)
    repo_name = models.CharField(max_length=255, blank=True)
    webhook_id = models.CharField(max_length=50, blank=True)
    default_branch = models.CharField(max_length=255, default="main")
    webhook_secret = models.CharField(max_length=64, blank=True, default="")
    token_expires_at = models.DateTimeField(null=True, blank=True)
    last_synced_at = models.DateTimeField(null=True, blank=True)
    sync_commits = models.BooleanField(default=True)
    sync_branches = models.BooleanField(default=True)
    auto_advance_on_merge = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("team", "project")

    @property
    def full_repo(self):
        return f"{self.repo_owner}/{self.repo_name}" if self.repo_owner and self.repo_name else ""


class GitBranch(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    integration = models.ForeignKey(GitHubIntegration, on_delete=models.CASCADE, related_name="branches")
    task = models.ForeignKey("projects.Task", on_delete=models.SET_NULL, null=True, blank=True, related_name="git_branches")
    name = models.CharField(max_length=255)
    base_branch = models.CharField(max_length=255, default="main")
    sha = models.CharField(max_length=40, blank=True, default="")
    author_login = models.CharField(max_length=100, blank=True, default="")
    is_merged = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("integration", "name")
        indexes = [
            models.Index(fields=["integration", "task"], name="gitbranch_integ_task_idx"),
            models.Index(fields=["integration", "name"], name="gitbranch_integ_name_idx"),
        ]


class GitCommit(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    integration = models.ForeignKey(GitHubIntegration, on_delete=models.CASCADE, related_name="commits")
    task = models.ForeignKey("projects.Task", on_delete=models.SET_NULL, null=True, blank=True, related_name="git_commits")
    branch = models.ForeignKey(GitBranch, on_delete=models.SET_NULL, null=True, blank=True, related_name="commits")
    sha = models.CharField(max_length=40, unique=True)
    message = models.TextField(blank=True, default="")
    author_login = models.CharField(max_length=100, blank=True, default="")
    author_email = models.CharField(max_length=254, blank=True, default="")
    url = models.URLField(max_length=500, blank=True, default="")
    committed_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["integration", "task", "committed_at"], name="gitcommit_integ_task_time_idx"),
            models.Index(fields=["integration", "branch", "committed_at"], name="gitcommit_integ_branch_time_idx"),
        ]


class WebhookDelivery(models.Model):
    STATUS_RECEIVED = "received"
    STATUS_PROCESSED = "processed"
    STATUS_FAILED = "failed"
    STATUS_IGNORED = "ignored"
    STATUS_CHOICES = [
        (STATUS_RECEIVED, "Received"),
        (STATUS_PROCESSED, "Processed"),
        (STATUS_FAILED, "Failed"),
        (STATUS_IGNORED, "Ignored"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    integration = models.ForeignKey(GitHubIntegration, on_delete=models.CASCADE, related_name="webhook_deliveries")
    event = models.CharField(max_length=50)
    delivery_id = models.CharField(max_length=64)
    payload_hash = models.CharField(max_length=64)
    payload = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_RECEIVED)
    error = models.TextField(blank=True, default="")
    processed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("integration", "delivery_id")
        indexes = [
            models.Index(fields=["integration", "status", "created_at"], name="whdel_integ_status_time_idx"),
            models.Index(fields=["integration", "event", "created_at"], name="whdel_integ_event_time_idx"),
        ]


class GitLabIntegration(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="gitlab_integrations")
    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="gitlab_integration",
    )
    access_token = models.TextField()
    gitlab_user = models.CharField(max_length=255, blank=True, default="")
    repo_full_path = models.CharField(max_length=512, blank=True, default="")  # group/subgroup/repo
    webhook_id = models.CharField(max_length=80, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("team", "project")


class BitbucketIntegration(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="bitbucket_integrations")
    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="bitbucket_integration",
    )
    access_token = models.TextField()
    bitbucket_user = models.CharField(max_length=255, blank=True, default="")
    workspace = models.CharField(max_length=255, blank=True, default="")
    repo_slug = models.CharField(max_length=255, blank=True, default="")
    webhook_id = models.CharField(max_length=80, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("team", "project")


class ExternalCalendarAccount(models.Model):
    PROVIDER_GOOGLE = "google"
    PROVIDER_MICROSOFT = "microsoft"
    PROVIDER_CHOICES = [
        (PROVIDER_GOOGLE, "Google Calendar"),
        (PROVIDER_MICROSOFT, "Microsoft Outlook"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="calendar_accounts")
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="calendar_accounts")
    provider = models.CharField(max_length=20, choices=PROVIDER_CHOICES)

    access_token = models.TextField(blank=True, default="")
    refresh_token = models.TextField(blank=True, default="")
    expires_at = models.DateTimeField(null=True, blank=True)
    scopes = models.TextField(blank=True, default="")

    enabled = models.BooleanField(default=True)
    sync_external_events = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("user", "team", "provider")
        indexes = [
            models.Index(fields=["team", "provider", "enabled"], name="cal_team_provider_en_idx"),
        ]


class OutboxEvent(models.Model):
    DEST_SLACK = "slack"
    DEST_CHOICES = [(DEST_SLACK, "Slack")]

    STATUS_PENDING = "pending"
    STATUS_PROCESSING = "processing"
    STATUS_SENT = "sent"
    STATUS_FAILED = "failed"

    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_PROCESSING, "Processing"),
        (STATUS_SENT, "Sent"),
        (STATUS_FAILED, "Failed"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    team = models.ForeignKey(Team, on_delete=models.CASCADE, null=True, blank=True, related_name="outbox_events")
    destination = models.CharField(max_length=40, choices=DEST_CHOICES, default=DEST_SLACK)
    event_type = models.CharField(max_length=120)
    payload = models.JSONField(default=dict, blank=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    attempts = models.PositiveIntegerField(default=0)
    next_attempt_at = models.DateTimeField(default=timezone.now)
    last_error = models.TextField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["status", "next_attempt_at"], name="outbox_status_next_idx"),
            models.Index(fields=["team", "destination", "status"], name="outbox_team_dest_status_idx"),
        ]
