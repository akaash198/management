import time
from rest_framework import views, status, response, permissions
from django.db.models import Count, Q, F
from django.utils import timezone
from datetime import timedelta
from django.core.cache import cache
from apps.projects.models import Project, Task, TaskActivity
from apps.messaging.models import Message
from apps.teams.models import Team, TeamMember
from apps.users.models import User
from .models import UserProjectVisit
from .serializers import ProjectProgressSerializer, ActivityItemSerializer, CalendarTaskSerializer, CalendarMeetingSerializer
from apps.projects.serializers import TaskListSerializer, ProjectListSerializer
from apps.messaging.serializers import SlimUserSerializer
from django.db import connection as db_connection
from django.contrib.postgres.search import SearchQuery, SearchRank, SearchHeadline
from config.utils import standardize_response
from apps.meetings.models import Meeting
from django.utils.dateparse import parse_date
from datetime import datetime, time


def _ensure_team_member(request, team_id: str):
    return TeamMember.objects.filter(team_id=team_id, user=request.user).exists()


class SuperAdminDashboardView(views.APIView):
    """
    Global dashboard for super admins (not team-scoped).
    """

    def get(self, request):
        if not request.user.is_authenticated:
            return standardize_response(success=False, error="Unauthorized", status=status.HTTP_401_UNAUTHORIZED)

        if not getattr(request.user, "is_superuser", False):
            return standardize_response(success=False, error="Forbidden", status=status.HTTP_403_FORBIDDEN)

        now = timezone.now()
        last_7d = now - timedelta(days=7)
        last_30d = now - timedelta(days=30)

        team_id = request.query_params.get("team_id")
        
        counts_query = Q()
        if team_id:
            counts_query = Q(team_id=team_id)

        data = {
            "counts": {
                "users": User.objects.count() if not team_id else TeamMember.objects.filter(team_id=team_id).count(),
                "teams": Team.objects.count() if not team_id else 1,
                "projects": Project.objects.filter(counts_query).count(),
                "tasks": Task.objects.filter(project__team_id=team_id).count() if team_id else Task.objects.count(),
                "messages": Message.objects.filter(channel__team_id=team_id).count() if team_id else Message.objects.count(),
            },
            "activity": {
                "new_users_7d": User.objects.filter(date_joined__gte=last_7d).count(),
                "new_users_30d": User.objects.filter(date_joined__gte=last_30d).count(),
                "task_activity_7d": TaskActivity.objects.filter(created_at__gte=last_7d).count(),
                "messages_7d": Message.objects.filter(created_at__gte=last_7d).count(),
            },
            "recent_users": list(
                User.objects.order_by("-date_joined")
                .values("id", "email", "full_name", "date_joined", "is_staff", "is_superuser")[:8]
            ),
            "recent_teams": list(
                (
                    Team.objects.filter(id=team_id) if team_id else Team.objects.all()
                )
                .annotate(member_count=Count("members"))
                .order_by("-created_at")
                .values("id", "name", "created_at", "member_count")[:5]
            ),
            "recent_projects": ProjectListSerializer(
                Project.objects.order_by("-created_at")[:5], 
                many=True
            ).data
        }

        return standardize_response(data=data)

