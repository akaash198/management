from __future__ import annotations

from urllib.parse import urlencode

import requests
from django.conf import settings
from django.contrib.auth import get_user_model
from django.shortcuts import redirect
from django.utils import timezone
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from apps.teams.models import Team, TeamMember

User = get_user_model()

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO = "https://www.googleapis.com/oauth2/v3/userinfo"

GITHUB_AUTH_URL = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_API = "https://api.github.com"

GITLAB_AUTH_URL = "https://gitlab.com/oauth/authorize"
GITLAB_TOKEN_URL = "https://gitlab.com/oauth/token"
GITLAB_API = "https://gitlab.com/api/v4"

BITBUCKET_AUTH_URL = "https://bitbucket.org/site/oauth2/authorize"
BITBUCKET_TOKEN_URL = "https://bitbucket.org/site/oauth2/access_token"
BITBUCKET_API = "https://api.bitbucket.org/2.0"


def _frontend_base() -> str:
    return getattr(settings, "FRONTEND_BASE_URL", "http://localhost:3000").rstrip("/")


def _issue_tokens_and_redirect(user):
    refresh = RefreshToken.for_user(user)
    params = urlencode({"access": str(refresh.access_token), "refresh": str(refresh)})
    return redirect(f"{_frontend_base()}/auth/callback?{params}")


class GoogleRedirectView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        params = {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "response_type": "code",
            "scope": "openid email profile",
            "access_type": "offline",
            "prompt": "select_account",
        }
        return redirect(f"{GOOGLE_AUTH_URL}?{urlencode(params)}")


class GoogleCallbackView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        code = request.GET.get("code")
        error = request.GET.get("error")
        if error or not code:
            return redirect(f"{_frontend_base()}/login?error=oauth_cancelled")

        token_res = requests.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
            timeout=10,
        )
        if not token_res.ok:
            return redirect(f"{_frontend_base()}/login?error=oauth_failed")

        access_token = token_res.json().get("access_token")
        info_res = requests.get(
            GOOGLE_USERINFO,
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10,
        )
        if not info_res.ok:
            return redirect(f"{_frontend_base()}/login?error=oauth_failed")

        info = info_res.json()
        email = (info.get("email") or "").lower().strip()
        full_name = info.get("name") or email.split("@")[0]
        google_id = info.get("sub")

        if not email or not google_id:
            return redirect(f"{_frontend_base()}/login?error=no_email")

        user = User.objects.filter(email=email).first()
        if user:
            if not user.oauth_provider:
                user.oauth_provider = "google"
                user.oauth_uid = google_id
                user.email_verified_at = user.email_verified_at or timezone.now()
                user.save(update_fields=["oauth_provider", "oauth_uid", "email_verified_at"])
        else:
            user = User.objects.create(
                email=email,
                full_name=full_name,
                oauth_provider="google",
                oauth_uid=google_id,
                email_verified_at=timezone.now(),
            )
            user.set_unusable_password()
            user.save(update_fields=["password"])
            team = Team.objects.create(name=f"{full_name}'s Team", created_by=user)
            TeamMember.objects.create(team=team, user=user, role=TeamMember.ADMIN)

        return _issue_tokens_and_redirect(user)


class GitHubOAuthRedirectView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        state = request.GET.get("project_id", "")
        params = {
            "client_id": settings.GITHUB_CLIENT_ID,
            "redirect_uri": settings.GITHUB_REDIRECT_URI,
            "scope": "repo",
            "state": state,
        }
        return redirect(f"{GITHUB_AUTH_URL}?{urlencode(params)}")


class GitHubOAuthCallbackView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        code = request.GET.get("code")
        project_id = request.GET.get("state", "")

        if not code:
            return redirect(f"{_frontend_base()}/login?error=github_cancelled")

        token_res = requests.post(
            GITHUB_TOKEN_URL,
            headers={"Accept": "application/json"},
            data={
                "client_id": settings.GITHUB_CLIENT_ID,
                "client_secret": settings.GITHUB_CLIENT_SECRET,
                "code": code,
                "redirect_uri": settings.GITHUB_REDIRECT_URI,
            },
            timeout=10,
        )
        access_token = token_res.json().get("access_token")
        if not access_token:
            return redirect(f"{_frontend_base()}/projects/{project_id}/settings/permissions?error=github_failed")

        user_res = requests.get(
            f"{GITHUB_API}/user",
            headers={
                "Authorization": f"token {access_token}",
                "Accept": "application/vnd.github+json",
            },
            timeout=10,
        )
        github_user = user_res.json().get("login", "")

        from apps.integrations.models import GitHubIntegration
        from apps.projects.models import Project

        project = Project.objects.filter(id=project_id).first()
        if project:
            GitHubIntegration.objects.update_or_create(
                team=project.team,
                project=project,
                defaults={"access_token": access_token, "github_user": github_user},
            )
            return redirect(f"{_frontend_base()}/projects/{project_id}/settings/permissions?github=connected")

        return redirect(f"{_frontend_base()}/dashboard?github=connected")


