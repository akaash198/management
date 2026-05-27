from __future__ import annotations

import json
import re
from datetime import timedelta
from decimal import Decimal

from django.db.models import Count, Sum
from django.core.cache import cache
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.views import APIView

from apps.messaging.models import Channel, ChannelMember, Message
from apps.meetings.models import Meeting
from apps.projects.models import Comment, Project, Sprint, Task
from apps.projects.permissions import check_project_permission
from apps.teams.models import Team, TeamMember
from apps.teams.permissions import IsAIEnabled
from config.utils import standardize_response

from apps.companies.models import CompanyMember, Company
from .client import call_llm_engine, OpenAIAdapter, AnthropicAdapter, GeminiAdapter, LLMAdapterFactory

def _resolve_company(request, project=None, team=None) -> Company:
    if project and project.team and project.team.company:
        return project.team.company
    if team and team.company:
        return team.company
    membership = CompanyMember.objects.filter(user=request.user).first()
    if membership:
        return membership.company
    return Company.objects.first()

def _call_ai(request, feature_name: str, system: str, user_prompt: str, project=None, team=None, max_tokens: int = 1024) -> str:
    company = _resolve_company(request, project=project, team=team)
    return call_llm_engine(company, request.user, feature_name, system, user_prompt, max_tokens)
from . import prompts
from .serializers import (
    AutomationBuilderSerializer,
    ChannelSummarySerializer,
    DailyBriefingSerializer,
    FocusRecommendSerializer,
    GenerateTasksSerializer,
    MeetingActionItemsSerializer,
    AutoLabelSerializer,
    ProjectIdSerializer,
    ProjectReportSerializer,
    SprintPlanSerializer,
    TaskIdSerializer,
    TaskDescriptionSerializer,
    WeeklyReportSerializer,
)


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


def _ensure_project_access(user, project: Project, capability: str = "view_project"):
    if user.is_superuser:
        return
    if not check_project_permission(user, project, capability):
        raise PermissionDenied("Forbidden")


def _ensure_channel_access(user, channel: Channel):
    if user.is_superuser:
        return
    if not ChannelMember.objects.filter(channel=channel, user=user).exists():
        raise PermissionDenied("You are not a member of this channel.")


def _task_context(task: Task) -> str:
    comments = Comment.objects.filter(task=task, is_deleted=False).select_related("author").order_by("-created_at")[:30]
    activities = task.activities.select_related("actor").order_by("-created_at")[:30]
    return "\n".join(
        [
            f"Task: {task.title}",
            f"Description: {task.description or ''}",
            f"Status column: {task.column.name}",
            f"Priority: {task.priority}",
            f"Assignee: {task.assignee.full_name if task.assignee else 'Unassigned'}",
            "Comments:",
            *[f"- {c.author.full_name}: {c.text}" for c in comments],
            "Activity:",
            *[f"- {a.created_at.date()}: {a.actor.full_name} {a.verb} {a.detail}" for a in activities],
        ]
    )


def _fallback_tasks(project_name: str, description: str, goal: str):
    base = project_name or "Project"
    return [
        {"title": f"Define success criteria for {base}", "issue_type": "task", "priority": "high", "estimated_hours": 2},
        {"title": f"Create delivery plan for {base}", "issue_type": "story", "priority": "high", "estimated_hours": 4},
        {"title": "Review requirements with stakeholders", "issue_type": "task", "priority": "normal", "estimated_hours": 2},
        {"title": "Implement core workflow", "issue_type": "story", "priority": "high", "estimated_hours": 8},
        {"title": "QA acceptance criteria and edge cases", "issue_type": "task", "priority": "normal", "estimated_hours": 4},
        {"title": "Prepare launch notes and handoff", "issue_type": "task", "priority": "low", "estimated_hours": 2},
    ]


def _briefing_cache_key(team_id: str, user_id: str) -> str:
    return f"ai:briefing:{team_id}:{user_id}"


def _health_cache_key(project_id: str) -> str:
    return f"ai:health:{project_id}"


