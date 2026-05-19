from rest_framework import serializers
from django.db.models import Count, Q
from django.utils import timezone
from .models import Channel, ChannelMember, Message, MessageReaction, Notification, MessageAttachment, MessagePin, MessageSave, MessageEdit, ScheduledMessage, NotificationPreference, Call, CallParticipant
from apps.users.serializers import UserSerializer
from apps.projects.models import Comment
from apps.teams.models import Team

class SlimUserSerializer(serializers.ModelSerializer):
    timezone = serializers.CharField(source="timezone_pref", required=False, read_only=True)

    class Meta:
        model = UserSerializer.Meta.model
        fields = ["id", "full_name", "avatar", "timezone"]

class MessageReactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = MessageReaction
        fields = ["emoji", "user"]

class MessageSerializer(serializers.ModelSerializer):
    sender = SlimUserSerializer(read_only=True)
    deleted_by = SlimUserSerializer(read_only=True)
    reactions = serializers.SerializerMethodField()
    reply_count = serializers.SerializerMethodField()
    parent_id = serializers.UUIDField(source="parent.id", read_only=True, allow_null=True)
    attachments = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            "id", "seq", "client_id", "sender", "text", "mentions", "parent_id",
            "is_edited", "edited_at", "is_deleted", "deleted_by", "is_system", "meta",
            "created_at", "reactions", "reply_count", "attachments"
        ]

    def get_reactions(self, obj):
        # Group reactions by emoji
        user = self.context.get("request").user if self.context.get("request") else None
        reactions = obj.reactions.values("emoji").annotate(count=Count("id"))
        result = []
        for r in reactions:
            reacted_by_me = obj.reactions.filter(emoji=r["emoji"], user=user).exists() if user else False
            result.append({
                "emoji": r["emoji"],
                "count": r["count"],
                "reacted_by_me": reacted_by_me
            })
        return result

    def get_reply_count(self, obj):
        return obj.replies.count()

    def get_attachments(self, obj):
        request = self.context.get("request")
        items = []
        for a in obj.attachments.all().order_by("created_at"):
            url = a.file.url if a.file else ""
            if request and url:
                if not url.startswith("/"):
                    url = "/" + url
                url = request.build_absolute_uri(url)
            items.append(
                {
                    "id": str(a.id),
                    "url": url,
                    "filename": a.filename,
                    "content_type": a.content_type,
                    "size": a.size,
                    "created_at": a.created_at.isoformat() if a.created_at else None,
                }
            )
        return items

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        if instance.is_deleted:
            # Scrub content but keep sender so the UI can show "deleted by X"
            ret["text"] = ""
            ret["mentions"] = []
            ret["attachments"] = []
        return ret