class DashboardView(views.APIView):
    def get(self, request):
        team_id = request.query_params.get("team_id")
        if not team_id:
            return standardize_response(success=False, error="team_id is required", status=status.HTTP_400_BAD_REQUEST)

        is_superuser = getattr(request.user, "is_superuser", False)
        if not is_superuser and not _ensure_team_member(request, team_id):
            return standardize_response(success=False, error="Forbidden", status=status.HTTP_403_FORBIDDEN)

        scope = (request.query_params.get("scope") or "team").strip().lower()
        cache_key = f"dashboard_{request.user.id}_{team_id}_{scope}"
        cached_data = cache.get(cache_key)
        if cached_data:
            return standardize_response(data=cached_data)

        # My Tasks Stats
        base_tasks = Task.objects.filter(project__team_id=team_id, project__status="active", is_archived=False)
        if scope == "my":
            base_tasks = base_tasks.filter(assignee=request.user)

        open_tasks = base_tasks.exclude(column__is_done_column=True)
        today = timezone.now().date()
        week_end = today + timedelta(days=7)

        my_tasks = {
            "total": open_tasks.count(),
            "overdue": open_tasks.filter(due_date__isnull=False, due_date__lt=today).count(),
            "due_today": open_tasks.filter(due_date=today).count(),
            "due_this_week": open_tasks.filter(due_date__range=[today, week_end]).count(),
            "by_priority": {
                "urgent": open_tasks.filter(priority="urgent").count(),
                "high": open_tasks.filter(priority="high").count(),
                "normal": open_tasks.filter(priority="normal").count(),
                "low": open_tasks.filter(priority="low").count(),
            },
            "recent": TaskListSerializer(open_tasks.order_by("-updated_at")[:5], many=True).data
        }

        # Projects Progress
        projects_qs = Project.objects.filter(team_id=team_id, status="active").annotate(
            total_tasks=Count("tasks"),
            completed_tasks=Count("tasks", filter=Q(tasks__column__is_done_column=True)),
            overdue_count=Count("tasks", filter=Q(tasks__column__is_done_column=False, tasks__due_date__lt=today))
        )
        projects_data = {
            "total": projects_qs.count(),
            "active": projects_qs.count(),
            "items": ProjectProgressSerializer(projects_qs[:6], many=True).data
        }

        # Team Activity
        activity = TaskActivity.objects.filter(task__project__team_id=team_id).order_by("-created_at")[:20]
        activity_data = ActivityItemSerializer(activity, many=True).data

        # Team Stats
        this_week_start_date = today - timedelta(days=today.weekday())
        this_week_start = timezone.make_aware(datetime.combine(this_week_start_date, time.min))
        last_7d = timezone.now() - timedelta(days=7)

        most_active_user = None
        most_active = (
            TaskActivity.objects.filter(task__project__team_id=team_id, created_at__gte=last_7d)
            .exclude(actor__isnull=True)
            .values("actor_id")
            .annotate(c=Count("id"))
            .order_by("-c")
            .first()
        )
        if most_active and most_active.get("actor_id"):
            most_active_user = User.objects.filter(id=most_active["actor_id"]).first()
        else:
            # Fallback to messaging activity when task activity is sparse.
            most_chatty = (
                Message.objects.filter(channel__team_id=team_id, created_at__gte=last_7d, is_deleted=False, is_system=False)
                .values("sender_id")
                .annotate(c=Count("id"))
                .order_by("-c")
                .first()
            )
            if most_chatty and most_chatty.get("sender_id"):
                most_active_user = User.objects.filter(id=most_chatty["sender_id"]).first()

        team_stats = {
            "total_members": TeamMember.objects.filter(team_id=team_id).count(),
            "tasks_completed_this_week": TaskActivity.objects.filter(
                task__project__team_id=team_id, 
                verb="completed", 
                created_at__gte=this_week_start
            ).count(),
            "tasks_created_this_week": Task.objects.filter(
                project__team_id=team_id, 
                project__status="active",
                is_archived=False,
                created_at__gte=this_week_start
            ).count(),
            "most_active_member": SlimUserSerializer(most_active_user).data if most_active_user else None,
        }
        
        # Quick Links
        visits = UserProjectVisit.objects.filter(user=request.user).select_related("project")[:5]
        quick_links = ProjectListSerializer([v.project for v in visits], many=True).data

        result = {
            "my_tasks": my_tasks,
            "projects": projects_data,
            "activity": activity_data,
            "team_stats": team_stats,
            "quick_links": quick_links
        }

        cache.set(cache_key, result, 60)
        return standardize_response(data=result)