class GenerateTasksView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAIEnabled]

    def post(self, request):
        serializer = GenerateTasksSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        project = None
        if data.get("project_id"):
            project = get_object_or_404(Project, id=data["project_id"])
            _ensure_project_access(request.user, project)

        project_name = data.get("project_name") or (project.name if project else "")
        description = data.get("description") or (project.description if project else "")
        goal = data.get("goal") or ""
        user_prompt = f"Project name: {project_name}\nDescription: {description}\nGoal: {goal}"
        generated = _call_ai(request, "generate_tasks", prompts.TASK_GENERATION_SYSTEM, user_prompt, project=project, max_tokens=1400)
        tasks = _json_from_text(generated, _fallback_tasks(project_name, description or "", goal))
        if isinstance(tasks, dict):
            tasks = tasks.get("tasks", [])
        return standardize_response(data={"tasks": tasks})


class TaskSummarizeView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAIEnabled]

    def post(self, request):
        serializer = TaskIdSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        task = get_object_or_404(Task.objects.select_related("project__team", "column", "assignee"), id=serializer.validated_data["task_id"])
        _ensure_project_access(request.user, task.project)
        context = _task_context(task)
        summary = _call_ai(request, "task_summarize", prompts.TASK_SUMMARY_SYSTEM, context, project=task.project, max_tokens=700)
        if not summary:
            summary = f"{task.title} is currently in {task.column.name}. Priority is {task.priority}. Assignee: {task.assignee.full_name if task.assignee else 'Unassigned'}. Next step: review the latest comments and move the task forward."
        return standardize_response(data={"summary": summary})


class SprintPlanView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAIEnabled]

    def post(self, request):
        serializer = SprintPlanSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        sprint = get_object_or_404(Sprint.objects.select_related("project__team"), id=serializer.validated_data["sprint_id"])
        _ensure_project_access(request.user, sprint.project)
        capacity = Decimal(str(serializer.validated_data.get("capacity_hours") or sprint.capacity_hours or 0))
        tasks = Task.objects.filter(project=sprint.project, sprint__isnull=True, column__is_done_column=False, is_archived=False).order_by("priority", "created_at")[:50]
        payload = [
            {"id": str(t.id), "title": t.title, "priority": t.priority, "estimated_hours": float(t.estimated_hours or 0)}
            for t in tasks
        ]
        fallback_ids = []
        used = Decimal("0")
        for task in tasks:
            estimate = task.estimated_hours or Decimal("1")
            if capacity and used + estimate > capacity:
                continue
            used += estimate
            fallback_ids.append(str(task.id))
        fallback = {"suggested_tasks": fallback_ids, "reasoning": f"Selected {len(fallback_ids)} tasks totalling about {float(used)}h within {float(capacity)}h capacity."}
        text = _call_ai(request, "sprint_plan", prompts.SPRINT_PLANNER_SYSTEM, json.dumps({"capacity_hours": float(capacity), "tasks": payload}), project=sprint.project, max_tokens=1200)
        return standardize_response(data=_json_from_text(text, fallback))


class ChannelSummaryView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAIEnabled]

    def post(self, request):
        serializer = ChannelSummarySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        channel = get_object_or_404(Channel.objects.select_related("team"), id=serializer.validated_data["channel_id"])
        _ensure_channel_access(request.user, channel)
        since = timezone.now() - timedelta(hours=serializer.validated_data["since_hours"])
        messages = list(Message.objects.filter(channel=channel, created_at__gte=since, is_deleted=False).select_related("sender").order_by("-created_at")[:120])
        messages.reverse()
        context = "\n".join([f"{m.sender.full_name}: {m.text}" for m in messages])
        summary = _call_ai(request, "channel_summary", prompts.CHANNEL_SUMMARY_SYSTEM, context, team=channel.team, max_tokens=800)
        if not summary:
            senders = {m.sender_id for m in messages}
            summary = f"{len(messages)} messages from {len(senders)} people. Recent focus: {messages[-1].text[:180] if messages else 'No recent messages.'}"
        return standardize_response(data={"summary": summary, "message_count": len(messages)})


class ProjectHealthScoreView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAIEnabled]

    def get(self, request):
        serializer = ProjectIdSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        project = get_object_or_404(Project.objects.select_related("team"), id=serializer.validated_data["project_id"])
        _ensure_project_access(request.user, project)

        if not request.query_params.get("refresh"):
            cached = cache.get(_health_cache_key(str(project.id)))
            if cached:
                return standardize_response(data=cached)

        tasks = Task.objects.filter(project=project, is_archived=False).select_related("column", "assignee")
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
        text = _call_ai(request, "project_health_score", prompts.PROJECT_HEALTH_SYSTEM, context, project=project, max_tokens=900)
        data = _json_from_text(text, fallback)
        cache.set(_health_cache_key(str(project.id)), data, timeout=3600 * 24)
        return standardize_response(data=data)


