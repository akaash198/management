from rest_framework import serializers


class GenerateTasksSerializer(serializers.Serializer):
    team_id = serializers.UUIDField(required=False)
    project_id = serializers.UUIDField(required=False)
    project_name = serializers.CharField(required=False, allow_blank=True)
    description = serializers.CharField(required=False, allow_blank=True)
    goal = serializers.CharField(required=False, allow_blank=True)


class TaskIdSerializer(serializers.Serializer):
    task_id = serializers.UUIDField()


class SprintPlanSerializer(serializers.Serializer):
    sprint_id = serializers.UUIDField()
    capacity_hours = serializers.FloatField(required=False, min_value=0)


class ChannelSummarySerializer(serializers.Serializer):
    channel_id = serializers.UUIDField()
    since_hours = serializers.IntegerField(required=False, min_value=1, max_value=720, default=48)


class ProjectIdSerializer(serializers.Serializer):
    project_id = serializers.UUIDField()


class ProjectReportSerializer(serializers.Serializer):
    project_id = serializers.UUIDField()
    period_days = serializers.IntegerField(required=False, min_value=1, max_value=365, default=7)


class MeetingActionItemsSerializer(serializers.Serializer):
    meeting_id = serializers.UUIDField()
    transcript = serializers.CharField()


class AutomationBuilderSerializer(serializers.Serializer):
    team_id = serializers.UUIDField(required=False)
    project_id = serializers.UUIDField(required=False)
    instruction = serializers.CharField()


class DailyBriefingSerializer(serializers.Serializer):
    team_id = serializers.UUIDField()


class TaskDescriptionSerializer(serializers.Serializer):
    team_id = serializers.UUIDField()
    title = serializers.CharField()
    project_context = serializers.CharField(required=False, allow_blank=True, default="")


class DuplicateDetectSerializer(serializers.Serializer):
    title = serializers.CharField()
    project_id = serializers.UUIDField()


class EstimateSuggestSerializer(serializers.Serializer):
    title = serializers.CharField()
    project_id = serializers.UUIDField()


class SmartReplySerializer(serializers.Serializer):
    channel_id = serializers.UUIDField()
    last_message = serializers.CharField()


class WeeklyReportSerializer(serializers.Serializer):
    project_id = serializers.UUIDField()


class FocusRecommendSerializer(serializers.Serializer):
    team_id = serializers.UUIDField()


class AutoLabelSerializer(serializers.Serializer):
    team_id = serializers.UUIDField()
    title = serializers.CharField(required=False, allow_blank=True, default="")
    description = serializers.CharField(required=False, allow_blank=True, default="")