class WorkloadView(views.APIView):
    def get(self, request):
        team_id = request.query_params.get("team_id")
        project_id = request.query_params.get("project_id")

        if not team_id:
            return standardize_response(success=False, error="team_id is required", status=status.HTTP_400_BAD_REQUEST)

        is_superuser = getattr(request.user, "is_superuser", False)
        if not is_superuser and not _ensure_team_member(request, team_id):
            return standardize_response(success=False, error="Forbidden", status=status.HTTP_403_FORBIDDEN)
        
        cache_key = f"workload_{team_id}_{project_id or 'all'}"
        cached_data = cache.get(cache_key)
        if cached_data:
            return standardize_response(data=cached_data)

        members = TeamMember.objects.filter(team_id=team_id).select_related("user")
        today = timezone.now().date()
        last_7d = timezone.now() - timedelta(days=7)

        result = []
        for member in members:
            tasks = Task.objects.filter(assignee=member.user)
            if project_id:
                tasks = tasks.filter(project_id=project_id)
            else:
                tasks = tasks.filter(project__team_id=team_id)

            open_tasks = tasks.exclude(column__is_done_column=True)
            
            assigned_7d = tasks.filter(created_at__gte=last_7d).count()
            completed_7d = TaskActivity.objects.filter(
                actor=member.user, 
                verb="completed", 
                created_at__gte=last_7d
            ).count()

            result.append({
                "user": SlimUserSerializer(member.user).data,
                "total_assigned": tasks.count(),
                "by_status": {
                    "todo": open_tasks.filter(column__name="To Do").count(),
                    "in_progress": open_tasks.filter(column__name="In Progress").count(),
                    "in_review": open_tasks.filter(column__name="In Review").count(),
                    "done": tasks.filter(column__is_done_column=True).count(),
                },
                "by_priority": {
                    "urgent": open_tasks.filter(priority="urgent").count(),
                    "high": open_tasks.filter(priority="high").count(),
                    "normal": open_tasks.filter(priority="normal").count(),
                    "low": open_tasks.filter(priority="low").count(),
                },
                "overdue": open_tasks.filter(due_date__lt=today).count(),
                "completion_rate_7d": round((completed_7d / assigned_7d * 100), 1) if assigned_7d > 0 else 0
            })

        cache.set(cache_key, result, 120)
        return standardize_response(data=result)

class CalendarView(views.APIView):
    def get(self, request):
        team_id = request.query_params.get("team_id")
        start = request.query_params.get("start")
        end = request.query_params.get("end")
        mine = request.query_params.get("mine") == "true"
        include_external = request.query_params.get("external") == "true"

        if not team_id:
            return standardize_response(success=False, error="team_id is required", status=status.HTTP_400_BAD_REQUEST)

        is_superuser = getattr(request.user, "is_superuser", False)
        if not is_superuser and not _ensure_team_member(request, team_id):
            return standardize_response(success=False, error="Forbidden", status=status.HTTP_403_FORBIDDEN)

        tasks = Task.objects.filter(project__team_id=team_id, due_date__isnull=False)
        if start and end:
            tasks = tasks.filter(due_date__range=[start, end])
        
        if mine:
            tasks = tasks.filter(assignee=request.user)

        meetings = Meeting.objects.filter(team_id=team_id).select_related("channel", "created_by")
        if start and end:
            # Meetings are timestamped; include any meeting that starts within the range.
            start_date = parse_date(start)
            end_date = parse_date(end)
            if start_date and end_date:
                start_dt = timezone.make_aware(datetime.combine(start_date, time.min))
                end_dt = timezone.make_aware(datetime.combine(end_date, time.max))
                meetings = meetings.filter(starts_at__range=[start_dt, end_dt])
        if mine:
            meetings = meetings.filter(attendees=request.user)

        serializer = CalendarTaskSerializer(tasks, many=True)
        meetings_serializer = CalendarMeetingSerializer(meetings, many=True)
        data = {
            "tasks": serializer.data,
            "meetings": meetings_serializer.data,
            "milestones": [],
        }

        if include_external and start and end:
            try:
                from datetime import datetime

                from apps.integrations.calendar import fetch_external_events
                from apps.integrations.models import ExternalCalendarAccount

                start_dt = datetime.fromisoformat(str(start).replace("Z", "+00:00"))
                end_dt = datetime.fromisoformat(str(end).replace("Z", "+00:00"))
                accounts = ExternalCalendarAccount.objects.filter(
                    team_id=team_id,
                    user=request.user,
                    enabled=True,
                    sync_external_events=True,
                )
                ext_events = []
                for acct in accounts:
                    for ev in fetch_external_events(account=acct, start=start_dt, end=end_dt):
                        ext_events.append(ev.as_dict())
                data["external_events"] = ext_events
            except Exception:
                data["external_events"] = []
        else:
            data["external_events"] = []

        return standardize_response(data=data)

