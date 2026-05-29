from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any
from urllib.parse import urlencode

import requests
from django.conf import settings
from django.core import signing
from django.shortcuts import redirect
from django.utils import timezone
from rest_framework import permissions, status, views
from rest_framework.exceptions import PermissionDenied

from apps.integrations.models import ExternalCalendarAccount
from apps.integrations.serializers import ExternalCalendarAccountSerializer
from apps.teams.models import Team
from config.utils import standardize_response


GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events"

MS_AUTH_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize"
MS_TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token"
MS_CALENDAR_VIEW = "https://graph.microsoft.com/v1.0/me/calendarview"


def _frontend_base() -> str:
    return getattr(settings, "FRONTEND_BASE_URL", "http://localhost:3000").rstrip("/")


def _require_team_member(user, team: Team) -> None:
    if getattr(user, "is_superuser", False):
        return
    if not team.members.filter(user=user).exists():
        raise PermissionDenied("Forbidden")


def _state_sign(payload: dict) -> str:
    return signing.dumps(payload, salt="calendar_oauth", compress=True)


def _state_unsign(state: str) -> dict:
    return signing.loads(state, salt="calendar_oauth", max_age=60 * 15)


def _expires_at(expires_in: Any) -> datetime | None:
    try:
        seconds = int(expires_in or 0)
    except Exception:
        return None
    if seconds <= 0:
        return None
    return timezone.now() + timedelta(seconds=seconds)


def _google_auth_url(state: str) -> str:
    redirect_uri = getattr(settings, "GOOGLE_CALENDAR_REDIRECT_URI", "") or settings.GOOGLE_REDIRECT_URI
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "access_type": "offline",
        "prompt": "consent",
        "scope": "openid email profile https://www.googleapis.com/auth/calendar.events.readonly",
        "state": state,
    }
    return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"


def _microsoft_auth_url(state: str) -> str:
    redirect_uri = getattr(settings, "MICROSOFT_CALENDAR_REDIRECT_URI", "") or settings.MICROSOFT_REDIRECT_URI
    params = {
        "client_id": settings.MICROSOFT_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "response_mode": "query",
        "scope": "offline_access Calendars.Read",
        "state": state,
    }
    return f"{MS_AUTH_URL}?{urlencode(params)}"


def _exchange_google(code: str) -> dict | None:
    redirect_uri = getattr(settings, "GOOGLE_CALENDAR_REDIRECT_URI", "") or settings.GOOGLE_REDIRECT_URI
    res = requests.post(
        GOOGLE_TOKEN_URL,
        data={
            "code": code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        },
        timeout=10,
    )
    return res.json() if res.ok else None


def _exchange_microsoft(code: str) -> dict | None:
    redirect_uri = getattr(settings, "MICROSOFT_CALENDAR_REDIRECT_URI", "") or settings.MICROSOFT_REDIRECT_URI
    res = requests.post(
        MS_TOKEN_URL,
        data={
            "client_id": settings.MICROSOFT_CLIENT_ID,
            "client_secret": settings.MICROSOFT_CLIENT_SECRET,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
            "code": code,
        },
        timeout=10,
    )
    return res.json() if res.ok else None


def _refresh_google(account: ExternalCalendarAccount) -> str | None:
    if not account.refresh_token:
        return None
    res = requests.post(
        GOOGLE_TOKEN_URL,
        data={
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "refresh_token": account.refresh_token,
            "grant_type": "refresh_token",
        },
        timeout=10,
    )
    if not res.ok:
        return None
    data = res.json()
    token = data.get("access_token") or ""
    account.access_token = token
    account.expires_at = _expires_at(data.get("expires_in"))
    account.save(update_fields=["access_token", "expires_at", "updated_at"])
    return token


def _refresh_microsoft(account: ExternalCalendarAccount) -> str | None:
    if not account.refresh_token:
        return None
    res = requests.post(
        MS_TOKEN_URL,
        data={
            "client_id": settings.MICROSOFT_CLIENT_ID,
            "client_secret": settings.MICROSOFT_CLIENT_SECRET,
            "refresh_token": account.refresh_token,
            "redirect_uri": getattr(settings, "MICROSOFT_CALENDAR_REDIRECT_URI", "") or settings.MICROSOFT_REDIRECT_URI,
            "grant_type": "refresh_token",
        },
        timeout=10,
    )
    if not res.ok:
        return None
    data = res.json()
    token = data.get("access_token") or ""
    account.access_token = token
    account.refresh_token = data.get("refresh_token") or account.refresh_token
    account.expires_at = _expires_at(data.get("expires_in"))
    account.save(update_fields=["access_token", "refresh_token", "expires_at", "updated_at"])
    return token


