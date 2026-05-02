from __future__ import annotations

from rest_framework import serializers

from apps.integrations.models import (
    BitbucketIntegration,
    ExternalCalendarAccount,
    GitHubIntegration,
    GitLabIntegration,
    SlackWebhook,
)


class SlackWebhookSerializer(serializers.ModelSerializer):
    class Meta:
        model = SlackWebhook
        fields = ("id", "team", "name", "webhook_url", "enabled", "created_at")
        read_only_fields = ("id", "created_at")


class GitHubIntegrationSerializer(serializers.ModelSerializer):
    full_repo = serializers.CharField(read_only=True)
    connected = serializers.SerializerMethodField()

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
            "created_at",
        )
        read_only_fields = ("id", "team", "project", "github_user", "created_at")

    def get_connected(self, obj):
        return True


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