class GlobalSearchView(views.APIView):
    def get(self, request):
        q = request.query_params.get("q", "")
        team_id = request.query_params.get("team_id")
        search_type = request.query_params.get("type", "all")

        if len(q) < 2:
            return standardize_response(success=False, error="Query too short", status=status.HTTP_400_BAD_REQUEST)

        if not team_id:
            return standardize_response(success=False, error="team_id is required", status=status.HTTP_400_BAD_REQUEST)

        is_superuser = getattr(request.user, "is_superuser", False)
        if not is_superuser and not _ensure_team_member(request, team_id):
            return standardize_response(success=False, error="Forbidden", status=status.HTTP_403_FORBIDDEN)

        start_time = time.time()
        results = {}

        is_postgres = db_connection.vendor == "postgresql"

        if search_type in ["all", "tasks"]:
            if is_postgres:
                tasks = Task.objects.filter(
                    project__team_id=team_id,
                    search_vector=SearchQuery(q)
                ).annotate(
                    rank=SearchRank("search_vector", SearchQuery(q))
                ).order_by("-rank")[:10]
            else:
                tasks = Task.objects.filter(
                    project__team_id=team_id,
                    title__icontains=q
                )[:10]
            results["tasks"] = {
                "items": CalendarTaskSerializer(tasks, many=True).data,
                "total": len(tasks)
            }

        if search_type in ["all", "messages"]:
            if is_postgres:
                messages = Message.objects.filter(
                    channel__team_id=team_id,
                    search_vector=SearchQuery(q)
                ).annotate(
                    rank=SearchRank("search_vector", SearchQuery(q)),
                    snippet=SearchHeadline("text", SearchQuery(q))
                ).order_by("-rank")[:10]
            else:
                messages = Message.objects.filter(
                    channel__team_id=team_id,
                    text__icontains=q
                )[:10]
            
            msg_data = []
            for m in messages:
                snippet = getattr(m, "snippet", m.text[:200]) if hasattr(m, "text") else m.text[:200]
                msg_data.append({
                    "id": m.id,
                    "text": snippet,
                    "sender": SlimUserSerializer(m.sender).data,
                    "channel_name": m.channel.display_name,
                    "channel_id": m.channel.id,
                    "created_at": m.created_at
                })
            results["messages"] = {"items": msg_data, "total": len(messages)}

        if search_type in ["all", "members"]:
            members = TeamMember.objects.filter(
                team_id=team_id,
                user__full_name__icontains=q
            )[:10]
            results["members"] = {
                "items": [{"user": SlimUserSerializer(m.user).data, "role": m.role} for m in members],
                "total": members.count()
            }

        if search_type in ["all", "projects"]:
            projects = Project.objects.filter(team_id=team_id, name__icontains=q)[:10]
            results["projects"] = {
                "items": ProjectListSerializer(projects, many=True).data,
                "total": projects.count()
            }

        took_ms = int((time.time() - start_time) * 1000)
        
        return standardize_response(data={
            "query": q,
            "results": results,
            "took_ms": took_ms
        })

class ProjectVisitView(views.APIView):
    def post(self, request, id):
        project = get_object_or_404(Project, id=id)
        UserProjectVisit.objects.update_or_create(
            user=request.user,
            project=project,
            defaults={"visited_at": timezone.now()}
        )
        return response.Response(status=status.HTTP_200_OK)

from django.shortcuts import get_object_or_404