def _get_valid_access_token(account: ExternalCalendarAccount) -> str | None:
    if account.expires_at and account.expires_at > timezone.now() + timedelta(seconds=60):
        return account.access_token
    if account.provider == ExternalCalendarAccount.PROVIDER_GOOGLE:
        return _refresh_google(account)
    if account.provider == ExternalCalendarAccount.PROVIDER_MICROSOFT:
        return _refresh_microsoft(account)
    return None


@dataclass
class ExternalEvent:
    id: str
    title: str
    start: str
    end: str
    provider: str

    def as_dict(self) -> dict:
        return {
            "id": self.id,
            "title": self.title,
            "start": self.start,
            "end": self.end,
            "provider": self.provider,
            "kind": "external",
        }


def fetch_external_events(*, account: ExternalCalendarAccount, start: datetime, end: datetime) -> list[ExternalEvent]:
    token = _get_valid_access_token(account)
    if not token:
        return []

    if account.provider == ExternalCalendarAccount.PROVIDER_GOOGLE:
        res = requests.get(
            GOOGLE_EVENTS_URL,
            headers={"Authorization": f"Bearer {token}"},
            params={
                "singleEvents": "true",
                "orderBy": "startTime",
                "timeMin": start.isoformat(),
                "timeMax": end.isoformat(),
                "maxResults": 200,
            },
            timeout=10,
        )
        if not res.ok:
            return []
        items = res.json().get("items") or []
        events: list[ExternalEvent] = []
        for item in items:
            title = item.get("summary") or "Untitled"
            start_obj = (item.get("start") or {}).get("dateTime") or (item.get("start") or {}).get("date")
            end_obj = (item.get("end") or {}).get("dateTime") or (item.get("end") or {}).get("date")
            if not start_obj or not end_obj:
                continue
            events.append(
                ExternalEvent(
                    id=f"google:{item.get('id')}",
                    title=title[:255],
                    start=str(start_obj),
                    end=str(end_obj),
                    provider="google",
                )
            )
        return events

    if account.provider == ExternalCalendarAccount.PROVIDER_MICROSOFT:
        res = requests.get(
            MS_CALENDAR_VIEW,
            headers={
                "Authorization": f"Bearer {token}",
                "Prefer": 'outlook.timezone="UTC"',
            },
            params={
                "startDateTime": start.isoformat(),
                "endDateTime": end.isoformat(),
                "$top": 200,
            },
            timeout=10,
        )
        if not res.ok:
            return []
        items = res.json().get("value") or []
        events: list[ExternalEvent] = []
        for item in items:
            title = item.get("subject") or "Untitled"
            start_obj = ((item.get("start") or {}).get("dateTime")) or ""
            end_obj = ((item.get("end") or {}).get("dateTime")) or ""
            if not start_obj or not end_obj:
                continue
            events.append(
                ExternalEvent(
                    id=f"microsoft:{item.get('id')}",
                    title=title[:255],
                    start=str(start_obj),
                    end=str(end_obj),
                    provider="microsoft",
                )
            )
        return events

    return []


class CalendarOAuthStartView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, provider: str):
        team_id = request.data.get("team_id") or request.query_params.get("team_id")
        if not team_id:
            return standardize_response(success=False, error="team_id is required", status=status.HTTP_400_BAD_REQUEST)

        team = Team.objects.filter(id=team_id).first()
        if not team:
            return standardize_response(success=False, error="Team not found", status=status.HTTP_404_NOT_FOUND)

        _require_team_member(request.user, team)

        provider = (provider or "").strip().lower()
        if provider not in {ExternalCalendarAccount.PROVIDER_GOOGLE, ExternalCalendarAccount.PROVIDER_MICROSOFT}:
            return standardize_response(success=False, error="Unsupported provider", status=status.HTTP_400_BAD_REQUEST)

        state = _state_sign(
            {
                "user_id": str(request.user.id),
                "team_id": str(team.id),
                "provider": provider,
                "ts": int(timezone.now().timestamp()),
            }
        )

        if provider == ExternalCalendarAccount.PROVIDER_GOOGLE:
            url = _google_auth_url(state)
        else:
            url = _microsoft_auth_url(state)

        return standardize_response(data={"url": url})