class ChannelSerializer(serializers.ModelSerializer):
    # Allow channel creation via API (write-only team, optional display name).
    team = serializers.PrimaryKeyRelatedField(queryset=Team.objects.all(), write_only=True, required=True)
    display_name = serializers.CharField(required=False, allow_blank=True)
    unread_count = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    is_muted = serializers.SerializerMethodField()
    mute_until = serializers.SerializerMethodField()
    notification_level = serializers.SerializerMethodField()
    notification_keywords = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()
    created_by = SlimUserSerializer(read_only=True)
    dm_other_user_id = serializers.SerializerMethodField()
    dm_other_avatar = serializers.SerializerMethodField()
    active_call_id = serializers.SerializerMethodField()
    active_call_type = serializers.SerializerMethodField()
    active_call_started_by = serializers.SerializerMethodField()

    class Meta:
        model = Channel
        fields = [
            "id",
            "team",
            "name",
            "display_name",
            "description",
            "is_private",
            "unread_count",
            "last_message",
            "is_muted",
            "mute_until",
            "notification_level",
            "notification_keywords",
            "member_count",
            "created_at",
            "created_by",
            "dm_other_user_id",
            "dm_other_avatar",
            "active_call_id",
            "active_call_type",
            "active_call_started_by",
        ]

    def validate(self, attrs):
        # Default display_name to a humanized name if omitted.
        display_name = (attrs.get("display_name") or "").strip()
        name = (attrs.get("name") or "").strip()
        if not display_name and name:
            attrs["display_name"] = name.replace("-", " ").title()
        return attrs

    def get_unread_count(self, obj):
        user = self.context.get("request").user if self.context.get("request") else None
        if not user: return 0
        membership = obj.memberships.filter(user=user).first()
        if not membership: return 0
        if membership.mute_until and membership.mute_until > timezone.now():
            return 0
        return obj.messages.filter(created_at__gt=membership.last_read_at).count()

    def get_last_message(self, obj):
        msg = obj.messages.last()
        if msg:
            return MessageSerializer(msg, context=self.context).data
        return None

    def get_is_muted(self, obj):
        request = self.context.get("request")
        user = request.user if request else None
        if not user:
            return False
        membership = obj.memberships.filter(user=user).first()
        if not membership:
            return False
        return bool(membership.mute_until and membership.mute_until > timezone.now())

    def get_mute_until(self, obj):
        request = self.context.get("request")
        user = request.user if request else None
        if not user:
            return None
        membership = obj.memberships.filter(user=user).first()
        if not membership or not membership.mute_until:
            return None
        return membership.mute_until.isoformat()

    def get_member_count(self, obj):
        return getattr(obj, "_member_count", None) or obj.memberships.count()

    def get_notification_level(self, obj):
        request = self.context.get("request")
        user = request.user if request else None
        if not user:
            return ChannelMember.NOTIFY_ALL
        membership = obj.memberships.filter(user=user).first()
        if not membership:
            return ChannelMember.NOTIFY_ALL
        return membership.notification_level or ChannelMember.NOTIFY_ALL

    def get_notification_keywords(self, obj):
        request = self.context.get("request")
        user = request.user if request else None
        if not user:
            return []
        membership = obj.memberships.filter(user=user).first()
        if not membership:
            return []
        return membership.notification_keywords or []

    def _get_dm_other(self, obj):
        """Return the other user in a 2-member private (DM) channel, or None."""
        request = self.context.get("request")
        user = request.user if request else None
        if not user or not obj.is_private:
            return None
        try:
            memberships = list(obj.memberships.all())
        except Exception:
            memberships = list(ChannelMember.objects.filter(channel=obj).select_related("user"))
        if len(memberships) != 2:
            return None
        return next((m.user for m in memberships if m.user_id != user.id), None)

    def get_dm_other_user_id(self, obj):
        other = self._get_dm_other(obj)
        return str(other.id) if other else None

    def get_dm_other_avatar(self, obj):
        other = self._get_dm_other(obj)
        if not other:
            return None
        request = self.context.get("request")
        avatar_url = other.avatar.url if other.avatar else None
        if avatar_url and request:
            avatar_url = request.build_absolute_uri(avatar_url)
        return avatar_url

    def _get_active_call(self, obj):
        if not hasattr(self, "_active_calls_cache"):
            self._active_calls_cache = {}
        if obj.id not in self._active_calls_cache:
            self._active_calls_cache[obj.id] = obj.calls.filter(is_active=True).order_by('-started_at').first()
        return self._active_calls_cache[obj.id]

    def get_active_call_id(self, obj):
        call = self._get_active_call(obj)
        return str(call.id) if call else None

    def get_active_call_type(self, obj):
        call = self._get_active_call(obj)
        return call.call_type if call else None

    def get_active_call_started_by(self, obj):
        call = self._get_active_call(obj)
        return SlimUserSerializer(call.started_by, context=self.context).data if call and call.started_by else None

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        # For DM channels, override display_name with the other member's name.
        other = self._get_dm_other(instance)
        if other:
            rep["display_name"] = other.full_name
        return rep

class CommentSerializer(serializers.ModelSerializer):
    author = SlimUserSerializer(read_only=True)
    replies = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = ["id", "author", "text", "parent", "mentions", "is_edited", "is_deleted", "created_at", "replies"]

    def get_replies(self, obj):
        if obj.parent is None:
            return CommentSerializer(obj.replies.all(), many=True).data
        return []

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        if instance.is_deleted:
            ret["text"] = "This comment was deleted"
        return ret

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ["id", "type", "title", "body", "reference_type", "reference_id", "action_url", "delivery_channel", "is_read", "created_at"]

class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = [
            "id",
            "email_enabled",
            "due_reminders_enabled",
            "overdue_digest_enabled",
            "watch_notifications_enabled",
            "approval_notifications_enabled",
        ]


class MessagePinSerializer(serializers.ModelSerializer):
    message = MessageSerializer(read_only=True)
    pinned_by = SlimUserSerializer(read_only=True)

    class Meta:
        model = MessagePin
        fields = ["id", "message", "pinned_by", "created_at"]


class MessageSaveSerializer(serializers.ModelSerializer):
    message = MessageSerializer(read_only=True)

    class Meta:
        model = MessageSave
        fields = ["id", "message", "created_at"]


class ChannelReadStateSerializer(serializers.Serializer):
    user = SlimUserSerializer()
    last_read_at = serializers.DateTimeField()


class MessageEditSerializer(serializers.ModelSerializer):
    edited_by = SlimUserSerializer(read_only=True)

    class Meta:
        model = MessageEdit
        fields = ["id", "edited_by", "old_text", "new_text", "created_at"]


class ScheduledMessageSerializer(serializers.ModelSerializer):
    sender = SlimUserSerializer(read_only=True)
    parent_id = serializers.UUIDField(source="parent.id", read_only=True, allow_null=True)

    class Meta:
        model = ScheduledMessage
        fields = ["id", "sender", "text", "parent_id", "send_at", "sent_at", "created_at"]


class CallSerializer(serializers.ModelSerializer):
    started_by = SlimUserSerializer(read_only=True)
    participants = serializers.SerializerMethodField()

    class Meta:
        model = Call
        fields = ["id", "channel", "started_by", "started_at", "ended_at", "is_active", "call_type", "participants"]

    def get_participants(self, obj):
        return CallParticipantSerializer(obj.participants.all(), many=True).data


class CallParticipantSerializer(serializers.ModelSerializer):
    user = SlimUserSerializer(read_only=True)

    class Meta:
        model = CallParticipant
        fields = ["id", "user", "joined_at", "left_at", "is_active"]
