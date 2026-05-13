from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db.models import Sum
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
from apps.users.serializers import UserSerializer
from apps.teams.models import Team

User = get_user_model()

class LabelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Label
        fields = ("id", "name", "color")

class ColumnSerializer(serializers.ModelSerializer):
    task_count = serializers.IntegerField(source="tasks.count", read_only=True)

    class Meta:
        model = Column
        fields = ("id", "name", "order", "color", "is_done_column", "task_count")

class ProjectListSerializer(serializers.ModelSerializer):
    task_count = serializers.IntegerField(read_only=True)
    completed_task_count = serializers.IntegerField(read_only=True)
    overdue_count = serializers.IntegerField(read_only=True)
    member_count = serializers.IntegerField(read_only=True)
    team_name = serializers.CharField(source="team.name", read_only=True)
    team = serializers.UUIDField(source="team_id", read_only=True)

    class Meta:
        model = Project
        fields = (
            "id",
            "name",
            "description",
            "color",
            "icon",
            "status",
            "team",
            "team_name",
            "task_count",
            "completed_task_count",
            "overdue_count",
            "member_count",
            "created_at",
            "updated_at",
        )

class ProjectDetailSerializer(serializers.ModelSerializer):
    columns = ColumnSerializer(many=True, read_only=True)
    labels = LabelSerializer(many=True, read_only=True)
    team_name = serializers.CharField(source="team.name", read_only=True)
    team = serializers.UUIDField(source="team_id", read_only=True)

    class Meta:
        model = Project
        fields = ("id", "name", "description", "color", "icon", "status", "team", "team_name", "columns", "labels", "created_at")


class ProjectCreateUpdateSerializer(serializers.ModelSerializer):
    team = serializers.PrimaryKeyRelatedField(queryset=Team.objects.all(), required=False, allow_null=True)
    template_id = serializers.UUIDField(required=False, allow_null=True, write_only=True)

    class Meta:
        model = Project
        fields = ("id", "name", "description", "team", "color", "icon", "status", "created_at", "template_id")
        read_only_fields = ("id", "created_at", "status")

    def create(self, validated_data):
        validated_data.pop("template_id", None)
        request = self.context.get("request")
        team = validated_data.get("team")
        if team is None and request is not None:
            team = Team.objects.filter(members__user=request.user).first()
            validated_data["team"] = team
        if validated_data.get("team") is None:
            raise serializers.ValidationError({"team": "Team is required"})
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop("template_id", None)
        return super().update(instance, validated_data)

class SubTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubTask
        fields = ("id", "title", "is_completed", "order")

class AttachmentSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()
    uploaded_by = UserSerializer(read_only=True)
    comment_id = serializers.UUIDField(read_only=True)

    class Meta:
        model = Attachment
        fields = ("id", "url", "original_filename", "file_size", "mime_type", "uploaded_by", "uploaded_at", "comment_id")

    def get_url(self, obj):
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.file.url)
        return obj.file.url

class AttachmentVersionSerializer(serializers.ModelSerializer):
    uploaded_by = UserSerializer(read_only=True)

    class Meta:
        model = AttachmentVersion
        fields = ("id", "original_filename", "file_size", "mime_type", "version_number", "uploaded_by", "uploaded_at")

class TaskActivitySerializer(serializers.ModelSerializer):
    actor = UserSerializer(read_only=True)

    class Meta:
        model = TaskActivity
        fields = ("id", "actor", "verb", "detail", "created_at")

