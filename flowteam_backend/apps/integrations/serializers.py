from __future__ import annotations

from rest_framework import serializers

from apps.integrations.models import (
    BitbucketIntegration,
    ExternalCalendarAccount,
    GitBranch,
    GitCommit,
    GitHubIntegration,
    GitLabIntegration,
    SlackWebhook,
    WebhookDelivery,
)


class SlackWebhookSerializer(serializers.ModelSerializer):
    class Meta:
        model = SlackWebhook
        fields = ("id", "team", "name", "webhook_url", "enabled", "created_at")
        read_only_fields = ("id", "created_at")


class GitHubIntegrationSerializer(serializers.ModelSerializer):
    full_repo = serializers.CharField(read_only=True)
    connected = serializers.SerializerMethodField()
    webhook_status = serializers.SerializerMethodField()
    last_delivery_at = serializers.SerializerMethodField()

    class Meta:
        model = GitHubIntegration
        fields = (
            "id",
            "team",
            "project",
            "github_user",
            "repo_owner",
            "repo_name",
            "full_repo",
            "connected",
            "default_branch",
            "sync_commits",
            "sync_branches",
            "auto_advance_on_merge",
            "last_synced_at",
            "webhook_status",
            "last_delivery_at",
            "created_at",
        )
        read_only_fields = ("id", "team", "project", "github_user", "created_at")

    def get_connected(self, obj):
        return True

    def get_webhook_status(self, obj):
        # "active" if a webhook id exists and we have a secret for signature validation.
        return "active" if (obj.webhook_id and obj.webhook_secret) else "inactive"

    def get_last_delivery_at(self, obj):
        from apps.integrations.models import WebhookDelivery

        last = WebhookDelivery.objects.filter(integration=obj).order_by("-created_at").values_list("created_at", flat=True).first()
        return last


class GitLabIntegrationSerializer(serializers.ModelSerializer):
    connected = serializers.SerializerMethodField()

    class Meta:
        model = GitLabIntegration
        fields = ("id", "team", "project", "gitlab_user", "repo_full_path", "connected", "created_at")
        read_only_fields = ("id", "team", "project", "gitlab_user", "created_at")

    def get_connected(self, obj):
        return True


class BitbucketIntegrationSerializer(serializers.ModelSerializer):
    connected = serializers.SerializerMethodField()

    class Meta:
        model = BitbucketIntegration
        fields = ("id", "team", "project", "bitbucket_user", "workspace", "repo_slug", "connected", "created_at")
        read_only_fields = ("id", "team", "project", "bitbucket_user", "created_at")

    def get_connected(self, obj):
        return True


class ExternalCalendarAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExternalCalendarAccount
        fields = (
            "id",
            "user",
            "team",
            "provider",
            "enabled",
            "sync_external_events",
            "scopes",
            "expires_at",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "user", "team", "created_at", "updated_at")


class GitBranchSerializer(serializers.ModelSerializer):
    class Meta:
        model = GitBranch
        fields = (
            "id",
            "integration",
            "task",
            "name",
            "base_branch",
            "sha",
            "author_login",
            "is_merged",
            "created_at",
            "updated_at",
        )


class GitCommitSerializer(serializers.ModelSerializer):
    class Meta:
        model = GitCommit
        fields = (
            "id",
            "integration",
            "task",
            "branch",
            "sha",
            "message",
            "author_login",
            "author_email",
            "url",
            "committed_at",
            "created_at",
        )


class WebhookDeliverySerializer(serializers.ModelSerializer):
    class Meta:
        model = WebhookDelivery
        fields = (
            "id",
            "integration",
            "event",
            "delivery_id",
            "payload_hash",
            "payload",
            "status",
            "error",
            "processed_at",
            "created_at",
        )
