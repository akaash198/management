import uuid
from datetime import timedelta

from django.db import models
from django.utils import timezone

from apps.messaging.models import Channel, ChannelMember
from apps.teams.models import Team, TeamMember
from apps.users.models import User


class Meeting(models.Model):
    CALL_AUDIO = "audio"
    CALL_VIDEO = "video"
    CALL_TYPE_CHOICES = (
        (CALL_AUDIO, "Audio"),
        (CALL_VIDEO, "Video"),
    )

    STATUS_SCHEDULED = "scheduled"
    STATUS_ACTIVE = "active"
    STATUS_ENDED = "ended"
    STATUS_CANCELLED = "cancelled"
    STATUS_CHOICES = (
        (STATUS_SCHEDULED, "Scheduled"),
        (STATUS_ACTIVE, "Active"),
        (STATUS_ENDED, "Ended"),
        (STATUS_CANCELLED, "Cancelled"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="meetings")
    title = models.CharField(max_length=140)
    description = models.TextField(blank=True, default="")
    call_type = models.CharField(max_length=10, choices=CALL_TYPE_CHOICES, default=CALL_VIDEO)
    starts_at = models.DateTimeField()
    duration_minutes = models.PositiveIntegerField(default=30)
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default=STATUS_SCHEDULED)
    is_instant = models.BooleanField(default=False)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name="created_meetings")
    channel = models.OneToOneField(Channel, on_delete=models.CASCADE, related_name="meeting")
    attendees = models.ManyToManyField(User, related_name="meetings", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-starts_at", "-created_at"]
        indexes = [
            models.Index(fields=["team", "starts_at"]),
            models.Index(fields=["team", "status"]),
        ]

    def __str__(self) -> str:
        return f"{self.title} ({self.team_id})"

    @property
    def ends_at(self):
        return self.starts_at + timedelta(minutes=int(self.duration_minutes or 0))


class MeetingRecording(models.Model):
    STATUS_UPLOADED = "uploaded"
    STATUS_TRANSCRIBING = "transcribing"
    STATUS_TRANSCRIBED = "transcribed"
    STATUS_FAILED = "failed"
    STATUS_CHOICES = (
        (STATUS_UPLOADED, "Uploaded"),
        (STATUS_TRANSCRIBING, "Transcribing"),
        (STATUS_TRANSCRIBED, "Transcribed"),
        (STATUS_FAILED, "Failed"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    meeting = models.ForeignKey(Meeting, on_delete=models.CASCADE, related_name="recordings")
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="meeting_recordings")

    audio_file = models.FileField(upload_to="meeting_recordings/", null=True, blank=True)
    mime_type = models.CharField(max_length=80, blank=True, default="")
    duration_seconds = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_UPLOADED)
    error = models.TextField(blank=True, default="")

    transcript_text = models.TextField(blank=True, default="")
    action_items = models.JSONField(default=dict, blank=True)
    ai_summary = models.TextField(blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["meeting", "status", "created_at"], name="mtg_rec_status_idx"),
        ]


def create_meeting_channel(*, team: Team, created_by: User, meeting_id: uuid.UUID, title: str) -> Channel:
    # Hide meeting channels from the normal channel list by convention.
    name = f"mtg-{meeting_id.hex[:12]}"
    display_name = title.strip() or "Meeting"
    return Channel.objects.create(
        team=team,
        name=name,
        display_name=display_name[:100],
        description="Meeting channel (auto-created)",
        is_private=True,
        created_by=created_by,
    )


def ensure_channel_membership(*, channel: Channel, user_ids: list[str]):
    for uid in user_ids:
        ChannelMember.objects.get_or_create(channel=channel, user_id=uid)


def ensure_team_membership(*, team: Team, user: User) -> bool:
    return TeamMember.objects.filter(team=team, user=user).exists()
