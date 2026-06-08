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


class PortfolioSummarySerializer(serializers.Serializer):
    team_id = serializers.UUIDField()


class ExperimentSummarySerializer(serializers.Serializer):
    task_id = serializers.UUIDField()


class EscalationScanSerializer(serializers.Serializer):
    project_id = serializers.UUIDField()


class ThreadReplyDraftSerializer(serializers.Serializer):
    channel_id = serializers.UUIDField()
    message_id = serializers.UUIDField()
    since_messages = serializers.IntegerField(required=False, min_value=3, max_value=30, default=10)


class ManagerRiskRollupSerializer(serializers.Serializer):
    team_id = serializers.UUIDField()


class ModelCardDraftSerializer(serializers.Serializer):
    task_id = serializers.UUIDField()


class BlockerDetectSerializer(serializers.Serializer):
    sprint_id = serializers.UUIDField()


# ── AI Settings (company admin) ──────────────────────────────────────────────

class AIFeaturePolicySerializer(serializers.Serializer):
    ai_globally_enabled = serializers.BooleanField(required=False)
    feat_daily_briefing = serializers.BooleanField(required=False)
    feat_focus_recommend = serializers.BooleanField(required=False)
    feat_task_description = serializers.BooleanField(required=False)
    feat_task_summarize = serializers.BooleanField(required=False)
    feat_auto_label = serializers.BooleanField(required=False)
    feat_thread_reply_draft = serializers.BooleanField(required=False)
    feat_sprint_plan = serializers.BooleanField(required=False)
    feat_workload_balance = serializers.BooleanField(required=False)
    feat_retrospective = serializers.BooleanField(required=False)
    feat_project_health = serializers.BooleanField(required=False)
    feat_blocker_detect = serializers.BooleanField(required=False)
    feat_escalation_scan = serializers.BooleanField(required=False)
    feat_weekly_report = serializers.BooleanField(required=False)
    feat_channel_summary = serializers.BooleanField(required=False)
    feat_meeting_action_items = serializers.BooleanField(required=False)
    feat_client_report = serializers.BooleanField(required=False)
    feat_build_automation = serializers.BooleanField(required=False)
    feat_portfolio_summary = serializers.BooleanField(required=False)
    feat_generate_tasks = serializers.BooleanField(required=False)
    feat_experiment_summary = serializers.BooleanField(required=False)
    tier_individual = serializers.ChoiceField(choices=["fast", "standard", "premium"], required=False)
    tier_manager = serializers.ChoiceField(choices=["fast", "standard", "premium"], required=False)
    tier_leadership = serializers.ChoiceField(choices=["fast", "standard", "premium"], required=False)
    tier_ds = serializers.ChoiceField(choices=["fast", "standard", "premium"], required=False)
    require_confirm_task_create = serializers.BooleanField(required=False)
    require_confirm_bulk_label = serializers.BooleanField(required=False)
    require_confirm_client_report = serializers.BooleanField(required=False)
    allow_message_content = serializers.BooleanField(required=False)
    allow_document_content = serializers.BooleanField(required=False)
    allow_meeting_transcripts = serializers.BooleanField(required=False)
    log_retention_days = serializers.IntegerField(required=False, min_value=7, max_value=730)
