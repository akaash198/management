import uuid
from django.db import models
from django.utils import timezone
from django.contrib.postgres.search import SearchVectorField
from django.contrib.postgres.indexes import GinIndex
from apps.users.models import User
from apps.teams.models import Team

class Channel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="channels")
    name = models.SlugField(max_length=100)
    display_name = models.CharField(max_length=100)
    description = models.TextField(null=True, blank=True)
    is_private = models.BooleanField(default=False)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("team", "name")

    def __str__(self):
        return f"#{self.name} ({self.team.name})"

class ChannelMember(models.Model):
    NOTIFY_ALL = "all"
    NOTIFY_MENTIONS = "mentions"
    NOTIFY_MUTE = "mute"
    NOTIFY_CHOICES = (
        (NOTIFY_ALL, "All Messages"),
        (NOTIFY_MENTIONS, "Mentions Only"),
        (NOTIFY_MUTE, "Muted"),
    )

    channel = models.ForeignKey(Channel, on_delete=models.CASCADE, related_name="memberships")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="channel_memberships")
    last_read_at = models.DateTimeField(default=timezone.now)
    mute_until = models.DateTimeField(null=True, blank=True)
    notification_level = models.CharField(max_length=16, choices=NOTIFY_CHOICES, default=NOTIFY_ALL)
    notification_keywords = models.JSONField(default=list, blank=True)

    class Meta:
        unique_together = ("channel", "user")

class Message(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    channel = models.ForeignKey(Channel, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name="messages")
    # Client-generated id for idempotent sends (optimistic UI). Unique per (channel, sender, client_id).
    client_id = models.CharField(max_length=64, null=True, blank=True)
    # Server-assigned, per-channel strictly increasing sequence number for resumable delivery.
    seq = models.BigIntegerField(null=True, blank=True)
    text = models.TextField()
    mentions = models.JSONField(default=list, blank=True)
    parent = models.ForeignKey("self", on_delete=models.CASCADE, null=True, blank=True, related_name="replies")
    is_edited = models.BooleanField(default=False)
    edited_at = models.DateTimeField(null=True, blank=True)
    is_deleted = models.BooleanField(default=False)
    deleted_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="deleted_messages"
    )
    is_system = models.BooleanField(default=False)
    meta = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    search_vector = SearchVectorField(null=True)

    class Meta:
        ordering = ["created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["channel", "sender", "client_id"],
                name="uniq_message_client_id_per_sender_channel",
            )
            ,
            models.UniqueConstraint(
                fields=["channel", "seq"],
                name="uniq_message_seq_per_channel",
            ),
        ]
        indexes = [
            models.Index(fields=["channel", "created_at"]),
            models.Index(fields=["channel", "seq"]),
            GinIndex(fields=["search_vector"], name="msg_search_gin"),
        ]


class ChannelMessageSequence(models.Model):
    """
    Per-channel cursor for allocating strictly increasing message sequence numbers.
    """

    channel = models.OneToOneField(Channel, on_delete=models.CASCADE, related_name="message_sequence")
    next_seq = models.BigIntegerField(default=1)
    updated_at = models.DateTimeField(auto_now=True)

class MessageEdit(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name="edits")
    edited_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name="message_edits")
    old_text = models.TextField()
    new_text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

class MessageReaction(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name="reactions")
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    emoji = models.CharField(max_length=10)

    class Meta:
        unique_together = ("message", "user", "emoji")


class MessageAttachment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    channel = models.ForeignKey(Channel, on_delete=models.CASCADE, related_name="attachments")
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name="attachments", null=True, blank=True)
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name="uploaded_attachments")
    file = models.FileField(upload_to="messaging/%Y/%m/%d/")
    filename = models.CharField(max_length=255)
    content_type = models.CharField(max_length=120)
    size = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)


class MessagePin(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    channel = models.ForeignKey(Channel, on_delete=models.CASCADE, related_name="pins")
    message = models.OneToOneField(Message, on_delete=models.CASCADE, related_name="pin")
    pinned_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name="pinned_messages")
    created_at = models.DateTimeField(auto_now_add=True)


class MessageSave(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name="saves")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="saved_messages")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("message", "user")


class ScheduledMessage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    channel = models.ForeignKey(Channel, on_delete=models.CASCADE, related_name="scheduled_messages")
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name="scheduled_messages")
    text = models.TextField()
    parent = models.ForeignKey("Message", on_delete=models.SET_NULL, null=True, blank=True, related_name="scheduled_replies")
    send_at = models.DateTimeField()
    sent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["send_at"]

class Notification(models.Model):
    TYPES = (
        ("task_assigned", "Task Assigned"),
        ("task_due", "Task Due"),
        ("task_overdue", "Task Overdue"),
        ("task_watched", "Task Watched"),
        ("approval_requested", "Approval Requested"),
        ("approval_decided", "Approval Decided"),
        ("automation_notice", "Automation Notice"),
        ("mentioned_message", "Mentioned in Message"),
        ("mentioned_comment", "Mentioned in Comment"),
        ("task_moved", "Task Moved"),
        ("task_completed", "Task Completed"),
        ("invite_accepted", "Invite Accepted"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")
    type = models.CharField(max_length=30, choices=TYPES)
    title = models.CharField(max_length=255)
    body = models.CharField(max_length=500)
    reference_type = models.CharField(max_length=20) # task | message | comment | invite
    reference_id = models.UUIDField()
    action_url = models.CharField(max_length=300, blank=True, default="")
    delivery_channel = models.CharField(max_length=20, default="in_app")
    is_read = models.BooleanField(default=False)
    digest_sent = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["recipient", "is_read", "created_at"]),
        ]

class NotificationPreference(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="notification_preference")
    email_enabled = models.BooleanField(default=False)
    due_reminders_enabled = models.BooleanField(default=True)
    overdue_digest_enabled = models.BooleanField(default=True)
    watch_notifications_enabled = models.BooleanField(default=True)
    approval_notifications_enabled = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)


class Call(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    channel = models.ForeignKey(Channel, on_delete=models.CASCADE, related_name="calls")
    started_by = models.ForeignKey(User, on_delete=models.CASCADE)
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["-started_at"]


class CallParticipant(models.Model):
    call = models.ForeignKey(Call, on_delete=models.CASCADE, related_name="participants")
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    joined_at = models.DateTimeField(auto_now_add=True)
    left_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ("call", "user")