class RetrospectiveView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAIEnabled]

    def post(self, request):
        serializer = SprintPlanSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        sprint = get_object_or_404(Sprint.objects.select_related("project__team"), id=serializer.validated_data["sprint_id"])
        _ensure_project_access(request.user, sprint.project)
        tasks = sprint.tasks.select_related("column").all()
        completed = tasks.filter(column__is_done_column=True).count()
        total = tasks.count()
        fallback = {
            "went_well": [f"Completed {completed} of {total} planned tasks."],
            "didnt_go_well": ["Review unfinished or overdue tasks before planning the next sprint."],
            "action_items": ["Confirm capacity before committing the next sprint scope."],
        }
        context = json.dumps({"sprint": sprint.name, "goal": sprint.goal, "total": total, "completed": completed})
        text = _call_ai(request, "retrospective", prompts.RETROSPECTIVE_SYSTEM, context, project=sprint.project, max_tokens=900)
        return standardize_response(data=_json_from_text(text, fallback))


class WorkloadBalanceView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAIEnabled]

    def post(self, request):
        serializer = SprintPlanSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        sprint = get_object_or_404(Sprint.objects.select_related("project__team"), id=serializer.validated_data["sprint_id"])
        _ensure_project_access(request.user, sprint.project)
        loads = list(
            Task.objects.filter(sprint=sprint, assignee__isnull=False)
            .values("assignee_id", "assignee__full_name")
            .annotate(hours=Sum("estimated_hours"), count=Count("id"))
            .order_by("-hours")
        )
        fallback = {"suggestions": []}
        if len(loads) > 1:
            fallback["suggestions"].append({
                "task_id": "",
                "from_member": loads[0]["assignee__full_name"],
                "to_member": loads[-1]["assignee__full_name"],
                "reason": "Move a lower-risk task from the highest-loaded member to the lowest-loaded member.",
            })
        text = _call_ai(request, "workload_balance", prompts.WORKLOAD_BALANCE_SYSTEM, json.dumps({"loads": loads}, default=str), project=sprint.project, max_tokens=900)
        return standardize_response(data=_json_from_text(text, fallback))


class ClientReportView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAIEnabled]

    def post(self, request):
        serializer = ProjectReportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        project = get_object_or_404(Project.objects.select_related("team"), id=serializer.validated_data["project_id"])
        _ensure_project_access(request.user, project)
        since = timezone.now() - timedelta(days=serializer.validated_data["period_days"])
        tasks = Task.objects.filter(project=project, updated_at__gte=since, is_archived=False).select_related("column")
        completed = tasks.filter(column__is_done_column=True).count()
        overdue = tasks.filter(column__is_done_column=False, due_date__lt=timezone.now().date()).count()
        context = json.dumps({"project": project.name, "period_days": serializer.validated_data["period_days"], "updated": tasks.count(), "completed": completed, "overdue": overdue})
        report = _call_ai(request, "client_report", prompts.CLIENT_REPORT_SYSTEM, context, project=project, max_tokens=1000)
        if not report:
            report = f"This period, {project.name} had {tasks.count()} updated tasks and {completed} completed items. {overdue} items need attention. The team should focus on clearing at-risk work before the next milestone."
        return standardize_response(data={"report": report})


class MeetingActionItemsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAIEnabled]

    def post(self, request):
        serializer = MeetingActionItemsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        meeting = get_object_or_404(Meeting.objects.select_related("team"), id=serializer.validated_data["meeting_id"])
        if not request.user.is_superuser and not TeamMember.objects.filter(team=meeting.team, user=request.user).exists():
            raise PermissionDenied("Forbidden")
        transcript = serializer.validated_data["transcript"]
        fallback = {
            "summary": transcript[:240],
            "decisions": [],
            "action_items": [],
            "open_questions": [],
        }
        text = _call_ai(request, "meeting_action_items", prompts.MEETING_ACTION_ITEMS_SYSTEM, transcript, team=meeting.team, max_tokens=1200)
        return standardize_response(data=_json_from_text(text, fallback))


