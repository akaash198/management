from __future__ import annotations

import requests
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404
from django.conf import settings
from django.utils import timezone
import secrets

from apps.integrations.models import GitHubIntegration, SlackWebhook
from apps.integrations.models import BitbucketIntegration, GitLabIntegration
from apps.integrations.serializers import (
    BitbucketIntegrationSerializer,
    GitHubIntegrationSerializer,
    GitLabIntegrationSerializer,
    SlackWebhookSerializer,
    WebhookDeliverySerializer,
)
from apps.projects.models import Project
from apps.teams.models import Team
from apps.teams.permissions import IsTeamManager
from config.utils import standardize_response
from apps.integrations.github_client import ensure_repo_webhook
from apps.integrations.models import WebhookDelivery


def _public_webhook_url(path: str, request) -> str:
    """Return a publicly reachable URL for a webhook endpoint.

    Prefers FRONTEND_BASE_URL (the public domain) so GitHub can reach the
    server even when build_absolute_uri returns an internal Docker address.
    """
    base = (getattr(settings, "FRONTEND_BASE_URL", "") or "").rstrip("/")
    if base:
        return f"{base}/api{path}"
    return request.build_absolute_uri(path)


class SlackWebhookListCreateView(generics.ListCreateAPIView):
    serializer_class = SlackWebhookSerializer

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.IsAuthenticated(), IsTeamManager()]
        return [permissions.IsAuthenticated(), IsTeamManager()]

    def get_queryset(self):
        return SlackWebhook.objects.filter(team_id=self.kwargs["team_id"]).order_by("created_at")

    def list(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return standardize_response(data=serializer.data)

    def create(self, request, *args, **kwargs):
        team = get_object_or_404(Team, id=self.kwargs["team_id"])
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        webhook = serializer.save(team=team, created_by=request.user)
        return standardize_response(data=self.get_serializer(webhook).data, status=status.HTTP_201_CREATED)


class SlackWebhookDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = SlackWebhookSerializer
    permission_classes = (permissions.IsAuthenticated, IsTeamManager)
    lookup_url_kwarg = "wid"

    def get_queryset(self):
        return SlackWebhook.objects.filter(team_id=self.kwargs["team_id"])

    def retrieve(self, request, *args, **kwargs):
        obj = self.get_object()
        return standardize_response(data=self.get_serializer(obj).data)

    def update(self, request, *args, **kwargs):
        obj = self.get_object()
        serializer = self.get_serializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return standardize_response(data=self.get_serializer(obj).data)

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        obj.delete()
        return standardize_response(status=status.HTTP_204_NO_CONTENT)


class ProjectGitHubIntegrationView(generics.GenericAPIView):
    serializer_class = GitHubIntegrationSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_project(self):
        project = get_object_or_404(Project, id=self.kwargs["project_id"])
        if not self.request.user.is_superuser and not project.team.members.filter(user=self.request.user).exists():
            raise PermissionDenied("Forbidden")
        return project

    def get(self, request, project_id):
        project = self.get_project()
        integration = GitHubIntegration.objects.filter(project=project).first()
        if not integration:
            return standardize_response(data={"connected": False})
        return standardize_response(data=self.get_serializer(integration).data)

    def patch(self, request, project_id):
        project = self.get_project()
        is_manager = request.user.is_superuser or project.team.members.filter(
            user=request.user,
            role__in=("ceo", "admin", "manager"),
        ).exists()
        if not is_manager:
            raise PermissionDenied("Forbidden")

        integration = GitHubIntegration.objects.filter(project=project).first()
        if not integration:
            return standardize_response(success=False, error="GitHub is not connected", status=status.HTTP_404_NOT_FOUND)

        repo = (request.data.get("repo") or "").strip()
        repo_owner = (request.data.get("repo_owner") or "").strip()
        repo_name = (request.data.get("repo_name") or "").strip()
        if repo and "/" in repo:
            repo_owner, repo_name = [part.strip() for part in repo.split("/", 1)]

        if not repo_owner or not repo_name:
            return standardize_response(success=False, error="repo must be in owner/name format", status=status.HTTP_400_BAD_REQUEST)

        integration.repo_owner = repo_owner
        integration.repo_name = repo_name
        update_fields = ["repo_owner", "repo_name"]

        # Optional settings toggles
        if "default_branch" in request.data:
            integration.default_branch = (request.data.get("default_branch") or "main").strip() or "main"
            update_fields.append("default_branch")
        if "sync_commits" in request.data:
            integration.sync_commits = bool(request.data.get("sync_commits"))
            update_fields.append("sync_commits")
        if "sync_branches" in request.data:
            integration.sync_branches = bool(request.data.get("sync_branches"))
            update_fields.append("sync_branches")
        if "auto_advance_on_merge" in request.data:
            integration.auto_advance_on_merge = bool(request.data.get("auto_advance_on_merge"))
            update_fields.append("auto_advance_on_merge")

        if not integration.webhook_secret:
            integration.webhook_secret = secrets.token_hex(32)
            update_fields.append("webhook_secret")

        if not integration.webhook_id:
            webhook_url = _public_webhook_url("/integrations/github/webhook/", request)
            try:
                response = requests.post(
                    f"https://api.github.com/repos/{repo_owner}/{repo_name}/hooks",
                    headers={
                        "Authorization": f"token {integration.access_token}",
                        "Accept": "application/vnd.github+json",
                    },
                    json={
                        "name": "web",
                        "active": True,
                        "events": ["pull_request", "push", "pull_request_review", "check_run", "check_suite"],
                        "config": {
                            "url": webhook_url,
                            "content_type": "json",
                            "secret": integration.webhook_secret,
                            "insecure_ssl": "0",
                        },
                    },
                    timeout=10,
                )
                if response.ok:
                    integration.webhook_id = str(response.json().get("id") or "")
                    update_fields.append("webhook_id")
            except requests.RequestException:
                pass
        integration.last_synced_at = integration.last_synced_at or timezone.now()
        if "last_synced_at" not in update_fields:
            update_fields.append("last_synced_at")

        integration.save(update_fields=update_fields)
        return standardize_response(data=self.get_serializer(integration).data)


class ProjectGitHubWebhookDeliveriesView(generics.GenericAPIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get_project(self):
        project = get_object_or_404(Project, id=self.kwargs["project_id"])
        if not self.request.user.is_superuser and not project.team.members.filter(user=self.request.user).exists():
            raise PermissionDenied("Forbidden")
        return project

    def get(self, request, project_id):
        project = self.get_project()
        is_manager = request.user.is_superuser or project.team.members.filter(
            user=request.user,
            role__in=("ceo", "admin", "manager"),
        ).exists()
        if not is_manager:
            raise PermissionDenied("Forbidden")

        integration = GitHubIntegration.objects.filter(project=project).first()
        if not integration:
            return standardize_response(data={"connected": False, "deliveries": []})

        deliveries = WebhookDelivery.objects.filter(integration=integration).order_by("-created_at")[:200]
        return standardize_response(data={"connected": True, "deliveries": WebhookDeliverySerializer(deliveries, many=True).data})


class ProjectGitHubWebhookDeliveryRetryView(generics.GenericAPIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request, project_id, delivery_id):
        project = get_object_or_404(Project, id=project_id)
        is_manager = request.user.is_superuser or project.team.members.filter(
            user=request.user,
            role__in=("ceo", "admin", "manager"),
        ).exists()
        if not is_manager:
            raise PermissionDenied("Forbidden")

        integration = GitHubIntegration.objects.filter(project=project).first()
        if not integration:
            return standardize_response(success=False, error="GitHub is not connected", status=404)

        delivery = get_object_or_404(WebhookDelivery, id=delivery_id, integration=integration)

        # Re-process the stored payload through the same dispatcher.
        from apps.integrations.github_webhook import GitHubWebhookView

        view = GitHubWebhookView()
        try:
            handled = view._dispatch(delivery.event, delivery.payload or {}, integration)
            WebhookDelivery.objects.filter(id=delivery.id).update(
                status=WebhookDelivery.STATUS_PROCESSED if handled else WebhookDelivery.STATUS_IGNORED,
                processed_at=timezone.now(),
                error="",
            )
            return standardize_response(data={"status": "ok", "handled": bool(handled)})
        except Exception as e:
            WebhookDelivery.objects.filter(id=delivery.id).update(
                status=WebhookDelivery.STATUS_FAILED,
                processed_at=timezone.now(),
                error=str(e)[:5000],
            )
            return standardize_response(success=False, error=str(e)[:500], status=500)


class ProjectGitHubWebhookReregisterView(generics.GenericAPIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request, project_id):
        project = get_object_or_404(Project, id=project_id)
        is_manager = request.user.is_superuser or project.team.members.filter(
            user=request.user,
            role__in=("ceo", "admin", "manager"),
        ).exists()
        if not is_manager:
            raise PermissionDenied("Forbidden")

        integration = GitHubIntegration.objects.filter(project=project).first()
        if not integration:
            return standardize_response(success=False, error="GitHub is not connected", status=404)
        if not integration.repo_owner or not integration.repo_name:
            return standardize_response(success=False, error="Repository is not linked", status=400)

        webhook_url = _public_webhook_url("/integrations/github/webhook/", request)
        if not integration.webhook_secret:
            integration.webhook_secret = secrets.token_hex(32)
            integration.save(update_fields=["webhook_secret"])

        try:
            webhook_id = ensure_repo_webhook(
                integration,
                webhook_url=webhook_url,
                events=["pull_request", "push", "pull_request_review", "check_run", "check_suite"],
            )
        except Exception as e:
            return standardize_response(success=False, error=str(e)[:500], status=400)

        if webhook_id:
            integration.webhook_id = webhook_id
            integration.save(update_fields=["webhook_id"])

        return standardize_response(data=GitHubIntegrationSerializer(integration).data)


class ProjectGitLabIntegrationView(generics.GenericAPIView):
    serializer_class = GitLabIntegrationSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_project(self):
        project = get_object_or_404(Project, id=self.kwargs["project_id"])
        if not self.request.user.is_superuser and not project.team.members.filter(user=self.request.user).exists():
            raise PermissionDenied("Forbidden")
        return project

    def get(self, request, project_id):
        project = self.get_project()
        integration = GitLabIntegration.objects.filter(project=project).first()
        if not integration:
            return standardize_response(data={"connected": False})
        return standardize_response(data=self.get_serializer(integration).data)

    def patch(self, request, project_id):
        project = self.get_project()
        is_manager = request.user.is_superuser or project.team.members.filter(
            user=request.user,
            role__in=("ceo", "admin", "manager"),
        ).exists()
        if not is_manager:
            raise PermissionDenied("Forbidden")

        integration = GitLabIntegration.objects.filter(project=project).first()
        if not integration:
            return standardize_response(success=False, error="GitLab is not connected", status=status.HTTP_404_NOT_FOUND)

        repo_full_path = (request.data.get("repo_full_path") or "").strip()
        if not repo_full_path:
            return standardize_response(success=False, error="repo_full_path is required", status=status.HTTP_400_BAD_REQUEST)

        integration.repo_full_path = repo_full_path
        update_fields = ["repo_full_path"]

        if not integration.webhook_id:
            webhook_url = request.build_absolute_uri("/api/integrations/gitlab/webhook/")
            try:
                # GitLab project paths must be URL-encoded (including slashes).
                from urllib.parse import quote

                project_path = quote(repo_full_path, safe="")
                response = requests.post(
                    f"https://gitlab.com/api/v4/projects/{project_path}/hooks",
                    headers={"PRIVATE-TOKEN": integration.access_token},
                    data={
                        "url": webhook_url,
                        "merge_requests_events": True,
                        "enable_ssl_verification": True,
                        # GitLab compares this token string directly.
                        "token": getattr(settings, "GITLAB_WEBHOOK_SECRET", ""),
                    },
                    timeout=10,
                )
                if response.ok:
                    integration.webhook_id = str(response.json().get("id") or "")
                    update_fields.append("webhook_id")
            except requests.RequestException:
                pass

        integration.save(update_fields=update_fields)
        return standardize_response(data=self.get_serializer(integration).data)


class ProjectBitbucketIntegrationView(generics.GenericAPIView):
    serializer_class = BitbucketIntegrationSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_project(self):
        project = get_object_or_404(Project, id=self.kwargs["project_id"])
        if not self.request.user.is_superuser and not project.team.members.filter(user=self.request.user).exists():
            raise PermissionDenied("Forbidden")
        return project

    def get(self, request, project_id):
        project = self.get_project()
        integration = BitbucketIntegration.objects.filter(project=project).first()
        if not integration:
            return standardize_response(data={"connected": False})
        return standardize_response(data=self.get_serializer(integration).data)

    def patch(self, request, project_id):
        project = self.get_project()
        is_manager = request.user.is_superuser or project.team.members.filter(
            user=request.user,
            role__in=("ceo", "admin", "manager"),
        ).exists()
        if not is_manager:
            raise PermissionDenied("Forbidden")

        integration = BitbucketIntegration.objects.filter(project=project).first()
        if not integration:
            return standardize_response(success=False, error="Bitbucket is not connected", status=status.HTTP_404_NOT_FOUND)

        workspace = (request.data.get("workspace") or "").strip()
        repo_slug = (request.data.get("repo_slug") or "").strip()
        repo_full = (request.data.get("repo") or "").strip()
        if repo_full and "/" in repo_full and (not workspace or not repo_slug):
            workspace, repo_slug = [p.strip() for p in repo_full.split("/", 1)]

        if not workspace or not repo_slug:
            return standardize_response(success=False, error="workspace and repo_slug are required", status=status.HTTP_400_BAD_REQUEST)

        integration.workspace = workspace
        integration.repo_slug = repo_slug
        update_fields = ["workspace", "repo_slug"]

        if not integration.webhook_id:
            webhook_url = request.build_absolute_uri("/api/integrations/bitbucket/webhook/")
            try:
                response = requests.post(
                    f"https://api.bitbucket.org/2.0/repositories/{workspace}/{repo_slug}/hooks",
                    headers={"Authorization": f"Bearer {integration.access_token}"},
                    json={
                        "description": "FlowTeam PR webhook",
                        "url": webhook_url,
                        "active": True,
                        "events": [
                            "pullrequest:created",
                            "pullrequest:updated",
                            "pullrequest:fulfilled",
                            "pullrequest:rejected",
                        ],
                        # Bitbucket doesn't support signing secrets like GitHub; keep for future.
                    },
                    timeout=10,
                )
                if response.ok:
                    integration.webhook_id = str(response.json().get("uuid") or response.json().get("id") or "")
                    update_fields.append("webhook_id")
            except requests.RequestException:
                pass

        integration.save(update_fields=update_fields)
        return standardize_response(data=self.get_serializer(integration).data)