class TaskListSerializer(serializers.ModelSerializer):
    assignee = UserSerializer(read_only=True)
    assignees = UserSerializer(many=True, read_only=True)
    reporter = UserSerializer(read_only=True)
    labels = LabelSerializer(many=True, read_only=True)
    subtasks_count = serializers.IntegerField(source="subtasks.count", read_only=True)
    attachments_count = serializers.IntegerField(source="attachments.count", read_only=True)
    is_overdue = serializers.SerializerMethodField()
    project_name = serializers.CharField(source="project.name", read_only=True)
    project_color = serializers.CharField(source="project.color", read_only=True)
    project_icon = serializers.CharField(source="project.icon", read_only=True)
    project_team_id = serializers.UUIDField(source="project.team_id", read_only=True)
    column_name = serializers.CharField(source="column.name", read_only=True)
    sprint_name = serializers.CharField(source="sprint.name", read_only=True)
    parent_task_id = serializers.UUIDField(read_only=True)
    issue_type = serializers.CharField(read_only=True)
    watchers_count = serializers.IntegerField(source="watchers.count", read_only=True)

    class Meta:
        model = Task
        fields = (
            "id", "title", "description", "project", "project_name", "project_color", "project_icon",
            "project_team_id", "column", "column_name", "reporter", "priority", "due_date",
            "start_date",
            "assignee", "assignees", "labels", "subtasks_count", "attachments_count", "is_overdue", "order",
            "estimated_hours", "created_at", "updated_at", "issue_type", "sprint", "sprint_name",
            "parent_task_id", "watchers_count"
        )

    def get_is_overdue(self, obj):
        from django.utils import timezone
        if obj.due_date and obj.due_date < timezone.now().date():
            # If column is done, it's not overdue
            if not obj.column.is_done_column:
                return True
        return False

class ProjectRoleSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    assigned_by = UserSerializer(read_only=True)
    effective_capabilities = serializers.SerializerMethodField()
    is_active = serializers.SerializerMethodField()

    class Meta:
        model = ProjectRole
        fields = [
            "id", "project", "user", "role", "capabilities",
            "effective_capabilities", "is_active",
            "assigned_by", "assigned_at",
            "valid_from", "valid_until",
        ]
        read_only_fields = ["id", "assigned_by", "assigned_at"]

    def get_effective_capabilities(self, obj):
        return obj.effective_capabilities()

    def get_is_active(self, obj):
        return obj.is_active()

class TimeLogSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    hours_display = serializers.SerializerMethodField()

    class Meta:
        model = TimeLog
        fields = [
            "id",
            "task",
            "user",
            "minutes",
            "hours_display",
            "date",
            "note",
            "is_billable",
            "hourly_rate_cents",
            "billed_invoice",
            "created_at",
        ]

    def get_hours_display(self, obj):
        h = obj.minutes // 60
        m = obj.minutes % 60
        if h > 0: return f"{h}h {m}m"
        return f"{m}m"

class TaskWriteSerializer(serializers.ModelSerializer):
    assignee = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), required=False, allow_null=True
    )
    assignee_ids = serializers.PrimaryKeyRelatedField(
        source="assignees",
        queryset=User.objects.all(),
        many=True,
        required=False,
        allow_empty=True,
        write_only=True,
    )
    project = serializers.PrimaryKeyRelatedField(queryset=Project.objects.all())
    column = serializers.PrimaryKeyRelatedField(queryset=Column.objects.all())
    sprint = serializers.PrimaryKeyRelatedField(queryset=Sprint.objects.all(), required=False, allow_null=True)
    parent_task = serializers.PrimaryKeyRelatedField(queryset=Task.objects.all(), required=False, allow_null=True)
    label_ids = serializers.PrimaryKeyRelatedField(
        source="labels",
        queryset=Label.objects.all(),
        many=True,
        required=False,
        allow_empty=True,
        write_only=True,
    )

    class Meta:
        model = Task
        fields = (
            "id", "title", "description", "project", "column", "assignee", "assignee_ids",
            "priority", "start_date", "due_date", "order", "estimated_hours", "sprint", "parent_task", "issue_type",
            "label_ids"
        )
        read_only_fields = ("id",)

    def validate(self, attrs):
        project = attrs.get("project") or getattr(self.instance, "project", None)
        column = attrs.get("column") or getattr(self.instance, "column", None)
        sprint = attrs.get("sprint") or getattr(self.instance, "sprint", None)
        parent_task = attrs.get("parent_task") or getattr(self.instance, "parent_task", None)
        if project and column and column.project_id != project.id:
            raise serializers.ValidationError({"column": "Column must belong to the selected project"})
        if sprint and project and sprint.project_id != project.id:
            raise serializers.ValidationError({"sprint": "Sprint must belong to the selected project"})
        if parent_task and project and parent_task.project_id != project.id:
            raise serializers.ValidationError({"parent_task": "Parent task must belong to the selected project"})
        return attrs