class AutomationBuilderView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAIEnabled]

    def post(self, request):
        serializer = AutomationBuilderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        project = None
        if data.get("project_id"):
            project = get_object_or_404(Project.objects.select_related("team"), id=data["project_id"])
            _ensure_project_access(request.user, project, "edit_project")
        instruction = data["instruction"]
        fallback = {
            "trigger": "task_created" if "created" in instruction.lower() else "task_done",
            "conditions": [{"field": "priority", "op": "eq", "value": "urgent"}] if "urgent" in instruction.lower() else [],
            "actions": [{"type": "notify_reporter"}],
        }
        text = _call_ai(request, "build_automation", prompts.AUTOMATION_BUILDER_SYSTEM, instruction, project=project, max_tokens=900)
        return standardize_response(data=_json_from_text(text, fallback))


class DailyBriefingView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAIEnabled]

    def get(self, request):
        serializer = DailyBriefingSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        team_id = serializer.validated_data["team_id"]

        user = request.user

        if not request.query_params.get("refresh"):
            cached = cache.get(_briefing_cache_key(str(team_id), str(user.id)))
            if cached:
                return standardize_response(data=cached)

        today = timezone.now().date()

        overdue = list(
            Task.objects.filter(
                assignee=user,
                is_archived=False,
                project__team_id=team_id,
                column__is_done_column=False,
                due_date__lt=today,
            )
            .select_related("project")
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
            .select_related("project")
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

        briefing = _call_ai(request, "daily_briefing", prompts.DAILY_BRIEFING_SYSTEM, user_prompt, team=get_object_or_404(Team, id=team_id), max_tokens=500)
        if not briefing:
            briefing = "No briefing available right now. Check your overdue items and today's meetings."

        data = {
            "briefing": briefing,
            "overdue_count": len(overdue),
            "due_today_count": len(due_today),
            "meeting_count": len(meetings_today),
        }
        cache.set(_briefing_cache_key(str(team_id), str(user.id)), data, timeout=3600 * 12)
        return standardize_response(data=data)


class TaskDescriptionView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAIEnabled]

    def post(self, request):
        serializer = TaskDescriptionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        title = serializer.validated_data["title"].strip()
        project_context = serializer.validated_data.get("project_context", "")

        user_prompt = f"Project context: {project_context}\nTask title: {title}"
        raw = _call_ai(request, "task_description", prompts.TASK_DESCRIPTION_SYSTEM, user_prompt, max_tokens=900)
        fallback = {
            "description": f"{title} — define the work and deliverables clearly and concisely.",
            "acceptance_criteria": ["Work is implemented", "QA passes", "Stakeholders confirm requirements are met"],
            "suggested_subtasks": ["Clarify requirements", "Implement change", "Add tests/QA", "Deploy and verify"],
        }
        return standardize_response(data=_json_from_text(raw, fallback))


class FocusRecommendView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAIEnabled]

    def get(self, request):
        serializer = FocusRecommendSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        team_id = serializer.validated_data["team_id"]

        user = request.user
        today = timezone.now().date()

        tasks = list(
            Task.objects.filter(
                assignee=user,
                is_archived=False,
                project__team_id=team_id,
                column__is_done_column=False,
            )
            .select_related("project", "column")
            .order_by("due_date")[:25]
        )

        task_lines = "\n".join(
            f"id={t.id} title={t.title} priority={t.priority} due={t.due_date or 'none'} status={t.column.name if t.column else 'unknown'}"
            for t in tasks
        )
        user_prompt = f"User: {getattr(user, 'full_name', '')}\nToday: {today.isoformat()}\nOpen tasks:\n{task_lines}"

        fallback = {
            "recommendations": [
                {
                    "rank": i + 1,
                    "task_id": str(t.id),
                    "task_title": t.title,
                    "reason": "Prioritized based on due date and urgency.",
                    "urgency_level": "high" if t.due_date and t.due_date <= today else "medium",
                }
                for i, t in enumerate(tasks[:5])
            ]
        }

        raw = _call_ai(request, "focus_recommend", prompts.FOCUS_RECOMMEND_SYSTEM, user_prompt, team=get_object_or_404(Team, id=team_id), max_tokens=700)
        return standardize_response(data=_json_from_text(raw, fallback))


