from rest_framework import viewsets, status, permissions, generics
from rest_framework.response import Response
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from datetime import timedelta
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.models import Count, Q, F, Sum, Min
from django.utils import timezone
from .models import (
    Project,
    Column,
    Label,
    Task,
    SubTask,
    Attachment,
    TaskActivity,
    ProjectRole,
    TimeLog,
    Sprint,
    SprintCapacity,
    Milestone,
    GitHubPullRequest,
    VcsPullRequest,
    TaskLink,
    SavedIssueView,
    ProjectTemplate,
    RecurringTaskRule,
    TaskWatcher,
    TaskApproval,
    ProjectDocument,
    NotificationRule,
    IssueTypeFieldDefinition,
    TaskCustomFieldValue,
    AutomationRule,
    ClientPortalAccess,
    AttachmentVersion,
)
from .serializers import (
    ProjectListSerializer, ProjectDetailSerializer, ColumnSerializer, 
    LabelSerializer, TaskListSerializer, TaskDetailSerializer, TaskWriteSerializer,
    SubTaskSerializer, AttachmentSerializer, TaskActivitySerializer,
    ProjectRoleSerializer, TimeLogSerializer, SprintSerializer, SprintWriteSerializer,
    MilestoneSerializer, TaskLinkSerializer, SavedIssueViewSerializer,
    GitHubPullRequestSerializer,
    VcsPullRequestSerializer,
    ProjectTemplateSerializer, RecurringTaskRuleSerializer, SprintCapacitySerializer,
    TaskWatcherSerializer, TaskApprovalSerializer, ProjectDocumentSerializer,
    NotificationRuleSerializer, IssueTypeFieldDefinitionSerializer,
    TaskCustomFieldValueSerializer, AutomationRuleSerializer,
    ClientPortalAccessSerializer, AttachmentVersionSerializer
)
from .utils import reorder_items
from .permissions import check_project_permission, get_user_project_role
from .exports import ProjectExporter
from apps.audit.mixins import AuditedModelMixin
from apps.audit.models import AuditLog
from apps.teams.permissions import IsTeamMember, IsTeamAdmin
from apps.teams.models import TeamMember, Team
from apps.users.models import User
from apps.messaging.models import Notification
from config.utils import standardize_response

def apply_template_to_project(project, template, actor):
    columns = template.columns or []
    if not columns:
        columns = [
            {"name": "Backlog", "order": 0, "is_done_column": False},
            {"name": "In Progress", "order": 1, "is_done_column": False},
            {"name": "Done", "order": 2, "is_done_column": True},
        ]
    for index, column in enumerate(columns):
        Column.objects.create(
            project=project,
            name=column.get("name", f"Column {index + 1}"),
            order=column.get("order", index),
            color=column.get("color"),
            is_done_column=column.get("is_done_column", False),
        )

    for label in template.labels or []:
        Label.objects.get_or_create(
            project=project,
            name=label.get("name", "Label"),
            defaults={"color": label.get("color", "#6366f1")},
        )

    for role_data in template.default_roles or []:
        user_id = role_data.get("user_id")
        role = role_data.get("role")
        if not user_id or not role:
            continue
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            continue
        ProjectRole.objects.get_or_create(
            project=project,
            user=user,
            defaults={"role": role, "assigned_by": actor},
        )

def create_task_from_rule(rule, actor):
    task = Task.objects.create(
        title=rule.title,
        description=rule.description,
        project=rule.project,
        column=rule.column,
        assignee=rule.assignee,
        reporter=actor,
        issue_type=rule.issue_type,
        priority=rule.priority,
        order=Task.objects.filter(column=rule.column).count(),
    )
    rule.last_task = task
    today = timezone.now().date()
    if rule.frequency == RecurringTaskRule.FREQUENCY_DAILY:
        delta = timedelta(days=rule.interval)
    elif rule.frequency == RecurringTaskRule.FREQUENCY_WEEKLY:
        delta = timedelta(weeks=rule.interval)
    else:
        delta = timedelta(days=30 * rule.interval)
    rule.next_run_date = max(today, rule.next_run_date) + delta
    rule.save(update_fields=["last_task", "next_run_date"])
    return task

def create_project_notification(recipient, notification_type, title, body, reference_type, reference_id, action_url="", delivery="in_app"):
    if not recipient:
        return None
    notification = Notification.objects.create(
        recipient=recipient,
        type=notification_type,
        title=title[:255],
        body=body[:500],
        reference_type=reference_type,
        reference_id=reference_id,
        action_url=action_url,
        delivery_channel=delivery,
    )
    try:
        from apps.users.tasks import send_push_async

        send_push_async.delay(str(recipient.id), notification.title, notification.body, notification.action_url or "/dashboard")
    except Exception:
        pass
    return notification

def run_project_automation(task, trigger, actor=None):
    rules = AutomationRule.objects.filter(project=task.project, trigger=trigger, is_active=True)
    for rule in rules:
        for action in rule.actions or []:
            action_type = action.get("type")
            if action_type == "notify_reporter" and task.reporter:
                create_project_notification(
                    recipient=task.reporter,
                    notification_type="automation_notice",
                    title=f"Automation: {task.title}",
                    body=action.get("message", f"{task.title} triggered {trigger}"),
                    reference_type="task",
                    reference_id=task.id,
                    action_url=f"/projects/{task.project_id}?task={task.id}",
                )
            elif action_type == "notify_assignee" and task.assignee:
                create_project_notification(
                    recipient=task.assignee,
                    notification_type="automation_notice",
                    title=f"Automation: {task.title}",
                    body=action.get("message", f"{task.title} triggered {trigger}"),
                    reference_type="task",
                    reference_id=task.id,
                    action_url=f"/projects/{task.project_id}?task={task.id}",
                )
            elif action_type == "notify_role":
                role = action.get("role")
                users = TeamMember.objects.filter(team=task.project.team, role=role).select_related("user")
                for member in users:
                    create_project_notification(
                        recipient=member.user,
                        notification_type="automation_notice",
                        title=f"Automation: {task.title}",
                        body=action.get("message", f"{task.title} triggered {trigger}"),
                        reference_type="task",
                        reference_id=task.id,
                        action_url=f"/projects/{task.project_id}?task={task.id}",
                    )

def create_default_watchers(task, actor):
    for user in filter(None, [task.assignee, task.reporter, actor]):
        TaskWatcher.objects.get_or_create(task=task, user=user)

