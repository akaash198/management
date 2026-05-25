from rest_framework import serializers

from apps.messaging.serializers import SlimUserSerializer
from apps.meetings.models import Meeting, MeetingRecording


class MeetingSerializer(serializers.ModelSerializer):
    attendees = SlimUserSerializer(many=True, read_only=True)
    created_by = SlimUserSerializer(read_only=True)
    channel_id = serializers.UUIDField(source="channel.id", read_only=True)
    ends_at = serializers.DateTimeField(read_only=True)
    active_call_id = serializers.SerializerMethodField()

    class Meta:
        model = Meeting
        fields = [
            "id",
            "team",
            "title",
            "description",
            "call_type",
            "starts_at",
            "ends_at",
            "duration_minutes",
            "status",
            "is_instant",
            "channel_id",
            "active_call_id",
            "attendees",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "channel_id", "created_by", "created_at", "updated_at", "ends_at", "active_call_id"]

    def get_active_call_id(self, obj: Meeting):
        try:
            call = obj.channel.calls.filter(is_active=True).latest("started_at")
            return str(call.id)
        except Exception:
            return None


class MeetingCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=140)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    call_type = serializers.ChoiceField(choices=[Meeting.CALL_AUDIO, Meeting.CALL_VIDEO], required=False, default=Meeting.CALL_VIDEO)
    starts_at = serializers.DateTimeField()
    duration_minutes = serializers.IntegerField(required=False, min_value=5, max_value=24 * 60, default=30)
    attendee_ids = serializers.ListField(child=serializers.UUIDField(), required=False, default=list)


class MeetingInstantSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=140, required=False, allow_blank=True, default="Instant meeting")
    description = serializers.CharField(required=False, allow_blank=True, default="")
    call_type = serializers.ChoiceField(choices=[Meeting.CALL_AUDIO, Meeting.CALL_VIDEO], required=False, default=Meeting.CALL_VIDEO)
    attendee_ids = serializers.ListField(child=serializers.UUIDField(), required=False, default=list)


class MeetingPatchSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=140, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    call_type = serializers.ChoiceField(choices=[Meeting.CALL_AUDIO, Meeting.CALL_VIDEO], required=False)
    starts_at = serializers.DateTimeField(required=False)
    duration_minutes = serializers.IntegerField(required=False, min_value=5, max_value=24 * 60)
    status = serializers.ChoiceField(choices=[Meeting.STATUS_SCHEDULED, Meeting.STATUS_ACTIVE, Meeting.STATUS_ENDED, Meeting.STATUS_CANCELLED], required=False)
    attendee_ids = serializers.ListField(child=serializers.UUIDField(), required=False)


class MeetingRecordingSerializer(serializers.ModelSerializer):
    class Meta:
        model = MeetingRecording
        fields = [
            "id",
            "meeting",
            "created_by",
            "audio_file",
            "mime_type",
            "duration_seconds",
            "status",
            "error",
            "transcript_text",
            "action_items",
            "ai_summary",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "meeting",
            "created_by",
            "status",
            "error",
            "transcript_text",
            "action_items",
            "ai_summary",
            "created_at",
            "updated_at",
        ]