class WeeklyReportView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAIEnabled]

    def post(self, request):
        serializer = WeeklyReportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        project = get_object_or_404(Project.objects.select_related("team"), id=serializer.validated_data["project_id"])
        _ensure_project_access(request.user, project)

        since = timezone.now() - timedelta(days=7)
        tasks = Task.objects.filter(project=project, is_archived=False).select_related("column", "assignee")
        completed = tasks.filter(column__is_done_column=True, updated_at__gte=since)
        in_progress = tasks.filter(column__is_done_column=False)
        overdue = tasks.filter(column__is_done_column=False, due_date__lt=timezone.now().date())

        completed_text = "\n".join(
            f"- {t.title} — {(t.assignee.full_name if t.assignee else 'Unassigned')}"
            for t in completed[:15]
        )
        in_progress_text = "\n".join(f"- {t.title} ({t.priority})" for t in in_progress[:10])
        overdue_text = "\n".join(f"- {t.title}" for t in overdue[:5])

        user_prompt = "\n".join(
            [
                f"Project: {project.name}",
                f"Week ending: {timezone.now().date().isoformat()}",
                "Completed:",
                completed_text or "- none",
                "In progress:",
                in_progress_text or "- none",
                "Overdue:",
                overdue_text or "- none",
            ]
        )

        report = _call_ai(request, "weekly_report", prompts.WEEKLY_REPORT_SYSTEM, user_prompt, project=project, max_tokens=900)
        if not report:
            report = (
                f"Completed This Week:\n{completed_text or '- none'}\n\n"
                f"In Progress:\n{in_progress_text or '- none'}\n\n"
                f"At Risk / Overdue:\n{overdue_text or '- none'}\n\n"
                "Next Steps:\n- Prioritize overdue work and confirm sprint scope."
            )
        return standardize_response(data={"report": report})


class AutoLabelView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAIEnabled]

    def post(self, request):
        serializer = AutoLabelSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        team_id = data["team_id"]

        from apps.projects.models import Label

        available_labels = list(
            Label.objects.filter(project__team_id=team_id)
            .values_list("name", flat=True)
            .distinct()
            .order_by("name")[:50]
        )

        user_prompt = "\n".join(
            [
                f"Task title: {data.get('title') or ''}",
                f"Description: {data.get('description') or ''}",
                "Available labels: " + (", ".join(available_labels) if available_labels else "none"),
            ]
        )

        fallback = {
            "suggested_labels": [],
            "suggested_issue_type": "task",
            "suggested_priority": "normal",
            "confidence": "low",
        }
        raw = _call_ai(request, "auto_label", prompts.AUTO_LABEL_SYSTEM, user_prompt, team=get_object_or_404(Team, id=team_id), max_tokens=500)
        return standardize_response(data=_json_from_text(raw, fallback))


class AIUsageDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        company = _resolve_company(request)
        if not company:
            return standardize_response(data={"message": "No company found"}, status=status.HTTP_404_NOT_FOUND)

        from apps.ai.models import CompanyAICredits, CompanyAIAccess, AILog
        credits_status, _ = CompanyAICredits.objects.get_or_create(
            company=company,
            defaults={"total_allocated": Decimal("5000.00"), "credits_used": Decimal("0.00")}
        )
        ai_access, _ = CompanyAIAccess.objects.get_or_create(
            company=company,
            defaults={"integration_mode": CompanyAIAccess.MODE_PLATFORM}
        )

        logs = AILog.objects.filter(company=company).order_by("-created_at")[:100]

        total_requests = AILog.objects.filter(company=company).count()
        success_requests = AILog.objects.filter(company=company, status="success").count()
        failed_requests = AILog.objects.filter(company=company, status="failed").count()

        token_sum = AILog.objects.filter(company=company, status="success").aggregate(
            prompt=Sum("prompt_tokens"),
            completion=Sum("completion_tokens"),
            cost=Sum("cost_usd"),
            credits=Sum("credits_deducted")
        )
        
        # Calculate real average
        avg_latency = 0
        if total_requests > 0:
            avg_latency = int(AILog.objects.filter(company=company).aggregate(avg=Sum("latency_ms"))["avg"] / total_requests)

        feature_usage = list(
            AILog.objects.filter(company=company)
            .values("feature_name")
            .annotate(count=Count("id"), cost=Sum("cost_usd"))
            .order_by("-count")
        )

        from datetime import datetime, timedelta
        chart_data = []
        for i in range(14, -1, -1):
            day = (timezone.now() - timedelta(days=i)).date()
            day_logs = AILog.objects.filter(company=company, created_at__date=day)
            day_cost = day_logs.aggregate(cost=Sum("cost_usd"))["cost"] or Decimal("0.00")
            day_tokens = day_logs.aggregate(prompt=Sum("prompt_tokens"), comp=Sum("completion_tokens"))
            tokens = (day_tokens["prompt"] or 0) + (day_tokens["comp"] or 0)
            chart_data.append({
                "date": day.strftime("%Y-%m-%d"),
                "cost": float(day_cost),
                "tokens": tokens,
                "count": day_logs.count()
            })

        log_data = []
        for log in logs:
            log_data.append({
                "id": str(log.id),
                "feature_name": log.feature_name,
                "integration_mode": log.integration_mode,
                "provider": log.provider,
                "model_name": log.model_name,
                "prompt_tokens": log.prompt_tokens,
                "completion_tokens": log.completion_tokens,
                "cost_usd": float(log.cost_usd),
                "credits_deducted": float(log.credits_deducted),
                "latency_ms": log.latency_ms,
                "status": log.status,
                "error_message": log.error_message,
                "request_summary": log.request_summary,
                "response_preview": log.response_preview,
                "created_at": log.created_at.isoformat()
            })

        return standardize_response(data={
            "company_name": company.name,
            "integration_mode": ai_access.integration_mode,
            "byok_provider": ai_access.byok_provider,
            "byok_model_override": ai_access.byok_model_override,
            "total_allocated": float(credits_status.total_allocated),
            "credits_used": float(credits_status.credits_used),
            "remaining_credits": float(credits_status.remaining_credits),
            "alert_threshold": credits_status.alert_threshold_percentage,
            "total_requests": total_requests,
            "success_requests": success_requests,
            "failed_requests": failed_requests,
            "avg_latency": avg_latency,
            "total_cost_usd": float(token_sum["cost"] or 0),
            "total_tokens": (token_sum["prompt"] or 0) + (token_sum["completion"] or 0),
            "feature_usage": feature_usage,
            "chart_data": chart_data,
            "logs": log_data
        })


class AITestConnectionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        provider = request.data.get("provider")
        api_key = request.data.get("api_key")
        model = request.data.get("model") or LLMAdapterFactory.get_default_model(provider)

        if not provider or not api_key:
            return standardize_response(success=False, error="Provider and API Key are required", status=status.HTTP_400_BAD_REQUEST)

        company = _resolve_company(request)
        if not company:
            return standardize_response(success=False, error="Company not found", status=status.HTTP_404_NOT_FOUND)

        if api_key == "use_saved_key":
            from apps.ai.models import CompanyAIAccess
            access = CompanyAIAccess.objects.filter(company=company).first()
            if not access or not access.byok_api_key_encrypted:
                return standardize_response(success=False, error="No saved API key found", status=status.HTTP_400_BAD_REQUEST)
            api_key = access.get_api_key()
            if not api_key:
                return standardize_response(success=False, error="Unable to decrypt API key", status=status.HTTP_400_BAD_REQUEST)

        if provider == "openai":
            adapter = OpenAIAdapter(api_key=api_key, default_model=model)
        elif provider == "anthropic":
            adapter = AnthropicAdapter(api_key=api_key, default_model=model)
        elif provider == "gemini":
            adapter = GeminiAdapter(api_key=api_key, default_model=model)
        else:
            return standardize_response(success=False, error="Unsupported provider", status=status.HTTP_400_BAD_REQUEST)

        try:
            res = adapter.generate_text(
                prompt="Respond with OK",
                system_instruction="You are a connection tester.",
                max_tokens=10
            )
            return standardize_response(data={"message": "Connection test successful", "result": res["content"]})
        except Exception as e:
            return standardize_response(success=False, error=f"Connection test failed: {str(e)}", status=status.HTTP_400_BAD_REQUEST)