class CalendarOAuthCallbackView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, provider: str):
        code = request.GET.get("code") or ""
        state = request.GET.get("state") or ""
        error = request.GET.get("error") or ""

        provider = (provider or "").strip().lower()
        if provider not in {ExternalCalendarAccount.PROVIDER_GOOGLE, ExternalCalendarAccount.PROVIDER_MICROSOFT}:
            return redirect(f"{_frontend_base()}/settings?tab=integrations&error=calendar_provider")

        if error or not code or not state:
            return redirect(f"{_frontend_base()}/settings?tab=integrations&error=calendar_cancelled")

        try:
            payload = _state_unsign(state)
        except Exception:
            return redirect(f"{_frontend_base()}/settings?tab=integrations&error=calendar_state")

        if payload.get("provider") != provider:
            return redirect(f"{_frontend_base()}/settings?tab=integrations&error=calendar_state")

        user_id = payload.get("user_id")
        team_id = payload.get("team_id")
        if not user_id or not team_id:
            return redirect(f"{_frontend_base()}/settings?tab=integrations&error=calendar_state")

        from django.contrib.auth import get_user_model

        User = get_user_model()
        user = User.objects.filter(id=user_id).first()
        team = Team.objects.filter(id=team_id).first()
        if not user or not team:
            return redirect(f"{_frontend_base()}/settings?tab=integrations&error=calendar_state")

        if provider == ExternalCalendarAccount.PROVIDER_GOOGLE:
            data = _exchange_google(code)
        else:
            data = _exchange_microsoft(code)

        if not data:
            return redirect(f"{_frontend_base()}/settings?tab=integrations&error=calendar_failed")

        access_token = data.get("access_token") or ""
        refresh_token = data.get("refresh_token") or ""
        expires_at = _expires_at(data.get("expires_in"))
        scopes = data.get("scope") or ""

        ExternalCalendarAccount.objects.update_or_create(
            user=user,
            team=team,
            provider=provider,
            defaults={
                "access_token": access_token,
                "refresh_token": refresh_token,
                "expires_at": expires_at,
                "scopes": scopes,
                "enabled": True,
            },
        )

        return redirect(f"{_frontend_base()}/settings?tab=integrations&calendar={provider}_connected")


class CalendarAccountsView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, team_id: str):
        team = Team.objects.filter(id=team_id).first()
        if not team:
            return standardize_response(success=False, error="Team not found", status=status.HTTP_404_NOT_FOUND)
        _require_team_member(request.user, team)
        accounts = ExternalCalendarAccount.objects.filter(team=team, user=request.user).order_by("-updated_at")
        return standardize_response(data=ExternalCalendarAccountSerializer(accounts, many=True).data)

    def patch(self, request, team_id: str):
        team = Team.objects.filter(id=team_id).first()
        if not team:
            return standardize_response(success=False, error="Team not found", status=status.HTTP_404_NOT_FOUND)
        _require_team_member(request.user, team)

        provider = (request.data.get("provider") or "").strip().lower()
        if provider not in {ExternalCalendarAccount.PROVIDER_GOOGLE, ExternalCalendarAccount.PROVIDER_MICROSOFT}:
            return standardize_response(success=False, error="provider is required", status=status.HTTP_400_BAD_REQUEST)

        account = ExternalCalendarAccount.objects.filter(team=team, user=request.user, provider=provider).first()
        if not account:
            return standardize_response(success=False, error="Calendar account not connected", status=status.HTTP_404_NOT_FOUND)

        enabled = request.data.get("enabled")
        sync_external_events = request.data.get("sync_external_events")
        update_fields: list[str] = []

        if enabled is not None:
            account.enabled = bool(enabled)
            update_fields.append("enabled")
        if sync_external_events is not None:
            account.sync_external_events = bool(sync_external_events)
            update_fields.append("sync_external_events")

        if update_fields:
            account.save(update_fields=update_fields + ["updated_at"])

        return standardize_response(data=ExternalCalendarAccountSerializer(account).data)


class CalendarEventsView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        team_id = request.query_params.get("team_id")
        start = request.query_params.get("start")
        end = request.query_params.get("end")
        if not team_id or not start or not end:
            return standardize_response(success=False, error="team_id, start, end are required", status=status.HTTP_400_BAD_REQUEST)

        team = Team.objects.filter(id=team_id).first()
        if not team:
            return standardize_response(success=False, error="Team not found", status=status.HTTP_404_NOT_FOUND)
        _require_team_member(request.user, team)

        try:
            start_dt = datetime.fromisoformat(start.replace("Z", "+00:00"))
            end_dt = datetime.fromisoformat(end.replace("Z", "+00:00"))
        except Exception:
            return standardize_response(success=False, error="Invalid start/end format", status=status.HTTP_400_BAD_REQUEST)

        accounts = ExternalCalendarAccount.objects.filter(
            team=team,
            user=request.user,
            enabled=True,
            sync_external_events=True,
        )
        events: list[dict] = []
        for account in accounts:
            for event in fetch_external_events(account=account, start=start_dt, end=end_dt):
                events.append(event.as_dict())

        return standardize_response(data={"events": events})
