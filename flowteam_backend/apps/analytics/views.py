from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework import permissions, status
from django.db.models import Count, Q, Avg, F, Sum
from django.utils import timezone
from django.shortcuts import get_object_or_404
from datetime import timedelta
from apps.projects.models import Project, Task, TaskActivity, TimeLog
from apps.teams.models import TeamMember
from apps.users.serializers import UserSerializer
from apps.projects.permissions import check_project_permission
from config.utils import standardize_response
from django.core.cache import cache

@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def velocity_analytics(request):
    project_id = request.query_params.get("project_id")
    weeks = int(request.query_params.get("weeks", 8))

    if not project_id:
        return standardize_response(success=False, error="project_id is required", status=status.HTTP_400_BAD_REQUEST)

    project = get_object_or_404(Project, pk=project_id)
    if not check_project_permission(request.user, project, "view_project"):
        return standardize_response(success=False, error="Forbidden", status=status.HTTP_403_FORBIDDEN)
    
    cache_key = f"velocity_{project_id}_{weeks}"
    cached_data = cache.get(cache_key)
    if cached_data is not None:
        return standardize_response(data=cached_data)

    end_date = timezone.now().date()
    start_date = end_date - timedelta(weeks=weeks)
    
    results = []
    current_date = start_date
    while current_date <= end_date:
        week_end = current_date + timedelta(days=6)
        
        completed = TaskActivity.objects.filter(
            task__project_id=project_id,
            verb="completed",
            created_at__date__range=[current_date, week_end]
        ).count()
        
        created = TaskActivity.objects.filter(
            task__project_id=project_id,
            verb="created",
            created_at__date__range=[current_date, week_end]
        ).count()
        
        results.append({
            "week_start": current_date.isoformat(),
            "week_end": week_end.isoformat(),
            "completed": completed,
            "created": created,
            "net": completed - created
        })
        current_date += timedelta(days=7)

    cache.set(cache_key, results, 300)
    return standardize_response(data=results)

@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def burndown_analytics(request):
    project_id = request.query_params.get("project_id")
    if not project_id:
        return standardize_response(success=False, error="project_id is required", status=status.HTTP_400_BAD_REQUEST)

    project = get_object_or_404(Project, pk=project_id)
    if not check_project_permission(request.user, project, "view_project"):
        return standardize_response(success=False, error="Forbidden", status=status.HTTP_403_FORBIDDEN)
    
    cache_key = f"burndown_{project_id}"
    cached_data = cache.get(cache_key)
    if cached_data is not None:
        return standardize_response(data=cached_data)

    total_tasks = Task.objects.filter(project=project).count()
    start_date = project.created_at.date()
    today = timezone.now().date()
    days_span = (today - start_date).days or 1
    
    ideal_step = total_tasks / days_span
    
    results = []
    for i in range(days_span + 1):
        target_date = start_date + timedelta(days=i)
        completed_to_date = TaskActivity.objects.filter(
            task__project=project,
            verb="completed",
            created_at__date__lte=target_date
        ).count()
        
        results.append({
            "date": target_date.isoformat(),
            "open_tasks": total_tasks - completed_to_date,
            "completed_tasks": completed_to_date,
            "ideal": max(0, total_tasks - (ideal_step * i))
        })

    cache.set(cache_key, results, 300)
    return standardize_response(data=results)

@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def member_stats_analytics(request):
    project_id = request.query_params.get("project_id")
    days = int(request.query_params.get("days", 30))

    if not project_id:
        return standardize_response(success=False, error="project_id is required", status=status.HTTP_400_BAD_REQUEST)

    project = get_object_or_404(Project, pk=project_id)
    if not check_project_permission(request.user, project, "view_project"):
        return standardize_response(success=False, error="Forbidden", status=status.HTTP_403_FORBIDDEN)
    
    cache_key = f"member_stats_{project.team_id}_{project_id}_{days}"
    cached_data = cache.get(cache_key)
    if cached_data is not None:
        return standardize_response(data=cached_data)

    members = TeamMember.objects.filter(team_id=project.team_id).select_related("user")
    results = []
    
    start_date = timezone.now().date() - timedelta(days=days)
    
    for member in members:
        user = member.user
        tasks = Task.objects.filter(project_id=project_id, assignee=user)
        
        assigned_count = tasks.count()
        completed_count = tasks.filter(column__is_done_column=True).count()
        overdue_count = tasks.filter(column__is_done_column=False, due_date__lt=timezone.now().date()).count()
        
        # Avg completion days
        completed_activities = TaskActivity.objects.filter(
            actor=user, verb="completed", task__in=tasks
        ).select_related("task")
        
        avg_days = 0
        if completed_activities.exists():
            total_days = sum((a.created_at - a.task.created_at).days for a in completed_activities)
            avg_days = total_days / completed_activities.count()

        total_minutes = TimeLog.objects.filter(user=user, task__in=tasks).aggregate(Sum("minutes"))["minutes__sum"] or 0
        
        results.append({
            "user": UserSerializer(user).data,
            "team_role": member.role,
            "tasks_assigned": assigned_count,
            "tasks_completed": completed_count,
            "tasks_overdue": overdue_count,
            "completion_rate": (completed_count / assigned_count * 100) if assigned_count > 0 else 0,
            "avg_completion_days": round(avg_days, 1),
            "total_hours_logged": round(total_minutes / 60, 1),
            "tasks_by_priority": tasks.values("priority").annotate(count=Count("id"))
        })

    cache.set(cache_key, results, 300)
    return standardize_response(data=results)

@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def project_health_analytics(request):
    project_id = request.query_params.get("project_id")
    if not project_id:
        return standardize_response(success=False, error="project_id is required", status=status.HTTP_400_BAD_REQUEST)
    
    cache_key = f"project_health_{project_id}"
    cached_data = cache.get(cache_key)
    if cached_data is not None:
        return standardize_response(data=cached_data)

    project = get_object_or_404(Project, pk=project_id)
    if not check_project_permission(request.user, project, "view_project"):
        return standardize_response(success=False, error="Forbidden", status=status.HTTP_403_FORBIDDEN)
    tasks = Task.objects.filter(project=project)
    total = tasks.count()
    if total == 0:
        return standardize_response(data={"health_score": 100, "health_label": "Healthy", "factors": {}, "recommendations": []})

    overdue = tasks.filter(column__is_done_column=False, due_date__lt=timezone.now().date()).count()
    unassigned = tasks.filter(assignee__isnull=True).count()
    
    recent_activity = TaskActivity.objects.filter(
        task__project=project, 
        created_at__gte=timezone.now() - timedelta(days=7)
    ).count()

    overdue_rate = overdue / total
    unassigned_rate = unassigned / total
    activity_score = recent_activity / total

    score = 100
    score -= overdue_rate * 40
    score -= unassigned_rate * 20
    score += min(activity_score * 10, 20)
    score = max(0, min(100, int(score)))

    label = "Healthy"
    if score < 40: label = "Critical"
    elif score < 70: label = "At Risk"

    recs = []
    if overdue_rate > 0.3: recs.append(f"Review and reassign {overdue} overdue tasks")
    if unassigned_rate > 0.4: recs.append(f"Assign owners to {unassigned} unassigned tasks")
    if activity_score < 0.2: recs.append("Low recent activity — check in with the team")

    data = {
        "health_score": score,
        "health_label": label,
        "factors": {
            "overdue_rate": round(overdue_rate, 2),
            "unassigned_rate": round(unassigned_rate, 2),
            "activity_score": round(activity_score, 2)
        },
        "recommendations": recs
    }

    cache.set(cache_key, data, 600)
    return standardize_response(data=data)