class GitLabOAuthRedirectView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        state = request.GET.get("project_id", "")
        params = {
            "client_id": settings.GITLAB_CLIENT_ID,
            "redirect_uri": settings.GITLAB_REDIRECT_URI,
            "response_type": "code",
            "scope": "api read_api",
            "state": state,
        }
        return redirect(f"{GITLAB_AUTH_URL}?{urlencode(params)}")


class GitLabOAuthCallbackView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        code = request.GET.get("code")
        project_id = request.GET.get("state", "")
        if not code:
            return redirect(f"{_frontend_base()}/projects/{project_id}/settings/permissions?error=gitlab_cancelled")

        token_res = requests.post(
            GITLAB_TOKEN_URL,
            data={
                "client_id": settings.GITLAB_CLIENT_ID,
                "client_secret": settings.GITLAB_CLIENT_SECRET,
                "code": code,
                "redirect_uri": settings.GITLAB_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
            timeout=10,
        )
        if not token_res.ok:
            return redirect(f"{_frontend_base()}/projects/{project_id}/settings/permissions?error=gitlab_failed")

        access_token = token_res.json().get("access_token") or ""
        if not access_token:
            return redirect(f"{_frontend_base()}/projects/{project_id}/settings/permissions?error=gitlab_failed")

        user_res = requests.get(
            f"{GITLAB_API}/user",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10,
        )
        gitlab_user = (user_res.json().get("username") or "") if user_res.ok else ""

        from apps.integrations.models import GitLabIntegration
        from apps.projects.models import Project

        project = Project.objects.filter(id=project_id).first()
        if project:
            GitLabIntegration.objects.update_or_create(
                team=project.team,
                project=project,
                defaults={"access_token": access_token, "gitlab_user": gitlab_user},
            )
            return redirect(f"{_frontend_base()}/projects/{project_id}/settings/permissions?gitlab=connected")

        return redirect(f"{_frontend_base()}/dashboard?gitlab=connected")


class BitbucketOAuthRedirectView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        state = request.GET.get("project_id", "")
        params = {
            "client_id": settings.BITBUCKET_CLIENT_ID,
            "redirect_uri": settings.BITBUCKET_REDIRECT_URI,
            "response_type": "code",
            "scope": "pullrequest repository",
            "state": state,
        }
        return redirect(f"{BITBUCKET_AUTH_URL}?{urlencode(params)}")


class BitbucketOAuthCallbackView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        code = request.GET.get("code")
        project_id = request.GET.get("state", "")
        if not code:
            return redirect(f"{_frontend_base()}/projects/{project_id}/settings/permissions?error=bitbucket_cancelled")

        token_res = requests.post(
            BITBUCKET_TOKEN_URL,
            auth=(settings.BITBUCKET_CLIENT_ID, settings.BITBUCKET_CLIENT_SECRET),
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": settings.BITBUCKET_REDIRECT_URI,
            },
            timeout=10,
        )
        if not token_res.ok:
            return redirect(f"{_frontend_base()}/projects/{project_id}/settings/permissions?error=bitbucket_failed")

        access_token = token_res.json().get("access_token") or ""
        if not access_token:
            return redirect(f"{_frontend_base()}/projects/{project_id}/settings/permissions?error=bitbucket_failed")

        user_res = requests.get(
            f"{BITBUCKET_API}/user",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10,
        )
        bitbucket_user = (user_res.json().get("display_name") or "") if user_res.ok else ""

        from apps.integrations.models import BitbucketIntegration
        from apps.projects.models import Project

        project = Project.objects.filter(id=project_id).first()
        if project:
            BitbucketIntegration.objects.update_or_create(
                team=project.team,
                project=project,
                defaults={"access_token": access_token, "bitbucket_user": bitbucket_user},
            )
            return redirect(f"{_frontend_base()}/projects/{project_id}/settings/permissions?bitbucket=connected")

        return redirect(f"{_frontend_base()}/dashboard?bitbucket=connected")
