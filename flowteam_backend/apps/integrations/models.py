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
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("team", "project")

    @property
    def full_repo(self):
        return f"{self.repo_owner}/{self.repo_name}" if self.repo_owner and self.repo_name else ""


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