class ProjectViewSet(AuditedModelMixin, viewsets.ModelViewSet):
    serializer_class = ProjectListSerializer
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_permissions(self):
        # We'll do object-level checks in dispatch or override methods
        return [permissions.IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == "list":
            return ProjectListSerializer
        if self.action == "retrieve":
            return ProjectDetailSerializer
        if self.action in {"create", "update", "partial_update"}:
            from .serializers import ProjectCreateUpdateSerializer

            return ProjectCreateUpdateSerializer
        return ProjectDetailSerializer

    def get_queryset(self):
        queryset = Project.objects.select_related("team", "created_by")
        status_filter = self.request.query_params.get("status", "active")
        team_id = self.request.query_params.get("team_id")

        if self.action == "list":
            if status_filter in {"active", "archived"}:
                queryset = queryset.filter(status=status_filter)
        elif self.action in {"retrieve", "export", "update", "partial_update", "destroy", "restore", "reorder_columns"}:
            # Keep archived projects addressable for detail and management workflows.
            queryset = queryset
        else:
            queryset = queryset.filter(status="active")
        
        if self.action == "list":
            today = timezone.now().date()
            queryset = queryset.annotate(
                task_count=Count("tasks", distinct=True),
                completed_task_count=Count("tasks", filter=Q(tasks__column__is_done_column=True), distinct=True),
                overdue_count=Count("tasks", filter=Q(tasks__column__is_done_column=False, tasks__due_date__lt=today), distinct=True),
                member_count=Count("team__members", distinct=True)
            )
        elif self.action == "retrieve":
            # For detail view, we MUST have columns and tasks to render the board
            queryset = queryset.prefetch_related("columns", "columns__tasks", "labels")

        if team_id:
            queryset = queryset.filter(team_id=team_id)

        if self.request.user.is_superuser:
            return queryset

        # Any team member can view their team's projects (implicit project role derives from TeamMember).
        filtered_queryset = queryset.filter(
            Q(team__members__user=self.request.user)
            | Q(roles__user=self.request.user)
            | Q(created_by=self.request.user)
        )

        return filtered_queryset.distinct()

    def perform_create(self, serializer):
        project = serializer.save(created_by=self.request.user)
        template_id = serializer.validated_data.get("template_id")
        if template_id:
            template = ProjectTemplate.objects.filter(pk=template_id, team=project.team).first()
            if template:
                apply_template_to_project(project, template, self.request.user)
        # Grant creator admin role? Actually signals handle permissions usually
        ProjectRole.objects.create(project=project, user=self.request.user, role="project_admin")

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Enforce: only team admins can create projects for a team.
        team = serializer.validated_data.get("team")
        if team is None:
            team = Team.objects.filter(members__user=request.user).first()
        if team is None:
            return standardize_response(success=False, error="Team is required", status=status.HTTP_400_BAD_REQUEST)

        if request.user.is_superuser:
            self.perform_create(serializer)
            return standardize_response(data=serializer.data, status=status.HTTP_201_CREATED)

        is_power_user = TeamMember.objects.filter(
            team=team, 
            user=request.user, 
            role__in=[TeamMember.ADMIN, TeamMember.CEO, TeamMember.MANAGER]
        ).exists()
        if not is_power_user:
            return standardize_response(success=False, error="Forbidden", status=status.HTTP_403_FORBIDDEN)

        from apps.teams.plans import get_team_limits
        limits = get_team_limits(team)
        max_projects = int(limits.get("max_projects", 3))
        current_projects = Project.objects.filter(team=team, status="active").count()
        if current_projects >= max_projects:
            return standardize_response(
                success=False,
                error={"code": "plan_limit", "message": "Project limit reached for your plan."},
                status=status.HTTP_402_PAYMENT_REQUIRED,
            )

        self.perform_create(serializer)
        return standardize_response(data=serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"])
    def export(self, request, pk=None):
        project = self.get_object()
        if not check_project_permission(request.user, project, "view_project"):
            return Response({"error": "Forbidden"}, status=403)
        
        export_format = request.query_params.get("format", "csv")
        exporter = ProjectExporter(project, request.user, export_format)
        return exporter.export()

    @action(detail=True, methods=["post"], url_path="import/csv")
    def import_csv(self, request, pk=None):
        """
        CSV task import for basic migrations from other tools.

        Expected header columns (case-insensitive):
        - title (required)
        - description
        - column (column name; defaults to Backlog if not found)
        - assignee_email
        - due_date (YYYY-MM-DD)
        - priority (urgent|high|normal|low)
        - issue_type (epic|story|task|bug|subtask)
        """
        project = self.get_object()
        if not check_project_permission(request.user, project, "edit_project"):
            raise permissions.PermissionDenied("Forbidden")

        upload = request.FILES.get("file")
        if not upload:
            return standardize_response(success=False, error="file is required", status=status.HTTP_400_BAD_REQUEST)

        import csv
        import io
        from datetime import date

        from django.utils.dateparse import parse_date

        content = upload.read()
        try:
            text = content.decode("utf-8-sig")
        except Exception:
            text = content.decode("utf-8", errors="replace")

        reader = csv.DictReader(io.StringIO(text))
        if not reader.fieldnames:
            return standardize_response(success=False, error="CSV must have a header row", status=status.HTTP_400_BAD_REQUEST)

        headers = {h.strip().lower(): h for h in reader.fieldnames if h}
        if "title" not in headers:
            return standardize_response(success=False, error="CSV header must include 'title'", status=status.HTTP_400_BAD_REQUEST)

        columns_by_name = {c.name.strip().lower(): c for c in Column.objects.filter(project=project)}
        default_column = columns_by_name.get("backlog") or next(iter(columns_by_name.values()), None)
        if default_column is None:
            return standardize_response(success=False, error="Project has no columns", status=status.HTTP_400_BAD_REQUEST)

        created_ids: list[str] = []
        errors: list[dict] = []
        row_num = 1
        for row in reader:
            row_num += 1
            title = (row.get(headers["title"]) or "").strip()
            if not title:
                continue

            description = (row.get(headers.get("description", "")) or "").strip() if headers.get("description") else ""
            col_name = (row.get(headers.get("column", "")) or "").strip().lower() if headers.get("column") else ""
            column = columns_by_name.get(col_name) or default_column

            assignee = None
            if headers.get("assignee_email"):
                email = (row.get(headers["assignee_email"]) or "").strip().lower()
                if email:
                    assignee = User.objects.filter(email=email, is_active=True).first()

            due = None
            if headers.get("due_date"):
                raw_due = (row.get(headers["due_date"]) or "").strip()
                if raw_due:
                    parsed = parse_date(raw_due)
                    if parsed and isinstance(parsed, date):
                        due = parsed
                    else:
                        errors.append({"row": row_num, "error": f"Invalid due_date '{raw_due}'"})

            priority = (row.get(headers.get("priority", "")) or "").strip().lower() if headers.get("priority") else ""
            issue_type = (row.get(headers.get("issue_type", "")) or "").strip().lower() if headers.get("issue_type") else ""

            try:
                task = Task.objects.create(
                    title=title,
                    description=description or None,
                    project=project,
                    column=column,
                    assignee=assignee,
                    reporter=request.user,
                    due_date=due,
                    priority=priority or Task._meta.get_field("priority").default,
                    issue_type=issue_type or Task._meta.get_field("issue_type").default,
                )
                created_ids.append(str(task.id))
            except Exception as e:
                errors.append({"row": row_num, "error": str(e)})

        return standardize_response(
            data={"created": len(created_ids), "task_ids": created_ids[:50], "errors": errors[:50]}
        )

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return standardize_response(data=serializer.data)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return standardize_response(data=serializer.data)

    def perform_update(self, serializer):
        if not check_project_permission(self.request.user, serializer.instance, "edit_project"):
            raise permissions.PermissionDenied("Forbidden")
        super().perform_update(serializer)

    def perform_destroy(self, instance):
        if not check_project_permission(self.request.user, instance, "manage_project"):
            raise permissions.PermissionDenied("Forbidden")
        instance.status = "archived"
        instance.save()

    @action(detail=True, methods=["post"])
    def restore(self, request, pk=None):
        project = self.get_object()
        if not check_project_permission(request.user, project, "manage_project"):
            raise permissions.PermissionDenied("Forbidden")
        project.status = "active"
        project.save(update_fields=["status", "updated_at"])
        return standardize_response(data={"message": "Project restored"})

    @action(detail=True, methods=["post"], url_path="columns/reorder")
    def reorder_columns(self, request, pk=None):
        project = self.get_object()
        if not check_project_permission(request.user, project, "edit_project"):
            raise permissions.PermissionDenied("Forbidden")
        ordered_ids = request.data.get("ordered_ids", [])
        reorder_items(Column, ordered_ids, extra_filter={"project_id": pk})
        return standardize_response(data={"message": "Columns reordered"})

class ColumnViewSet(viewsets.ModelViewSet):
    serializer_class = ColumnSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        project = get_object_or_404(Project, pk=self.kwargs["project_pk"])
        if not check_project_permission(self.request.user, project, "view_project"):
            return Column.objects.none()
        return Column.objects.filter(project=project)

    def perform_create(self, serializer):
        project = get_object_or_404(Project, pk=self.kwargs["project_pk"])
        if not check_project_permission(self.request.user, project, "edit_project"):
            raise permissions.PermissionDenied("Forbidden")
        serializer.save(project=project)

    def perform_update(self, serializer):
        if not check_project_permission(self.request.user, serializer.instance.project, "edit_project"):
            raise permissions.PermissionDenied("Forbidden")
        super().perform_update(serializer)

    def perform_destroy(self, instance):
        if not check_project_permission(self.request.user, instance.project, "manage_project"):
            raise permissions.PermissionDenied("Forbidden")
        super().perform_destroy(instance)

class TaskViewSet(AuditedModelMixin, viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Task.objects.filter(is_archived=False).select_related(
            "assignee", "reporter", "column", "project"
        ).prefetch_related("labels", "subtasks", "timelogs", "assignees")
        
        if not self.request.user.is_superuser:
            visible_projects = Project.objects.filter(
                Q(team__members__user=self.request.user)
                | Q(roles__user=self.request.user)
                | Q(created_by=self.request.user)
            ).values_list("id", flat=True)

            queryset = queryset.filter(project_id__in=visible_projects)

        project_id = self.request.query_params.get("project_id")
        if project_id:
            project = get_object_or_404(Project, pk=project_id)
            if not check_project_permission(self.request.user, project, "view_project"):
                return Task.objects.none()
            queryset = queryset.filter(project_id=project_id)
        
        column_id = self.request.query_params.get("column_id")
        assignee_id = self.request.query_params.get("assignee_id")
        sprint_id = self.request.query_params.get("sprint_id")
        parent_task_id = self.request.query_params.get("parent_task_id")
        issue_type = self.request.query_params.get("issue_type")
        priority = self.request.query_params.get("priority")
        due = self.request.query_params.get("due")
        search = self.request.query_params.get("search")
        team_id = self.request.query_params.get("team_id")
        status_filter = self.request.query_params.get("status")

        if column_id: queryset = queryset.filter(column_id=column_id)
        if assignee_id:
            queryset = queryset.filter(Q(assignee_id=assignee_id) | Q(assignees__id=assignee_id)).distinct()
        if sprint_id: queryset = queryset.filter(sprint_id=sprint_id)
        if parent_task_id: queryset = queryset.filter(parent_task_id=parent_task_id)
        if issue_type: queryset = queryset.filter(issue_type=issue_type)
        if priority: queryset = queryset.filter(priority=priority)
        if team_id: queryset = queryset.filter(project__team_id=team_id)
        if search: queryset = queryset.filter(Q(title__icontains=search) | Q(description__icontains=search))
        if status_filter == "done":
            queryset = queryset.filter(column__is_done_column=True)
        elif status_filter == "open":
            queryset = queryset.filter(column__is_done_column=False)
        
        if due == "overdue":
            queryset = queryset.filter(due_date__lt=timezone.now().date())
        elif due == "today":
            queryset = queryset.filter(due_date=timezone.now().date())
        elif due == "this_week":
            start_week = timezone.now().date()
            end_week = start_week + timedelta(days=7)
            queryset = queryset.filter(due_date__range=[start_week, end_week])

        return queryset.order_by("order")

    def get_object(self):
        instance = super().get_object()
        if not check_project_permission(self.request.user, instance.project, "view_project"):
            raise permissions.PermissionDenied("Forbidden")
        return instance

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return standardize_response(data=serializer.data)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return standardize_response(data=serializer.data)

    def get_serializer_class(self):
        if self.action in ["list"]:
            return TaskListSerializer
        if self.action in ["create", "update", "partial_update"]:
            return TaskWriteSerializer
        return TaskDetailSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        detail = TaskDetailSerializer(serializer.instance, context={"request": request}).data
        return standardize_response(data=detail, status=status.HTTP_201_CREATED)

    def perform_create(self, serializer):
        project = serializer.validated_data.get("project")
        if not project:
             # Fallback if project id is passed as string in some contexts
             project_id = self.request.data.get("project")
             if project_id:
                 project = get_object_or_404(Project, pk=project_id)
        
        if not check_project_permission(self.request.user, project, "edit_project"):
            raise permissions.PermissionDenied("No permission to create tasks")
        
        column = serializer.validated_data.get("column")
        order = Task.objects.filter(column=column).count()
        previous_assignee = serializer.validated_data.get("assignee")
        assignees = list(serializer.validated_data.get("assignees") or [])
        serializer.save(reporter=self.request.user, order=order, project=project)
        task = serializer.instance

        # Back-compat: keep `assignee` populated with the first assignee (if provided).
        if assignees:
            if not task.assignee_id:
                task.assignee = assignees[0]
                task.save(update_fields=["assignee"])
        elif previous_assignee:
            task.assignees.add(previous_assignee)

        create_default_watchers(task, self.request.user)
        TaskActivity.objects.create(task=task, actor=self.request.user, verb="created", detail={"column": str(task.column_id)})

        notify_assignees = list(task.assignees.all()) or ([previous_assignee] if previous_assignee else [])
        for recipient in filter(None, notify_assignees):
            create_project_notification(
                recipient=recipient,
                notification_type="task_assigned",
                title=f"Assigned to {task.title}",
                body=f"{self.request.user.full_name} assigned you a task",
                reference_type="task",
                reference_id=task.id,
                action_url=f"/projects/{task.project_id}?task={task.id}",
            )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        detail = TaskDetailSerializer(serializer.instance, context={"request": request}).data
        return standardize_response(data=detail)

    def perform_update(self, serializer):
        if not check_project_permission(self.request.user, serializer.instance.project, "edit_project"):
            raise permissions.PermissionDenied("No permission to edit tasks")
        old_task = Task.objects.get(pk=serializer.instance.pk)
        old_assignee_ids = set(old_task.assignees.values_list("id", flat=True))
        super().perform_update(serializer)
        task = serializer.instance
        new_assignee_ids = set(task.assignees.values_list("id", flat=True))

        # Back-compat: keep `assignee` in sync (best-effort).
        if new_assignee_ids and (not task.assignee_id or task.assignee_id not in new_assignee_ids):
            task.assignee_id = next(iter(new_assignee_ids))
            task.save(update_fields=["assignee"])
        elif not new_assignee_ids and task.assignee_id:
            # If assignees cleared, keep single assignee but add it back to assignees for consistency.
            task.assignees.add(task.assignee_id)
            new_assignee_ids = set(task.assignees.values_list("id", flat=True))

        changes = {}
        for field in ["assignee_id", "due_date", "priority", "column_id", "sprint_id", "issue_type", "parent_task_id"]:
            if getattr(old_task, field) != getattr(task, field):
                changes[field] = [str(getattr(old_task, field)), str(getattr(task, field))]
        if changes:
            TaskActivity.objects.create(task=task, actor=self.request.user, verb="updated", detail=changes)
            AuditLog.log(self.request.user, "update", task, changes=changes, request=self.request)

        added_assignees = new_assignee_ids - old_assignee_ids
        if added_assignees:
            for recipient in task.assignees.filter(id__in=list(added_assignees)):
                create_project_notification(
                    recipient=recipient,
                    notification_type="task_assigned",
                    title=f"Assigned to {task.title}",
                    body=f"{self.request.user.full_name} assigned you a task",
                    reference_type="task",
                    reference_id=task.id,
                    action_url=f"/projects/{task.project_id}?task={task.id}",
                )
        if old_task.column_id != task.column_id and task.column.is_done_column:
            run_project_automation(task, AutomationRule.TRIGGER_TASK_DONE, self.request.user)

    def perform_destroy(self, instance):
        if not check_project_permission(self.request.user, instance.project, "manage_project"):
            raise permissions.PermissionDenied("No permission to delete tasks")
        super().perform_destroy(instance)

    @action(detail=True, methods=["post"])
    def move(self, request, pk=None):
        task = self.get_object()
        if not check_project_permission(request.user, task.project, "edit_project"):
            return Response({"error": "Forbidden"}, status=403)
        
        column_id = request.data.get("column") or request.data.get("column_id")
        new_order = request.data.get("order", 0)
        
        with transaction.atomic():
            if column_id:
                task.column_id = column_id
            task.order = new_order
            task.save()
        TaskActivity.objects.create(task=task, actor=request.user, verb="moved", detail={"column_id": str(task.column_id), "order": new_order})
        if task.column.is_done_column:
            TaskActivity.objects.create(task=task, actor=request.user, verb="completed", detail={})
            run_project_automation(task, AutomationRule.TRIGGER_TASK_DONE, request.user)
        return standardize_response(data=TaskDetailSerializer(task, context={"request": request}).data)

    @action(detail=False, methods=["post"], url_path="bulk-update")
    def bulk_update(self, request):
        task_ids = request.data.get("task_ids", [])
        updates = request.data.get("updates", {})
        if not task_ids:
            return standardize_response(success=False, error="task_ids is required", status=400)
        tasks = Task.objects.filter(id__in=task_ids, is_archived=False)
        visible_tasks = [task for task in tasks if check_project_permission(request.user, task.project, "edit_project")]
        if not visible_tasks:
            return standardize_response(success=False, error="No editable tasks found", status=403)

        for task in visible_tasks:
            if "assignee" in updates:
                task.assignee_id = updates.get("assignee") or None
                task.assignees.set([task.assignee_id] if task.assignee_id else [])
            if "assignee_ids" in updates:
                ids = updates.get("assignee_ids") or []
                task.assignees.set(ids)
                task.assignee_id = ids[0] if ids else None
            if "priority" in updates:
                task.priority = updates["priority"]
            if "due_date" in updates:
                task.due_date = updates.get("due_date") or None
            if "column" in updates:
                task.column_id = updates["column"]
            if "sprint" in updates:
                task.sprint_id = updates.get("sprint") or None
            if "issue_type" in updates:
                task.issue_type = updates["issue_type"]
            if "archive" in updates:
                task.is_archived = bool(updates["archive"])
            task.save()
            if task.column.is_done_column:
                run_project_automation(task, AutomationRule.TRIGGER_TASK_DONE, request.user)
        return standardize_response(data={"updated": len(visible_tasks)})

    @action(detail=True, methods=["get", "post"], url_path="watchers")
    def watchers(self, request, pk=None):
        task = self.get_object()
        if request.method == "GET":
            watchers = TaskWatcher.objects.filter(task=task).select_related("user")
            return standardize_response(data=TaskWatcherSerializer(watchers, many=True).data)
        if not check_project_permission(request.user, task.project, "view_project"):
            raise permissions.PermissionDenied()
        watcher, _ = TaskWatcher.objects.get_or_create(task=task, user=request.user)
        create_project_notification(
            recipient=request.user,
            notification_type="task_watched",
            title=f"Watching {task.title}",
            body="You will receive updates for this task",
            reference_type="task",
            reference_id=task.id,
            action_url=f"/projects/{task.project_id}?task={task.id}",
        )
        return standardize_response(data=TaskWatcherSerializer(watcher).data, status=201)

    @action(detail=True, methods=["delete"], url_path=r"watchers/(?P<watcher_id>[^/.]+)")
    def remove_watcher(self, request, pk=None, watcher_id=None):
        task = self.get_object()
        TaskWatcher.objects.filter(task=task, id=watcher_id).delete()
        return standardize_response(data={"message": "Watcher removed"})

    @action(detail=True, methods=["post"], url_path="subtasks/reorder")
    def reorder_subtasks(self, request, pk=None):
        task = self.get_object()
        if not check_project_permission(request.user, task.project, "edit_project"):
            raise permissions.PermissionDenied()
        ordered_ids = request.data.get("ordered_ids", [])
        reorder_items(SubTask, ordered_ids, extra_filter={"task_id": pk})
        return standardize_response(data={"message": "Subtasks reordered"})

class ProjectRoleViewSet(AuditedModelMixin, viewsets.ModelViewSet):
    serializer_class = ProjectRoleSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def _get_project(self):
        return get_object_or_404(Project, pk=self.kwargs["project_pk"])

    def _require_manage(self, project):
        if not check_project_permission(self.request.user, project, "manage_project"):
            raise permissions.PermissionDenied("You do not have permission to manage this project's roles.")

    def get_queryset(self):
        project = self._get_project()
        self._require_manage(project)
        return ProjectRole.objects.filter(project=project).select_related("user", "assigned_by")

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        serializer = self.get_serializer(qs, many=True)
        return standardize_response(data=serializer.data)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        return standardize_response(data=self.get_serializer(instance).data)

    def perform_create(self, serializer):
        from .permissions import can_assign_role, get_user_project_role, sync_project_permissions
        project = self._get_project()
        self._require_manage(project)

        # Prevent privilege escalation: assigner cannot grant a role above their own
        assigner_role = get_user_project_role(request=None, project=project) if False else None
        assigner_role = get_user_project_role(self.request.user, project)
        target_role = serializer.validated_data.get("role")
        if assigner_role and not self.request.user.is_superuser:
            from .permissions import can_assign_role as _can
            if not _can(assigner_role, target_role):
                raise permissions.PermissionDenied(
                    f"Your role '{assigner_role}' cannot assign the '{target_role}' role."
                )

        role_obj = serializer.save(project=project, assigned_by=self.request.user)
        sync_project_permissions(role_obj)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return standardize_response(data=serializer.data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        from .permissions import can_assign_role, get_user_project_role, sync_project_permissions
        instance = self.get_object()
        project = self._get_project()
        self._require_manage(project)

        # Prevent escalation on role changes
        target_role = request.data.get("role", instance.role)
        assigner_role = get_user_project_role(request.user, project)
        if assigner_role and not request.user.is_superuser:
            if not can_assign_role(assigner_role, target_role):
                raise permissions.PermissionDenied(
                    f"Your role '{assigner_role}' cannot assign the '{target_role}' role."
                )

        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        role_obj = serializer.save()
        sync_project_permissions(role_obj)
        return standardize_response(data=self.get_serializer(role_obj).data)

    def destroy(self, request, *args, **kwargs):
        from .permissions import sync_project_permissions
        instance = self.get_object()
        project = self._get_project()
        self._require_manage(project)
        # Remove Guardian perms before deleting
        instance.role = "viewer"
        instance.capabilities = {}
        sync_project_permissions(instance)
        instance.delete()
        return standardize_response(status=status.HTTP_204_NO_CONTENT)

class TimeLogViewSet(viewsets.ModelViewSet):
    serializer_class = TimeLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if "task_pk" in self.kwargs:
            task = get_object_or_404(Task, pk=self.kwargs["task_pk"])
            if not check_project_permission(self.request.user, task.project, "view_project"):
                raise permissions.PermissionDenied()
            return TimeLog.objects.filter(task=task)
        
        project_id = self.request.query_params.get("project_id")
        if project_id:
            project = get_object_or_404(Project, pk=project_id)
            if not check_project_permission(self.request.user, project, "view_project"):
                raise permissions.PermissionDenied()
            return TimeLog.objects.filter(task__project=project)
        return TimeLog.objects.none()

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return standardize_response(data=serializer.data)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return standardize_response(data=serializer.data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return standardize_response(data=serializer.data, status=status.HTTP_201_CREATED)

    def perform_create(self, serializer):
        task_id = self.kwargs.get("task_pk")
        task = get_object_or_404(Task, pk=task_id)
        if not check_project_permission(self.request.user, task.project, "edit_project"):
            raise permissions.PermissionDenied()
        serializer.save(task=task, user=self.request.user)

class AttachmentUploadView(generics.CreateAPIView):
    serializer_class = AttachmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, task_id):
        task = get_object_or_404(Task, id=task_id)
        if not check_project_permission(request.user, task.project, "edit_project"):
             raise permissions.PermissionDenied()
        file = request.FILES.get("file")
        if not file:
            return standardize_response(success=False, error="No file provided", status=400)
        
        attachment = Attachment.objects.create(
            task=task,
            file=file,
            original_filename=file.name,
            file_size=file.size,
            mime_type=file.content_type,
            uploaded_by=request.user
        )
        return standardize_response(data=AttachmentSerializer(attachment, context={"request": request}).data)

class SprintViewSet(AuditedModelMixin, viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Sprint.objects.select_related("project").prefetch_related("member_capacities__user")
        project_id = self.request.query_params.get("project_id")
        team_id = self.request.query_params.get("team_id")
        if project_id:
            project = get_object_or_404(Project, pk=project_id)
            if not check_project_permission(self.request.user, project, "view_project"):
                return Sprint.objects.none()
            queryset = queryset.filter(project_id=project_id)
        if team_id:
            queryset = queryset.filter(project__team_id=team_id)
        if not self.request.user.is_superuser:
            queryset = queryset.filter(
                Q(project__roles__user=self.request.user) |
                Q(project__team__members__user=self.request.user) |
                Q(project__created_by=self.request.user)
            ).distinct()
        return queryset

    def get_serializer_class(self):
        if self.action in {"create", "update", "partial_update"}:
            return SprintWriteSerializer
        return SprintSerializer

    def perform_create(self, serializer):
        project = serializer.validated_data["project"]
        if not check_project_permission(self.request.user, project, "edit_project"):
            raise permissions.PermissionDenied("Forbidden")
        capacities = serializer.validated_data.pop("capacities", [])
        sprint = serializer.save(created_by=self.request.user)
        for capacity in capacities:
            SprintCapacity.objects.update_or_create(
                sprint=sprint,
                user=capacity["user"],
                defaults={
                    "capacity_hours": capacity["capacity_hours"],
                    "notes": capacity.get("notes", ""),
                },
            )

    def perform_update(self, serializer):
        sprint = serializer.instance
        if not check_project_permission(self.request.user, sprint.project, "edit_project"):
            raise permissions.PermissionDenied("Forbidden")
        capacities = serializer.validated_data.pop("capacities", None)
        sprint = serializer.save()
        if capacities is not None:
            sprint.member_capacities.all().delete()
            for capacity in capacities:
                SprintCapacity.objects.create(
                    sprint=sprint,
                    user=capacity["user"],
                    capacity_hours=capacity["capacity_hours"],
                    notes=capacity.get("notes", ""),
                )

class MilestoneViewSet(AuditedModelMixin, viewsets.ModelViewSet):
    serializer_class = MilestoneSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Milestone.objects.select_related("project")
        project_id = self.request.query_params.get("project_id")
        team_id = self.request.query_params.get("team_id")
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        if team_id:
            queryset = queryset.filter(project__team_id=team_id)
        if not self.request.user.is_superuser:
            queryset = queryset.filter(
                Q(project__roles__user=self.request.user) |
                Q(project__team__members__user=self.request.user) |
                Q(project__created_by=self.request.user)
            ).distinct()
        return queryset

    def perform_create(self, serializer):
        project = serializer.validated_data["project"]
        if not check_project_permission(self.request.user, project, "edit_project"):
            raise permissions.PermissionDenied("Forbidden")
        serializer.save(created_by=self.request.user)

class TaskLinkViewSet(AuditedModelMixin, viewsets.ModelViewSet):
    serializer_class = TaskLinkSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = TaskLink.objects.select_related("source_task", "target_task")
        task_id = self.request.query_params.get("task_id")
        team_id = self.request.query_params.get("team_id")
        if task_id:
            queryset = queryset.filter(Q(source_task_id=task_id) | Q(target_task_id=task_id))
        if team_id:
            queryset = queryset.filter(source_task__project__team_id=team_id)
        if not self.request.user.is_superuser:
            queryset = queryset.filter(
                Q(source_task__project__roles__user=self.request.user) |
                Q(source_task__project__team__members__user=self.request.user) |
                Q(source_task__project__created_by=self.request.user)
            ).distinct()
        return queryset

    def perform_create(self, serializer):
        source_task = serializer.validated_data["source_task"]
        if not check_project_permission(self.request.user, source_task.project, "edit_project"):
            raise permissions.PermissionDenied("Forbidden")
        serializer.save(created_by=self.request.user)

class SavedIssueViewViewSet(AuditedModelMixin, viewsets.ModelViewSet):
    serializer_class = SavedIssueViewSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = SavedIssueView.objects.all()
        team_id = self.request.query_params.get("team_id")
        if team_id:
            queryset = queryset.filter(team_id=team_id)
        if self.request.user.is_superuser:
            return queryset
        return queryset.filter(Q(user=self.request.user) | Q(is_shared=True))

    def perform_create(self, serializer):
        team = serializer.validated_data["team"]
        if not self.request.user.is_superuser and not TeamMember.objects.filter(team=team, user=self.request.user).exists():
            raise permissions.PermissionDenied("Forbidden")
        serializer.save(user=self.request.user)

class ProjectTemplateViewSet(AuditedModelMixin, viewsets.ModelViewSet):
    serializer_class = ProjectTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = ProjectTemplate.objects.all()
        team_id = self.request.query_params.get("team_id")
        if team_id:
            queryset = queryset.filter(team_id=team_id)
        if self.request.user.is_superuser:
            return queryset
        return queryset.filter(team__members__user=self.request.user).distinct()

    def perform_create(self, serializer):
        team = serializer.validated_data["team"]
        if not self.request.user.is_superuser and not TeamMember.objects.filter(
            team=team, user=self.request.user, role__in=[TeamMember.ADMIN, TeamMember.CEO, TeamMember.MANAGER]
        ).exists():
            raise permissions.PermissionDenied("Forbidden")
        serializer.save(created_by=self.request.user)

class RecurringTaskRuleViewSet(AuditedModelMixin, viewsets.ModelViewSet):
    serializer_class = RecurringTaskRuleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = RecurringTaskRule.objects.select_related("project", "column", "assignee", "last_task")
        project_id = self.request.query_params.get("project_id")
        team_id = self.request.query_params.get("team_id")
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        if team_id:
            queryset = queryset.filter(project__team_id=team_id)
        if self.request.user.is_superuser:
            return queryset
        return queryset.filter(
            Q(project__roles__user=self.request.user) |
            Q(project__team__members__user=self.request.user) |
            Q(project__created_by=self.request.user)
        ).distinct()

    def perform_create(self, serializer):
        project = serializer.validated_data["project"]
        if not check_project_permission(self.request.user, project, "edit_project"):
            raise permissions.PermissionDenied("Forbidden")
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["post"])
    def run(self, request, pk=None):
        rule = self.get_object()
        if not check_project_permission(request.user, rule.project, "edit_project"):
            raise permissions.PermissionDenied("Forbidden")
        task = create_task_from_rule(rule, request.user)
        return standardize_response(data=TaskDetailSerializer(task, context={"request": request}).data)

class TaskApprovalViewSet(AuditedModelMixin, viewsets.ModelViewSet):
    serializer_class = TaskApprovalSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = TaskApproval.objects.select_related("project", "task", "requested_by", "decided_by")
        team_id = self.request.query_params.get("team_id")
        project_id = self.request.query_params.get("project_id")
        task_id = self.request.query_params.get("task_id")
        status_filter = self.request.query_params.get("status")
        if team_id:
            queryset = queryset.filter(project__team_id=team_id)
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        if task_id:
            queryset = queryset.filter(task_id=task_id)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        return queryset

    def perform_create(self, serializer):
        project = serializer.validated_data["project"]
        if not check_project_permission(self.request.user, project, "edit_project"):
            raise permissions.PermissionDenied("Forbidden")
        approval = serializer.save(requested_by=self.request.user)
        approvers = TeamMember.objects.filter(team=project.team, role__in=[TeamMember.MANAGER, TeamMember.ADMIN, TeamMember.CEO]).select_related("user")
        for approver in approvers:
            create_project_notification(
                recipient=approver.user,
                notification_type="approval_requested",
                title=approval.title,
                body=f"{self.request.user.full_name} requested approval",
                reference_type="task" if approval.task_id else "project",
                reference_id=approval.task_id or approval.project_id,
                action_url=f"/projects/{approval.project_id}",
            )
        run_project_automation(approval.task, AutomationRule.TRIGGER_APPROVAL_REQUESTED, self.request.user) if approval.task else None

    @action(detail=True, methods=["post"])
    def decide(self, request, pk=None):
        approval = self.get_object()
        role = TeamMember.objects.filter(team=approval.project.team, user=request.user).values_list("role", flat=True).first()
        if not request.user.is_superuser and role not in {TeamMember.MANAGER, TeamMember.ADMIN, TeamMember.CEO}:
            raise permissions.PermissionDenied("Forbidden")
        decision = request.data.get("status")
        if decision not in {TaskApproval.STATUS_APPROVED, TaskApproval.STATUS_REJECTED}:
            return standardize_response(success=False, error="Invalid status", status=400)
        approval.status = decision
        approval.decision_note = request.data.get("decision_note", "")
        approval.decided_by = request.user
        approval.decided_at = timezone.now()
        approval.save(update_fields=["status", "decision_note", "decided_by", "decided_at"])
        create_project_notification(
            recipient=approval.requested_by,
            notification_type="approval_decided",
            title=approval.title,
            body=f"Approval {decision}",
            reference_type="task" if approval.task_id else "project",
            reference_id=approval.task_id or approval.project_id,
            action_url=f"/projects/{approval.project_id}",
        )
        AuditLog.log(request.user, "approval_change", approval, changes={"status": ["pending", decision]}, request=request)
        return standardize_response(data=TaskApprovalSerializer(approval).data)

class ProjectDocumentViewSet(AuditedModelMixin, viewsets.ModelViewSet):
    serializer_class = ProjectDocumentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = ProjectDocument.objects.select_related("project", "task", "created_by", "parent_document")
        team_id = self.request.query_params.get("team_id")
        project_id = self.request.query_params.get("project_id")
        task_id = self.request.query_params.get("task_id")
        if team_id:
            queryset = queryset.filter(project__team_id=team_id)
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        if task_id:
            queryset = queryset.filter(task_id=task_id)
        return queryset

    def perform_create(self, serializer):
        project = serializer.validated_data["project"]
        if not check_project_permission(self.request.user, project, "comment_project"):
            raise permissions.PermissionDenied("Forbidden")
        parent = serializer.validated_data.get("parent_document")
        version = (parent.version + 1) if parent else 1
        serializer.save(created_by=self.request.user, version=version)

    def perform_update(self, serializer):
        project = serializer.instance.project
        if not check_project_permission(self.request.user, project, "edit_project"):
            raise permissions.PermissionDenied("Forbidden")
        serializer.save()

    def perform_destroy(self, instance):
        project = instance.project
        if not check_project_permission(self.request.user, project, "manage_project"):
            raise permissions.PermissionDenied("Forbidden")
        instance.delete()

class NotificationRuleViewSet(AuditedModelMixin, viewsets.ModelViewSet):
    serializer_class = NotificationRuleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = NotificationRule.objects.select_related("project")
        project_id = self.request.query_params.get("project_id")
        team_id = self.request.query_params.get("team_id")
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        if team_id:
            queryset = queryset.filter(project__team_id=team_id)
        return queryset

    def perform_create(self, serializer):
        project = serializer.validated_data["project"]
        if not check_project_permission(self.request.user, project, "manage_project"):
            raise permissions.PermissionDenied("Forbidden")
        serializer.save(created_by=self.request.user)

class IssueTypeFieldDefinitionViewSet(AuditedModelMixin, viewsets.ModelViewSet):
    serializer_class = IssueTypeFieldDefinitionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = IssueTypeFieldDefinition.objects.all()
        project_id = self.request.query_params.get("project_id")
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        return queryset

    def perform_create(self, serializer):
        project = serializer.validated_data["project"]
        if not check_project_permission(self.request.user, project, "manage_project"):
            raise permissions.PermissionDenied("Forbidden")
        serializer.save()

class TaskCustomFieldValueViewSet(AuditedModelMixin, viewsets.ModelViewSet):
    serializer_class = TaskCustomFieldValueSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = TaskCustomFieldValue.objects.select_related("task", "field_definition")
        task_id = self.request.query_params.get("task_id")
        if task_id:
            queryset = queryset.filter(task_id=task_id)
        return queryset

    def perform_create(self, serializer):
        task = serializer.validated_data["task"]
        if not check_project_permission(self.request.user, task.project, "edit_project"):
            raise permissions.PermissionDenied("Forbidden")
        serializer.save()

class AutomationRuleViewSet(AuditedModelMixin, viewsets.ModelViewSet):
    serializer_class = AutomationRuleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = AutomationRule.objects.select_related("project")
        project_id = self.request.query_params.get("project_id")
        team_id = self.request.query_params.get("team_id")
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        if team_id:
            queryset = queryset.filter(project__team_id=team_id)
        return queryset

    def perform_create(self, serializer):
        project = serializer.validated_data["project"]
        if not check_project_permission(self.request.user, project, "manage_project"):
            raise permissions.PermissionDenied("Forbidden")
        serializer.save(created_by=self.request.user)

class ClientPortalAccessViewSet(AuditedModelMixin, viewsets.ModelViewSet):
    serializer_class = ClientPortalAccessSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = ClientPortalAccess.objects.select_related("project")
        project_id = self.request.query_params.get("project_id")
        team_id = self.request.query_params.get("team_id")
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        if team_id:
            queryset = queryset.filter(project__team_id=team_id)
        return queryset

    def perform_create(self, serializer):
        project = serializer.validated_data["project"]
        if not check_project_permission(self.request.user, project, "manage_project"):
            raise permissions.PermissionDenied("Forbidden")
        serializer.save(created_by=self.request.user)

class CommentAttachmentUploadView(generics.CreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, comment_id):
        comment = get_object_or_404(Comment, id=comment_id)
        if not check_project_permission(request.user, comment.task.project, "comment_project"):
            raise permissions.PermissionDenied()
        file = request.FILES.get("file")
        if not file:
            return standardize_response(success=False, error="No file provided", status=400)
        attachment = Attachment.objects.create(
            task=comment.task,
            comment=comment,
            file=file,
            original_filename=file.name,
            file_size=file.size,
            mime_type=file.content_type,
            uploaded_by=request.user,
        )
        return standardize_response(data=AttachmentSerializer(attachment, context={"request": request}).data)

class AttachmentVersionUploadView(generics.CreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, attachment_id):
        attachment = get_object_or_404(Attachment, id=attachment_id)
        if not check_project_permission(request.user, attachment.task.project, "edit_project"):
            raise permissions.PermissionDenied()
        file = request.FILES.get("file")
        if not file:
            return standardize_response(success=False, error="No file provided", status=400)
        latest = attachment.versions.aggregate(latest=Sum("version_number"))["latest"] or 0
        version = AttachmentVersion.objects.create(
            attachment=attachment,
            file=file,
            original_filename=file.name,
            file_size=file.size,
            mime_type=file.content_type,
            uploaded_by=request.user,
            version_number=latest + 1,
        )
        return standardize_response(data=AttachmentVersionSerializer(version).data)

@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def task_pull_requests(request, task_id):
    task = get_object_or_404(Task.objects.select_related("project"), id=task_id)
    if not check_project_permission(request.user, task.project, "view_project"):
        return standardize_response(success=False, error="Forbidden", status=403)
    gh = list(GitHubPullRequest.objects.filter(task=task).order_by("-updated_at"))
    other = list(VcsPullRequest.objects.filter(task=task).order_by("-updated_at"))
    data = GitHubPullRequestSerializer(gh, many=True).data + VcsPullRequestSerializer(other, many=True).data
    # Sort by updated_at descending when present.
    data.sort(key=lambda x: x.get("updated_at") or "", reverse=True)
    return standardize_response(data=data)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def roadmap_overview(request):
    team_id = request.query_params.get("team_id")
    if not team_id:
        return standardize_response(success=False, error="team_id is required", status=400)

    if not request.user.is_superuser and not TeamMember.objects.filter(team_id=team_id, user=request.user).exists():
        return standardize_response(success=False, error="Forbidden", status=403)

    projects = Project.objects.filter(team_id=team_id, status="active").annotate(
        open_tasks=Count("tasks", filter=Q(tasks__column__is_done_column=False, tasks__is_archived=False), distinct=True),
        overdue_tasks=Count("tasks", filter=Q(tasks__column__is_done_column=False, tasks__is_archived=False, tasks__due_date__lt=timezone.now().date()), distinct=True),
        next_due_date=Min("tasks__due_date"),
    )
    milestones = Milestone.objects.filter(project__team_id=team_id).select_related("project")
    links = TaskLink.objects.filter(source_task__project__team_id=team_id).count()

    data = {
        "projects": [
            {
                "id": project.id,
                "name": project.name,
                "color": project.color,
                "icon": project.icon,
                "open_tasks": project.open_tasks,
                "overdue_tasks": project.overdue_tasks,
                "next_due_date": project.next_due_date,
                "forecast": "at_risk" if project.overdue_tasks > 0 else "on_track",
            }
            for project in projects
        ],
        "milestones": MilestoneSerializer(milestones, many=True).data,
        "dependency_count": links,
    }
    return standardize_response(data=data)

@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def workload_overview(request):
    team_id = request.query_params.get("team_id")
    if not team_id:
        return standardize_response(success=False, error="team_id is required", status=400)

    members = TeamMember.objects.filter(team_id=team_id).select_related("user")
    active_sprint_ids = Sprint.objects.filter(project__team_id=team_id, status=Sprint.STATUS_ACTIVE).values_list("id", flat=True)
    rows = []
    for member in members:
        open_tasks = Task.objects.filter(
            project__team_id=team_id,
            assignee=member.user,
            is_archived=False,
            column__is_done_column=False,
        )
        overdue = open_tasks.filter(due_date__lt=timezone.now().date()).count()
        active_sprint_hours = open_tasks.filter(sprint_id__in=active_sprint_ids).aggregate(total=Sum("estimated_hours"))["total"] or 0
        capacity_hours = SprintCapacity.objects.filter(sprint_id__in=active_sprint_ids, user=member.user).aggregate(total=Sum("capacity_hours"))["total"] or 0
        rows.append({
            "user": {
                "id": member.user.id,
                "full_name": member.user.full_name,
                "email": member.user.email,
                "avatar_url": getattr(member.user, "avatar_url", None),
            },
            "role": member.role,
            "open_tasks": open_tasks.count(),
            "overdue_tasks": overdue,
            "planned_hours": float(active_sprint_hours),
            "capacity_hours": float(capacity_hours),
            "imbalance": float(active_sprint_hours) - float(capacity_hours),
            "current_assignments": TaskListSerializer(open_tasks[:5], many=True).data,
        })
    return standardize_response(data=rows)

@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def activity_feed(request):
    team_id = request.query_params.get("team_id")
    project_id = request.query_params.get("project_id")
    task_id = request.query_params.get("task_id")
    actor_id = request.query_params.get("actor_id")
    verb = request.query_params.get("verb")
    queryset = TaskActivity.objects.select_related("task", "task__project", "actor")
    if team_id:
        queryset = queryset.filter(task__project__team_id=team_id)
    if project_id:
        queryset = queryset.filter(task__project_id=project_id)
    if task_id:
        queryset = queryset.filter(task_id=task_id)
    if actor_id:
        queryset = queryset.filter(actor_id=actor_id)
    if verb:
        queryset = queryset.filter(verb=verb)
    data = [
        {
            "id": str(item.id),
            "task_id": str(item.task_id),
            "task_title": item.task.title,
            "project_id": str(item.task.project_id),
            "project_name": item.task.project.name,
            "actor": UserSerializer(item.actor).data if item.actor else None,
            "verb": item.verb,
            "detail": item.detail,
            "created_at": item.created_at,
        }
        for item in queryset.order_by("-created_at")[:200]
    ]
    return standardize_response(data=data)

@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def advanced_reporting(request):
    team_id = request.query_params.get("team_id")
    project_id = request.query_params.get("project_id")
    tasks = Task.objects.filter(is_archived=False)
    if team_id:
        tasks = tasks.filter(project__team_id=team_id)
    if project_id:
        tasks = tasks.filter(project_id=project_id)
    completed = tasks.filter(column__is_done_column=True)
    overdue = tasks.filter(column__is_done_column=False, due_date__lt=timezone.now().date())
    created_count = tasks.count()
    completed_count = completed.count()
    throughput = completed_count
    lead_samples = []
    for task in completed.select_related("project")[:200]:
        lead_samples.append((task.updated_at - task.created_at).days)
    lead_time = round(sum(lead_samples) / len(lead_samples), 1) if lead_samples else 0
    cycle_time = lead_time
    overdue_trend = [
        {
            "date": (timezone.now().date() - timedelta(days=offset)).isoformat(),
            "count": tasks.filter(column__is_done_column=False, due_date__lt=timezone.now().date() - timedelta(days=offset)).count(),
        }
        for offset in range(6, -1, -1)
    ]
    sprint_burndown = [
        {
            "sprint": sprint.name,
            "planned_tasks": sprint.tasks.count(),
            "completed_tasks": sprint.tasks.filter(column__is_done_column=True).count(),
        }
        for sprint in Sprint.objects.filter(project__team_id=team_id)[:20]
    ] if team_id else []
    velocity = [
        {
            "sprint": sprint.name,
            "completed": sprint.tasks.filter(column__is_done_column=True).count(),
            "planned": sprint.tasks.count(),
        }
        for sprint in Sprint.objects.filter(project_id=project_id or None)[:20]
    ] if project_id else []
    return standardize_response(data={
        "lead_time_days": lead_time,
        "cycle_time_days": cycle_time,
        "throughput": throughput,
        "created_count": created_count,
        "completed_count": completed_count,
        "overdue_count": overdue.count(),
        "overdue_trend": overdue_trend,
        "sprint_burndown": sprint_burndown,
        "team_velocity": velocity,
    })

@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def calendar_export(request):
    team_id = request.query_params.get("team_id")
    project_id = request.query_params.get("project_id")
    tasks = Task.objects.filter(is_archived=False, due_date__isnull=False)
    if team_id:
        tasks = tasks.filter(project__team_id=team_id)
    if project_id:
        tasks = tasks.filter(project_id=project_id)
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//FlowTeam//Tasks//EN",
    ]
    for task in tasks[:500]:
        lines.extend([
            "BEGIN:VEVENT",
            f"UID:{task.id}@flowteam",
            f"DTSTAMP:{timezone.now().strftime('%Y%m%dT%H%M%SZ')}",
            f"DTSTART;VALUE=DATE:{task.due_date.strftime('%Y%m%d')}",
            f"SUMMARY:{task.title}",
            f"DESCRIPTION:{(task.description or '').replace(chr(10), ' ')}",
            "END:VEVENT",
        ])
    lines.append("END:VCALENDAR")
    return Response("\r\n".join(lines), content_type="text/calendar")

@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def client_portal_detail(request, token):
    access = get_object_or_404(ClientPortalAccess, token=token, status=ClientPortalAccess.STATUS_ACTIVE)
    documents = ProjectDocument.objects.filter(project=access.project, id__in=access.allowed_document_ids)
    tasks = Task.objects.filter(project=access.project, column__name__in=access.allowed_statuses or [], is_archived=False)
    data = {
        "project": {
            "id": str(access.project_id),
            "name": access.project.name,
            "description": access.project.description,
            "color": access.project.color,
        },
        "documents": ProjectDocumentSerializer(documents, many=True, context={"request": request}).data,
        "tasks": TaskListSerializer(tasks[:200], many=True).data,
    }
    return standardize_response(data=data)
