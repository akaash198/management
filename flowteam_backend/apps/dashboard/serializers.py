from rest_framework import serializers
from apps.users.serializers import UserSerializer
from apps.projects.models import Project, Task, TaskActivity
from apps.messaging.serializers import SlimUserSerializer
from apps.meetings.models import Meeting

class ProjectProgressSerializer(serializers.ModelSerializer):
    total_tasks = serializers.IntegerField(read_only=True)
    completed_tasks = serializers.IntegerField(read_only=True)
    overdue_count = serializers.IntegerField(read_only=True)
    progress_percent = serializers.SerializerMethodField()
    members = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            "id", "name", "color", "icon", "status", 
            "total_tasks", "completed_tasks", "overdue_count", 
            "progress_percent", "members"
        ]

    def get_progress_percent(self, obj):
        total = getattr(obj, "total_tasks", 0)
        if total == 0: return 0
        completed = getattr(obj, "completed_tasks", 0)
        return round((completed / total) * 100, 1)

    def get_members(self, obj):
        # Return first 4 members
        from apps.teams.models import TeamMember
        members = TeamMember.objects.filter(team=obj.team).select_related("user")[:4]
        return SlimUserSerializer([m.user for m in members], many=True).data

class ActivityItemSerializer(serializers.ModelSerializer):
    actor = SlimUserSerializer(read_only=True)
    task_title = serializers.CharField(source="task.title", read_only=True)
    task_id = serializers.UUIDField(source="task.id", read_only=True)
    project_name = serializers.CharField(source="task.project.name", read_only=True)
    project_id = serializers.UUIDField(source="task.project.id", read_only=True)

    class Meta:
        model = TaskActivity
        fields = ["id", "actor", "verb", "task_title", "task_id", "project_name", "project_id", "detail", "created_at"]

class CalendarTaskSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source="project.name", read_only=True)
    project_color = serializers.CharField(source="project.color", read_only=True)
    assignee = SlimUserSerializer(read_only=True)
    column_name = serializers.CharField(source="column.name", read_only=True)
    is_done = serializers.BooleanField(source="column.is_done_column", read_only=True)
    is_overdue = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            "id", "title", "due_date", "priority", "project_id", 
            "project_name", "project_color", "assignee", 
            "column_name", "is_done", "is_overdue"
        ]

    def get_is_overdue(self, obj):
        from django.utils import timezone
        if obj.column.is_done_column: return False
        if not obj.due_date: return False
        return obj.due_date < timezone.now().date()


class CalendarMeetingSerializer(serializers.ModelSerializer):
    channel_id = serializers.UUIDField(source="channel.id", read_only=True)
    ends_at = serializers.DateTimeField(read_only=True)
    created_by = SlimUserSerializer(read_only=True)

    class Meta:
        model = Meeting
        fields = [
            "id",
            "title",
            "description",
            "call_type",
            "starts_at",
            "ends_at",
            "duration_minutes",
            "status",
            "is_instant",
            "channel_id",
            "created_by",
        ]
