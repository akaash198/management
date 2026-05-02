from __future__ import annotations

from datetime import timedelta

from django.core.cache import cache
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import permissions, status, views

from apps.projects.models import Milestone, Project, Task, TaskActivity
from config.utils import standardize_response


def _health_cache_key(project_id: str) -> str:
    return f"ai:health:{project_id}"


def _heuristic_health(project: Project) -> dict:
    tasks = Task.objects.filter(project=project, is_archived=False).select_related("column")
    total = tasks.count()
    done = tasks.filter(column__is_done_column=True).count()
    overdue = tasks.filter(column__is_done_column=False, due_date__lt=timezone.now().date()).count()
    score = max(0, min(100, 90 - overdue * 12 - max(0, total - done - 20)))
    label = "Healthy" if score >= 80 else "Watch" if score >= 50 else "At Risk"
    return {"score": score, "label": label}


class PortfolioView(views.APIView):
    """
    Aggregated portfolio view for CEOs/Admins.

    GET /api/reports/portfolio/?team_id=<optional>
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        team_id = request.query_params.get("team_id")
        scope = (request.query_params.get("scope") or "all").strip().lower()

        projects_qs = Project.objects.filter(status="active").select_related("team")
        if team_id:
            projects_qs = projects_qs.filter(team_id=team_id)

        if not request.user.is_superuser:
            # Visible projects: team member, explicit role, or creator.
            projects_qs = projects_qs.filter(
                Q(team__members__user=request.user) | Q(roles__user=request.user) | Q(created_by=request.user)
            ).distinct()

        projects = list(projects_qs.order_by("team__name", "name")[:200])
        project_ids = [p.id for p in projects]

        # Milestones: next milestone per project
        milestones = (
            Milestone.objects.filter(project_id__in=project_ids)
            .exclude(status=Milestone.STATUS_COMPLETED)
            .order_by("due_date")
            .values("project_id", "due_date", "status", "name")
        )
        next_milestone_by_project: dict[str, dict] = {}
        for m in milestones:
            pid = str(m["project_id"])
            if pid not in next_milestone_by_project:
                next_milestone_by_project[pid] = {
                    "name": m["name"],
                    "due_date": m["due_date"].isoformat() if m["due_date"] else None,
                    "status": m["status"],
                }

        # Task stats
        tasks = (
            Task.objects.filter(project_id__in=project_ids, is_archived=False)
            .select_related("column")
            .values("project_id", "column__is_done_column", "due_date")
        )
        today = timezone.now().date()
        task_stats: dict[str, dict] = {}
        for t in tasks:
            pid = str(t["project_id"])
            s = task_stats.setdefault(pid, {"total": 0, "done": 0, "open": 0, "overdue": 0})
            s["total"] += 1
            is_done = bool(t["column__is_done_column"])
            if is_done:
                s["done"] += 1
            else:
                s["open"] += 1
                due = t["due_date"]
                if due and due < today:
                    s["overdue"] += 1

        # Burndown-ish activity: created/completed last 14 days
        since = timezone.now() - timedelta(days=14)
        activity_counts = (
            TaskActivity.objects.filter(task__project_id__in=project_ids, created_at__gte=since)
            .values("task__project_id", "verb")
            .annotate(c=Count("id"))
        )
        activity_by_project: dict[str, dict] = {}
        for row in activity_counts:
            pid = str(row["task__project_id"])
            activity_by_project.setdefault(pid, {})[row["verb"]] = row["c"]

        payload = []
        for p in projects:
            pid = str(p.id)
            stats = task_stats.get(pid, {"total": 0, "done": 0, "open": 0, "overdue": 0})
            progress = int(round((stats["done"] / stats["total"]) * 100)) if stats["total"] else 0

            cached_health = cache.get(_health_cache_key(pid))
            health = cached_health if isinstance(cached_health, dict) else _heuristic_health(p)

            payload.append(
                {
                    "id": pid,
                    "name": p.name,
                    "team_id": str(p.team_id),
                    "team_name": p.team.name if p.team else "",
                    "color": p.color,
                    "icon": p.icon,
                    "progress_percent": progress,
                    "task_total": stats["total"],
                    "task_open": stats["open"],
                    "task_overdue": stats["overdue"],
                    "health_score": health.get("score"),
                    "health_label": health.get("label"),
                    "next_milestone": next_milestone_by_project.get(pid),
                    "activity_14d": activity_by_project.get(pid, {}),
                }
            )

        return standardize_response(data={"projects": payload})

