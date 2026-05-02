from __future__ import annotations

import json
import re
from datetime import timedelta

from celery import shared_task
from django.core.cache import cache
from django.utils import timezone

from .client import call_claude
from . import prompts


def _json_from_text(text: str, fallback):
    if not text:
        return fallback
    cleaned = text.strip()
    fenced = re.search(r"```(?:json)?\s*(.*?)```", cleaned, flags=re.S | re.I)
    if fenced:
        cleaned = fenced.group(1).strip()
    try:
        return json.loads(cleaned)
    except Exception:
        return fallback


@shared_task
def run_ai_prompt(system: str, user: str, max_tokens: int = 1024) -> str:
    return call_claude(system=system, user=user, max_tokens=max_tokens)


def _briefing_cache_key(team_id: str, user_id: str) -> str:
    return f"ai:briefing:{team_id}:{user_id}"


def _health_cache_key(project_id: str) -> str:
    return f"ai:health:{project_id}"


def _generate_briefing_for_user(*, team_id: str, user_id: str) -> dict:
    from apps.meetings.models import Meeting
    from apps.projects.models import Task
    from apps.users.models import User

    user = User.objects.get(id=user_id)
    today = timezone.now().date()

    overdue = list(
        Task.objects.filter(
            assignee=user,
            is_archived=False,
            project__team_id=team_id,
            column__is_done_column=False,
            due_date__lt=today,
        )
        .order_by("due_date")[:5]
    )
    due_today = list(
        Task.objects.filter(
            assignee=user,
            is_archived=False,
            project__team_id=team_id,
            column__is_done_column=False,
            due_date=today,
        )
        .order_by("priority")[:5]
    )
    meetings_today = list(
        Meeting.objects.filter(
            team_id=team_id,
            attendees=user,
            starts_at__date=today,
            status=Meeting.STATUS_SCHEDULED,
        )
        .order_by("starts_at")[:3]
    )

    user_prompt = "\n".join(
        [
            f"User: {getattr(user, 'full_name', '') or getattr(user, 'email', '')}",
            f"Date: {today.isoformat()}",
            f"Overdue tasks ({len(overdue)}): " + (", ".join(t.title for t in overdue) or "none"),
            f"Due today ({len(due_today)}): " + (", ".join(t.title for t in due_today) or "none"),
            "Meetings today ("
            + str(len(meetings_today))
            + "): "
            + (", ".join(f"{m.title} at {m.starts_at:%H:%M}" for m in meetings_today) or "none"),
        ]
    )

    briefing = call_claude(prompts.DAILY_BRIEFING_SYSTEM, user_prompt, max_tokens=500) or ""

    return {
        "briefing": briefing,
        "overdue_count": len(overdue),
        "due_today_count": len(due_today),
        "meeting_count": len(meetings_today),
    }


def _compute_health(*, project_id: str) -> dict:
    from apps.projects.models import Project, Task

    project = Project.objects.get(id=project_id)
    tasks = Task.objects.filter(project=project, is_archived=False).select_related("column")

    total = tasks.count()
    done = tasks.filter(column__is_done_column=True).count()
    overdue = tasks.filter(column__is_done_column=False, due_date__lt=timezone.now().date()).count()

    score = max(0, min(100, 90 - overdue * 12 - max(0, total - done - 20)))
    label = "Healthy" if score >= 80 else "Watch" if score >= 50 else "At Risk"
    fallback = {
        "score": score,
        "label": label,
        "factors": [
            {"issue": f"{overdue} overdue tasks", "severity": "high" if overdue else "low"},
            {"issue": f"{done} of {total} tasks completed", "severity": "medium"},
        ],
        "recommendation": "Focus overdue tasks first, then rebalance unassigned high-priority work.",
    }

    context = json.dumps({"project": project.name, "total": total, "done": done, "overdue": overdue})
    raw = call_claude(prompts.PROJECT_HEALTH_SYSTEM, context, max_tokens=900)
    return _json_from_text(raw, fallback)


@shared_task
def compute_daily_briefings():
    """Run every morning for all AI-enabled teams; cache briefings for 12 hours."""
    from apps.teams.models import Team

    teams = Team.objects.filter(ai_enabled=True)
    for team in teams.iterator():
        members = team.members.select_related("user").all()
        for member in members.iterator():
            data = _generate_briefing_for_user(team_id=str(team.id), user_id=str(member.user_id))
            cache.set(_briefing_cache_key(str(team.id), str(member.user_id)), data, timeout=3600 * 12)


@shared_task
def compute_project_health_scores():
    """Run nightly for all active projects with AI-enabled teams; cache for 24 hours."""
    from apps.projects.models import Project

    projects = (
        Project.objects.filter(status="active", team__ai_enabled=True)
        .select_related("team")
        .only("id", "name", "team_id", "status")
    )
    for project in projects.iterator():
        data = _compute_health(project_id=str(project.id))
        cache.set(_health_cache_key(str(project.id)), data, timeout=3600 * 24)