class TaskDetailSerializer(serializers.ModelSerializer):
    assignee = UserSerializer(read_only=True)
    assignees = UserSerializer(many=True, read_only=True)
    reporter = UserSerializer(read_only=True)
    labels = LabelSerializer(many=True, read_only=True)
    subtasks = SubTaskSerializer(many=True, read_only=True)
    attachments = AttachmentSerializer(many=True, read_only=True)
    activities = TaskActivitySerializer(many=True, read_only=True)
    timelogs = TimeLogSerializer(many=True, read_only=True)
    total_logged_minutes = serializers.SerializerMethodField()
    total_logged_display = serializers.SerializerMethodField()
    project_name = serializers.CharField(source="project.name", read_only=True)
    project_team_id = serializers.UUIDField(source="project.team_id", read_only=True)
    column_name = serializers.CharField(source="column.name", read_only=True)
    is_overdue = serializers.SerializerMethodField()
    sprint_name = serializers.CharField(source="sprint.name", read_only=True)
    parent_task_id = serializers.UUIDField(read_only=True)
    child_tasks_count = serializers.IntegerField(source="child_tasks.count", read_only=True)
    issue_type = serializers.CharField(read_only=True)
    watchers_count = serializers.IntegerField(source="watchers.count", read_only=True)

    class Meta:
        model = Task
        fields = (
            "id", "title", "description", "project", "column", "assignee", "assignees",
            "reporter", "priority", "start_date", "due_date", "order", "labels", 
            "is_archived", "estimated_hours", "created_at", "updated_at",
            "project_name", "project_team_id", "column_name", "is_overdue",
            "issue_type", "sprint", "sprint_name", "parent_task", "parent_task_id", "child_tasks_count",
            "subtasks", "attachments", "activities", "timelogs",
            "total_logged_minutes", "total_logged_display", "watchers_count"
        )

    def get_total_logged_minutes(self, obj):
        return sum(log.minutes for log in obj.timelogs.all())

    def get_total_logged_display(self, obj):
        total = sum(log.minutes for log in obj.timelogs.all())
        h = total // 60
        m = total % 60
        return f"{h}h {m}m"

    def get_is_overdue(self, obj):
        from django.utils import timezone
        if obj.due_date and obj.due_date < timezone.now().date():
            if not obj.column.is_done_column:
                return True
        return False

class SprintCapacitySerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(source="user", queryset=User.objects.all(), write_only=True)

    class Meta:
        model = SprintCapacity
        fields = ("id", "user", "user_id", "capacity_hours", "notes")

class SprintSerializer(serializers.ModelSerializer):
    member_capacities = SprintCapacitySerializer(many=True, read_only=True)
    planned_hours = serializers.SerializerMethodField()
    planned_tasks = serializers.SerializerMethodField()

    class Meta:
        model = Sprint
        fields = (
            "id", "project", "name", "goal", "start_date", "end_date", "capacity_hours",
            "status", "member_capacities", "planned_hours", "planned_tasks", "created_at"
        )

    def get_planned_hours(self, obj):
        total = obj.tasks.aggregate(total=Sum("estimated_hours"))["total"] or 0
        return float(total)

    def get_planned_tasks(self, obj):
        return obj.tasks.count()

class SprintWriteSerializer(serializers.ModelSerializer):
    capacities = SprintCapacitySerializer(many=True, required=False, write_only=True)

    class Meta:
        model = Sprint
        fields = ("id", "project", "name", "goal", "start_date", "end_date", "capacity_hours", "status", "capacities")

class MilestoneSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source="project.name", read_only=True)
    project_color = serializers.CharField(source="project.color", read_only=True)

    class Meta:
        model = Milestone
        fields = ("id", "project", "project_name", "project_color", "name", "description", "due_date", "status", "created_at")

class TaskLinkSerializer(serializers.ModelSerializer):
    source_task_title = serializers.CharField(source="source_task.title", read_only=True)
    target_task_title = serializers.CharField(source="target_task.title", read_only=True)

    class Meta:
        model = TaskLink
        fields = (
            "id", "source_task", "source_task_title", "target_task", "target_task_title",
            "link_type", "created_at"
        )


class GitHubPullRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = GitHubPullRequest
        fields = ("id", "task", "pr_number", "pr_title", "pr_url", "repo", "status", "author", "created_at", "updated_at")


class VcsPullRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = VcsPullRequest
        fields = ("id", "task", "provider", "pr_number", "pr_title", "pr_url", "repo", "status", "author", "created_at", "updated_at")

class SavedIssueViewSerializer(serializers.ModelSerializer):
    class Meta:
        model = SavedIssueView
        fields = ("id", "team", "user", "name", "filters", "is_shared", "created_at")
        read_only_fields = ("id", "user", "created_at")

class ProjectTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectTemplate
        fields = (
            "id", "team", "name", "description", "color", "icon",
            "columns", "labels", "default_issue_types", "default_roles", "created_at"
        )
        read_only_fields = ("id", "created_at")

class RecurringTaskRuleSerializer(serializers.ModelSerializer):
    assignee = UserSerializer(read_only=True)
    assignee_id = serializers.PrimaryKeyRelatedField(source="assignee", queryset=User.objects.all(), allow_null=True, required=False, write_only=True)
    column_name = serializers.CharField(source="column.name", read_only=True)
    project_name = serializers.CharField(source="project.name", read_only=True)

    class Meta:
        model = RecurringTaskRule
        fields = (
            "id", "project", "project_name", "column", "column_name", "assignee", "assignee_id",
            "title", "description", "issue_type", "priority", "frequency", "interval", "next_run_date",
            "is_active", "last_task", "created_at"
        )

class TaskWatcherSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = TaskWatcher
        fields = ("id", "task", "user", "created_at")

class TaskApprovalSerializer(serializers.ModelSerializer):
    requested_by = UserSerializer(read_only=True)
    decided_by = UserSerializer(read_only=True)
    task_title = serializers.CharField(source="task.title", read_only=True)
    project_name = serializers.CharField(source="project.name", read_only=True)

    class Meta:
        model = TaskApproval
        fields = (
            "id", "project", "project_name", "task", "task_title", "title", "description", "target_type",
            "required_role", "status", "requested_by", "decided_by", "decision_note", "created_at", "decided_at"
        )

class ProjectDocumentSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)
    project_name = serializers.CharField(source="project.name", read_only=True)
    task_title = serializers.CharField(source="task.title", read_only=True)
    attachment_url = serializers.SerializerMethodField()
    attachment = serializers.FileField(write_only=True, required=False, allow_null=True)
    category = serializers.ChoiceField(choices=ProjectDocument.CATEGORY_CHOICES, required=False, default=ProjectDocument.CAT_OTHER)

    class Meta:
        model = ProjectDocument
        fields = (
            "id", "project", "project_name", "task", "task_title", "parent_document", "title", "doc_type",
            "content", "category", "attachment", "attachment_url", "version", "created_by", "created_at"
        )

    def get_attachment_url(self, obj):
        if not obj.attachment:
            return ""
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.attachment.url)
        return obj.attachment.url

class NotificationRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationRule
        fields = ("id", "project", "name", "trigger", "filters", "delivery", "is_active", "created_at")

class IssueTypeFieldDefinitionSerializer(serializers.ModelSerializer):
    class Meta:
        model = IssueTypeFieldDefinition
        fields = ("id", "project", "issue_type", "name", "field_type", "is_required", "options", "created_at")

class TaskCustomFieldValueSerializer(serializers.ModelSerializer):
    field_definition = IssueTypeFieldDefinitionSerializer(read_only=True)
    field_definition_id = serializers.PrimaryKeyRelatedField(source="field_definition", queryset=IssueTypeFieldDefinition.objects.all(), write_only=True)

    class Meta:
        model = TaskCustomFieldValue
        fields = ("id", "task", "field_definition", "field_definition_id", "value")

class AutomationRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = AutomationRule
        fields = ("id", "project", "name", "trigger", "conditions", "actions", "is_active", "created_at")

class ClientPortalAccessSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source="project.name", read_only=True)
    portal_url = serializers.SerializerMethodField()

    class Meta:
        model = ClientPortalAccess
        fields = (
            "id", "project", "project_name", "email", "display_name", "allowed_statuses",
            "allowed_document_ids", "status", "portal_url", "created_at"
        )

    def get_portal_url(self, obj):
        return f"/client-portal/{obj.token}/"
