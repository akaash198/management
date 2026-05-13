from rest_framework import viewsets, status, generics, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import Channel, ChannelMember, Message, Notification, MessageAttachment, MessagePin, MessageSave, MessageEdit, ScheduledMessage, NotificationPreference, Call, CallParticipant
from .serializers import (
    ChannelSerializer,
    MessageSerializer,
    NotificationSerializer,
    CommentSerializer,
    SlimUserSerializer,
    MessagePinSerializer,
    MessageSaveSerializer,
    ChannelReadStateSerializer,
    MessageEditSerializer,
    ScheduledMessageSerializer,
    NotificationPreferenceSerializer,
    CallSerializer,
    CallParticipantSerializer,
)
from apps.projects.models import Task, Comment, TaskWatcher, TaskApproval
from config.utils import standardize_response
from .utils import parse_mentions, create_mention_notifications
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime
from datetime import timedelta
from apps.teams.models import TeamMember
from apps.users.models import User
from apps.teams.models import Team
import hashlib
from django.db import connection
from django.db.models import F


MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024  # 10MB
MAX_ATTACHMENTS_PER_MESSAGE = 5
ALLOWED_ATTACHMENT_TYPES = (
    "image/",
    "application/pdf",
    "text/plain",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
)

class ChannelViewSet(viewsets.ModelViewSet):
    serializer_class = ChannelSerializer

    def _can_manage_team(self, team_id: str) -> bool:
        user = self.request.user
        if user.is_superuser:
            return True
        return TeamMember.objects.filter(
            team_id=team_id,
            user=user,
            role__in=[TeamMember.CEO, TeamMember.ADMIN, TeamMember.MANAGER],
        ).exists()

    def _is_channel_member(self, channel: Channel) -> bool:
        user = self.request.user
        if user.is_superuser:
            return True
        return ChannelMember.objects.filter(channel=channel, user=user).exists()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        team = serializer.validated_data.get("team")
        if not team:
            return standardize_response(success=False, error="team is required", status=status.HTTP_400_BAD_REQUEST)

        if not self._can_manage_team(str(team.id)):
            return standardize_response(success=False, error="Forbidden", status=status.HTTP_403_FORBIDDEN)

        self.perform_create(serializer)
        return standardize_response(data=serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if not self._can_manage_team(str(instance.team_id)):
            return standardize_response(success=False, error="Forbidden", status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if not self._can_manage_team(str(instance.team_id)):
            return standardize_response(success=False, error="Forbidden", status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)

    def get_queryset(self):
        from django.db.models import Count, Prefetch as DbPrefetch
        team_id = self.request.query_params.get("team_id")
        qs = Channel.objects.filter(memberships__user=self.request.user).exclude(name__startswith="mtg-")
        if team_id:
            qs = qs.filter(team_id=team_id)
        return qs.prefetch_related("memberships__user").annotate(
            _member_count=Count("memberships"),
        )

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return standardize_response(data=serializer.data)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return standardize_response(data=serializer.data)

    def perform_create(self, serializer):
        channel = serializer.save(created_by=self.request.user)
        ChannelMember.objects.create(channel=channel, user=self.request.user)
        
        # If private, add other initial members
        member_ids = self.request.data.get("member_ids", [])
        for m_id in member_ids:
            ChannelMember.objects.get_or_create(channel=channel, user_id=m_id)

    @action(detail=True, methods=["GET", "POST"])
    def members(self, request, pk=None):
        channel = self.get_object()
        if not self._is_channel_member(channel):
            return standardize_response(success=False, error="Forbidden", status=status.HTTP_403_FORBIDDEN)

        if request.method == "GET":
            memberships = (
                ChannelMember.objects.filter(channel=channel)
                .select_related("user")
                .order_by("user__full_name")
            )
            users = [m.user for m in memberships]
            return standardize_response(data=SlimUserSerializer(users, many=True).data)

        if not self._can_manage_team(str(channel.team_id)):
            return standardize_response(success=False, error="Forbidden", status=status.HTTP_403_FORBIDDEN)

        member_ids = request.data.get("member_ids", [])
        for m_id in member_ids:
            ChannelMember.objects.get_or_create(channel=channel, user_id=m_id)
        return standardize_response(data={"message": "Members added"})

    @action(detail=True, methods=["DELETE"], url_path="members/(?P<uid>[^/.]+)")
    def remove_member(self, request, pk=None, uid=None):
        channel = self.get_object()
        if not self._can_manage_team(str(channel.team_id)):
            return standardize_response(success=False, error="Forbidden", status=status.HTTP_403_FORBIDDEN)
        ChannelMember.objects.filter(channel=channel, user_id=uid).delete()
        return standardize_response(data={"message": "Member removed"})

    @action(detail=False, methods=["POST"], url_path="direct")
    def direct(self, request):
        """
        Create-or-get a 1:1 direct message channel in a team.

        Body:
          - team_id: UUID
          - user_id: UUID (other participant)
        """
        team_id = request.data.get("team_id") or request.data.get("team")
        other_user_id = request.data.get("user_id") or request.data.get("user")

        if not team_id or not other_user_id:
            return standardize_response(success=False, error="team_id and user_id are required", status=status.HTTP_400_BAD_REQUEST)

        # Must be a team member to create DMs within the team.
        if not request.user.is_superuser and not TeamMember.objects.filter(team_id=team_id, user=request.user).exists():
            return standardize_response(success=False, error="Forbidden", status=status.HTTP_403_FORBIDDEN)

        team = get_object_or_404(Team, id=team_id)
        other_user = get_object_or_404(User, id=other_user_id)

        if not request.user.is_superuser and not TeamMember.objects.filter(team_id=team_id, user=other_user).exists():
            return standardize_response(success=False, error="User is not a member of this team", status=status.HTTP_400_BAD_REQUEST)

        # Stable name based on sorted user ids (hash for length safety).
        ids = sorted([str(request.user.id), str(other_user.id)])
        digest = hashlib.sha1(("|".join(ids)).encode("utf-8")).hexdigest()[:16]
        name = f"dm-{digest}"

        channel, created = Channel.objects.get_or_create(
            team=team,
            name=name,
            defaults={
                "display_name": "Direct message",
                "description": None,
                "is_private": True,
                "created_by": request.user,
            },
        )

        # Ensure memberships exist.
        ChannelMember.objects.get_or_create(channel=channel, user=request.user)
        ChannelMember.objects.get_or_create(channel=channel, user=other_user)

        serializer = self.get_serializer(channel)
        return standardize_response(data=serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    @action(detail=True, methods=["POST"], url_path="mark-read")
    def mark_read(self, request, pk=None):
        channel = self.get_object()
        if not self._is_channel_member(channel):
            return standardize_response(success=False, error="Forbidden", status=status.HTTP_403_FORBIDDEN)
        ChannelMember.objects.filter(channel=channel, user=request.user).update(last_read_at=timezone.now())
        return standardize_response(data={"message": "Marked as read"})

    @action(detail=True, methods=["POST"], url_path="mark-unread")
    def mark_unread(self, request, pk=None):
        """
        Set the caller's last_read_at so that the given message becomes unread.
        """
        channel = self.get_object()
        if not self._is_channel_member(channel):
            return standardize_response(success=False, error="Forbidden", status=status.HTTP_403_FORBIDDEN)

        message_id = request.data.get("message_id")
        if not message_id:
            return standardize_response(success=False, error="message_id is required", status=status.HTTP_400_BAD_REQUEST)

        msg = get_object_or_404(Message, id=message_id, channel=channel)
        last_read_at = msg.created_at - timedelta(microseconds=1)
        ChannelMember.objects.filter(channel=channel, user=request.user).update(last_read_at=last_read_at)
        return standardize_response(data={"message": "Marked as unread"})

    @action(detail=True, methods=["POST"], url_path="mute")
    def mute(self, request, pk=None):
        channel = self.get_object()
        if not self._is_channel_member(channel):
            return standardize_response(success=False, error="Forbidden", status=status.HTTP_403_FORBIDDEN)

        minutes = request.data.get("minutes")
        forever = bool(request.data.get("forever", False))

        if forever:
            until = timezone.now() + timedelta(days=3650)  # ~10 years
        else:
            try:
                minutes_val = int(minutes) if minutes is not None else 60
            except Exception:
                minutes_val = 60
            minutes_val = max(5, min(60 * 24 * 30, minutes_val))
            until = timezone.now() + timedelta(minutes=minutes_val)

        ChannelMember.objects.filter(channel=channel, user=request.user).update(mute_until=until)
        return standardize_response(data={"mute_until": until.isoformat()})

    @action(detail=True, methods=["POST"], url_path="unmute")
    def unmute(self, request, pk=None):
        channel = self.get_object()
        if not self._is_channel_member(channel):
            return standardize_response(success=False, error="Forbidden", status=status.HTTP_403_FORBIDDEN)
        ChannelMember.objects.filter(channel=channel, user=request.user).update(mute_until=None)
        return standardize_response(data={"message": "Unmuted"})

    @action(detail=True, methods=["GET", "POST"], url_path="notification-settings")
    def notification_settings(self, request, pk=None):
        channel = self.get_object()
        if not self._is_channel_member(channel):
            return standardize_response(success=False, error="Forbidden", status=status.HTTP_403_FORBIDDEN)

        membership = ChannelMember.objects.filter(channel=channel, user=request.user).first()
        if not membership:
            return standardize_response(success=False, error="Forbidden", status=status.HTTP_403_FORBIDDEN)

        if request.method == "GET":
            return standardize_response(
                data={
                    "notification_level": membership.notification_level,
                    "notification_keywords": membership.notification_keywords or [],
                }
            )

        level = (request.data.get("notification_level") or ChannelMember.NOTIFY_ALL).strip().lower()
        if level not in {ChannelMember.NOTIFY_ALL, ChannelMember.NOTIFY_MENTIONS, ChannelMember.NOTIFY_MUTE}:
            return standardize_response(success=False, error="Invalid notification_level", status=status.HTTP_400_BAD_REQUEST)

        raw_keywords = request.data.get("notification_keywords", [])
        if isinstance(raw_keywords, str):
            raw_keywords = [k.strip() for k in raw_keywords.split(",")]
        keywords = []
        if isinstance(raw_keywords, list):
            for item in raw_keywords:
                text = str(item or "").strip()
                if not text:
                    continue
                keywords.append(text[:40])
        keywords = keywords[:20]

        membership.notification_level = level
        membership.notification_keywords = keywords
        membership.save(update_fields=["notification_level", "notification_keywords"])
        return standardize_response(data={"notification_level": level, "notification_keywords": keywords})

    def _dispatch_due_scheduled_messages(self, channel: Channel):
        now = timezone.now()
        due = (
            ScheduledMessage.objects.filter(channel=channel, sent_at__isnull=True, send_at__lte=now)
            .select_related("sender", "parent")
            .order_by("send_at")[:100]
        )
        sent_count = 0
        for item in due:
            msg = Message.objects.create(
                channel=channel,
                sender=item.sender,
                text=(item.text or "").strip(),
                parent=item.parent if item.parent and item.parent.channel_id == channel.id else None,
            )
            mentions = parse_mentions(msg.text, channel.team_id)
            if mentions:
                msg.mentions = mentions
                msg.save(update_fields=["mentions"])
                create_mention_notifications(mentions, item.sender, "message", msg.id, msg.text)
            item.sent_at = now
            item.save(update_fields=["sent_at"])
            sent_count += 1
        return sent_count

    @action(detail=True, methods=["GET", "POST"], url_path="scheduled")
    def scheduled(self, request, pk=None):
        channel = self.get_object()
        if not self._is_channel_member(channel):
            return standardize_response(success=False, error="Forbidden", status=status.HTTP_403_FORBIDDEN)

        if request.method == "GET":
            queryset = (
                ScheduledMessage.objects.filter(channel=channel, sender=request.user, sent_at__isnull=True)
                .select_related("sender", "parent")
                .order_by("send_at")
            )
            return standardize_response(data=ScheduledMessageSerializer(queryset, many=True, context={"request": request}).data)

        text = (request.data.get("text") or "").strip()
        send_at_raw = (request.data.get("send_at") or "").strip()
        parent_id = request.data.get("parent_id")
        if not text:
            return standardize_response(success=False, error="text is required", status=status.HTTP_400_BAD_REQUEST)
        if not send_at_raw:
            return standardize_response(success=False, error="send_at is required", status=status.HTTP_400_BAD_REQUEST)

        send_at = parse_datetime(send_at_raw)
        if send_at is None:
            return standardize_response(success=False, error="Invalid send_at", status=status.HTTP_400_BAD_REQUEST)
        if timezone.is_naive(send_at):
            send_at = timezone.make_aware(send_at, timezone.get_current_timezone())
        if send_at <= timezone.now() + timedelta(seconds=5):
            return standardize_response(success=False, error="send_at must be in the future", status=status.HTTP_400_BAD_REQUEST)

        parent = None
        if parent_id:
            parent = Message.objects.filter(id=parent_id, channel=channel).first()

        item = ScheduledMessage.objects.create(
            channel=channel,
            sender=request.user,
            text=text,
            parent=parent,
            send_at=send_at,
        )
        return standardize_response(data=ScheduledMessageSerializer(item, context={"request": request}).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["DELETE"], url_path=r"scheduled/(?P<scheduled_id>[^/.]+)")
    def scheduled_delete(self, request, pk=None, scheduled_id=None):
        channel = self.get_object()
        if not self._is_channel_member(channel):
            return standardize_response(success=False, error="Forbidden", status=status.HTTP_403_FORBIDDEN)
        ScheduledMessage.objects.filter(id=scheduled_id, channel=channel, sender=request.user, sent_at__isnull=True).delete()
        return standardize_response(data={"message": "Scheduled message removed"})

    @action(detail=True, methods=["POST"], url_path="scheduled/dispatch-due")
    def scheduled_dispatch_due(self, request, pk=None):
        channel = self.get_object()
        if not self._is_channel_member(channel):
            return standardize_response(success=False, error="Forbidden", status=status.HTTP_403_FORBIDDEN)
        sent_count = self._dispatch_due_scheduled_messages(channel)
        return standardize_response(data={"sent_count": sent_count})

    @action(detail=True, methods=["POST"], url_path="uploads")
    def uploads(self, request, pk=None):
        channel = self.get_object()
        if not self._is_channel_member(channel):
            return standardize_response(success=False, error="Forbidden", status=status.HTTP_403_FORBIDDEN)

        files = []
        if "files" in request.FILES:
            files = request.FILES.getlist("files")
        elif "file" in request.FILES:
            files = request.FILES.getlist("file")
        if not files:
            return standardize_response(success=False, error="No files uploaded", status=status.HTTP_400_BAD_REQUEST)

        if len(files) > MAX_ATTACHMENTS_PER_MESSAGE:
            return standardize_response(
                success=False,
                error=f"Too many files (max {MAX_ATTACHMENTS_PER_MESSAGE})",
                status=status.HTTP_400_BAD_REQUEST,
            )

        out = []
        for f in files:
            size = getattr(f, "size", 0) or 0
            if size > MAX_ATTACHMENT_SIZE:
                return standardize_response(
                    success=False,
                    error=f"File too large (max {MAX_ATTACHMENT_SIZE // (1024 * 1024)}MB)",
                    status=status.HTTP_400_BAD_REQUEST,
                )

            content_type = getattr(f, "content_type", "") or ""
            allowed = content_type.startswith("image/") or content_type in ALLOWED_ATTACHMENT_TYPES
            if not allowed:
                return standardize_response(
                    success=False,
                    error=f"Unsupported file type: {content_type or 'unknown'}",
                    status=status.HTTP_400_BAD_REQUEST,
                )

            att = MessageAttachment.objects.create(
                channel=channel,
                uploaded_by=request.user,
                file=f,
                filename=getattr(f, "name", "attachment"),
                content_type=content_type,
                size=size,
            )
            url = att.file.url if att.file else ""
            if url:
                if not url.startswith("/"):
                    url = "/" + url
                url = request.build_absolute_uri(url)
            out.append(
                {
                    "id": str(att.id),
                    "url": url,
                    "filename": att.filename,
                    "content_type": att.content_type,
                    "size": att.size,
                    "created_at": att.created_at.isoformat() if att.created_at else None,
                }
            )

        return standardize_response(data=out, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["GET", "POST"], url_path="pins")
    def pins(self, request, pk=None):
        channel = self.get_object()
        if not self._is_channel_member(channel):
            return standardize_response(success=False, error="Forbidden", status=status.HTTP_403_FORBIDDEN)

        if request.method == "GET":
            pins = MessagePin.objects.filter(channel=channel).select_related("message", "pinned_by").order_by("-created_at")
            return standardize_response(data=MessagePinSerializer(pins, many=True, context={"request": request}).data)

        message_id = request.data.get("message_id")
        if not message_id:
            return standardize_response(success=False, error="message_id is required", status=status.HTTP_400_BAD_REQUEST)

        msg = get_object_or_404(Message, id=message_id, channel=channel)
        pin, _created = MessagePin.objects.get_or_create(channel=channel, message=msg, defaults={"pinned_by": request.user})
        if pin.pinned_by_id != request.user.id:
            # Preserve original pin owner but still return pin.
            pass
        return standardize_response(data=MessagePinSerializer(pin, context={"request": request}).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["DELETE"], url_path=r"pins/(?P<message_id>[^/.]+)")
    def unpin(self, request, pk=None, message_id=None):
        channel = self.get_object()
        if not self._is_channel_member(channel):
            return standardize_response(success=False, error="Forbidden", status=status.HTTP_403_FORBIDDEN)
        MessagePin.objects.filter(channel=channel, message_id=message_id).delete()
        return standardize_response(data={"message": "Unpinned"})

    @action(detail=True, methods=["GET"], url_path="read-state")
    def read_state(self, request, pk=None):
        channel = self.get_object()
        if not self._is_channel_member(channel):
            return standardize_response(success=False, error="Forbidden", status=status.HTTP_403_FORBIDDEN)

        memberships = (
            ChannelMember.objects.filter(channel=channel)
            .select_related("user")
            .order_by("user__full_name")
        )
        data = [{"user": m.user, "last_read_at": m.last_read_at} for m in memberships]
        return standardize_response(data=ChannelReadStateSerializer(data, many=True).data)

class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer

    def get_queryset(self):
        channel_id = self.kwargs.get("channel_id")
        before = self.request.query_params.get("before")
        q_raw = (self.request.query_params.get("q") or "").strip()
        sender_id = (self.request.query_params.get("sender_id") or "").strip()
        date_from_raw = (self.request.query_params.get("date_from") or "").strip()
        date_to_raw = (self.request.query_params.get("date_to") or "").strip()

        channel = get_object_or_404(Channel, id=channel_id)
        if not self.request.user.is_superuser and not ChannelMember.objects.filter(
            channel=channel, user=self.request.user
        ).exists():
            return Message.objects.none()
        
        queryset = Message.objects.filter(channel_id=channel_id).order_by("-created_at")

        has_files_filter = False
        has_links_filter = False
        in_channel_filter = ""
        plain_terms: list[str] = []

        for token in q_raw.split():
            token_lower = token.lower()
            if token_lower == "has:files":
                has_files_filter = True
                continue
            if token_lower == "has:links":
                has_links_filter = True
                continue
            if token_lower.startswith("in:"):
                in_channel_filter = token_lower[3:].strip()
                continue
            plain_terms.append(token)

        q = " ".join(plain_terms).strip()

        if in_channel_filter and in_channel_filter not in {channel.name.lower(), channel.display_name.lower()}:
            return Message.objects.none()

        if q:
            if connection.vendor == "postgresql":
                from django.contrib.postgres.search import SearchQuery, SearchRank

                query = SearchQuery(q, search_type="websearch")
                queryset = (
                    queryset.annotate(rank=SearchRank(F("search_vector"), query))
                    .filter(rank__gt=0.0)
                    .order_by("-rank", "-created_at")
                )
            else:
                queryset = queryset.filter(text__icontains=q)

        if has_files_filter:
            queryset = queryset.filter(attachments__isnull=False)

        if has_links_filter:
            queryset = queryset.filter(text__iregex=r"(https?://|www\.)")

        if sender_id:
            queryset = queryset.filter(sender_id=sender_id)

        if date_from_raw:
            parsed_from = parse_datetime(date_from_raw)
            if parsed_from is not None:
                queryset = queryset.filter(created_at__gte=parsed_from)
            else:
                parsed_from_date = parse_date(date_from_raw)
                if parsed_from_date is not None:
                    queryset = queryset.filter(created_at__date__gte=parsed_from_date)

        if date_to_raw:
            parsed_to = parse_datetime(date_to_raw)
            if parsed_to is not None:
                queryset = queryset.filter(created_at__lte=parsed_to)
            else:
                parsed_to_date = parse_date(date_to_raw)
                if parsed_to_date is not None:
                    queryset = queryset.filter(created_at__date__lte=parsed_to_date)
        
        if before:
            try:
                before_msg = Message.objects.get(id=before)
                queryset = queryset.filter(created_at__lt=before_msg.created_at)
            except Message.DoesNotExist:
                pass
                
        # Update last read on fetch
        ChannelMember.objects.filter(channel_id=channel_id, user=self.request.user).update(last_read_at=timezone.now())
        
        return queryset.distinct()[:50]

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return standardize_response(data=serializer.data)

    def perform_create(self, serializer):
        channel = get_object_or_404(Channel, id=self.kwargs["channel_id"])
        if not self.request.user.is_superuser and not ChannelMember.objects.filter(
            channel=channel, user=self.request.user
        ).exists():
            raise permissions.PermissionDenied("Forbidden")
        msg = serializer.save(sender=self.request.user, channel=channel)
        
        mentions = parse_mentions(msg.text, channel.team_id)
        if mentions:
            msg.mentions = mentions
            msg.save()
            create_mention_notifications(mentions, self.request.user, "message", msg.id, msg.text)


class MessageEditHistoryView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = MessageEditSerializer

    def list(self, request, *args, **kwargs):
        channel_id = self.kwargs.get("channel_id")
        message_id = self.kwargs.get("message_id")

        channel = get_object_or_404(Channel, id=channel_id)
        if not request.user.is_superuser and not ChannelMember.objects.filter(channel=channel, user=request.user).exists():
            return standardize_response(success=False, error="Forbidden", status=status.HTTP_403_FORBIDDEN)

        msg = get_object_or_404(Message, id=message_id, channel_id=channel_id)
        qs = MessageEdit.objects.filter(message=msg).select_related("edited_by").order_by("-created_at")
        return standardize_response(data=MessageEditSerializer(qs, many=True).data)

class TaskCommentView(generics.ListCreateAPIView):
    serializer_class = CommentSerializer

    def get_queryset(self):
        return Comment.objects.filter(task_id=self.kwargs["id"]).order_by("-created_at")

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return standardize_response(data=serializer.data)

    def perform_create(self, serializer):
        task = get_object_or_404(Task, id=self.kwargs["id"])
        comment = serializer.save(author=self.request.user, task=task)
        
        mentions = parse_mentions(comment.text, task.column.project.team_id)
        if mentions:
            comment.mentions = mentions
            comment.save()
            create_mention_notifications(mentions, self.request.user, "comment", comment.id, comment.text)

class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer

    def get_queryset(self):
        queryset = Notification.objects.filter(recipient=self.request.user).order_by("-created_at")
        is_read = self.request.query_params.get("is_read")
        if is_read is not None:
            queryset = queryset.filter(is_read=is_read.lower() == "true")
        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return standardize_response(data=serializer.data)

    @action(detail=False, methods=["GET"], url_path="unread-count")
    def unread_count(self, request):
        count = Notification.objects.filter(recipient=request.user, is_read=False).count()
        return standardize_response(data={"count": count})

    @action(detail=False, methods=["POST"], url_path="mark-read")
    def mark_read(self, request):
        ids = request.data.get("ids", [])
        all_read = request.data.get("all", False)
        
        if all_read:
            Notification.objects.filter(recipient=request.user).update(is_read=True)
        else:
            Notification.objects.filter(id__in=ids, recipient=request.user).update(is_read=True)
            
        return standardize_response(data={"message": "Notifications marked as read"})

    @action(detail=False, methods=["GET", "PATCH"], url_path="preferences")
    def preferences(self, request):
        pref, _ = NotificationPreference.objects.get_or_create(user=request.user)
        if request.method == "GET":
            return standardize_response(data=NotificationPreferenceSerializer(pref).data)
        serializer = NotificationPreferenceSerializer(pref, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return standardize_response(data=serializer.data)

    @action(detail=False, methods=["GET"], url_path="digest-preview")
    def digest_preview(self, request):
        overdue = Task.objects.filter(assignee=request.user, is_archived=False, column__is_done_column=False, due_date__lt=timezone.now().date())
        approvals = TaskApproval.objects.filter(project__team__members__user=request.user, status=TaskApproval.STATUS_PENDING).count()
        watching = TaskWatcher.objects.filter(user=request.user).count()
        return standardize_response(data={
            "overdue_tasks": overdue.count(),
            "overdue_items": [{"id": str(task.id), "title": task.title, "project_id": str(task.project_id)} for task in overdue[:20]],
            "pending_approvals": approvals,
            "watching_count": watching,
        })


class SavedMessageViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        channel_id = request.query_params.get("channel_id")
        queryset = MessageSave.objects.filter(user=request.user).select_related("message", "message__channel").order_by("-created_at")
        if channel_id:
            queryset = queryset.filter(message__channel_id=channel_id)
        return standardize_response(data=MessageSaveSerializer(queryset, many=True, context={"request": request}).data)

    def create(self, request):
        message_id = request.data.get("message_id")
        if not message_id:
            return standardize_response(success=False, error="message_id is required", status=status.HTTP_400_BAD_REQUEST)

        msg = get_object_or_404(Message, id=message_id)
        if not request.user.is_superuser and not ChannelMember.objects.filter(channel_id=msg.channel_id, user=request.user).exists():
            return standardize_response(success=False, error="Forbidden", status=status.HTTP_403_FORBIDDEN)

        save, _created = MessageSave.objects.get_or_create(message=msg, user=request.user)
        return standardize_response(data=MessageSaveSerializer(save, context={"request": request}).data, status=status.HTTP_201_CREATED)

    def destroy(self, request, pk=None):
        message_id = pk
        if not message_id:
            return standardize_response(success=False, error="message_id is required", status=status.HTTP_400_BAD_REQUEST)

        qs = MessageSave.objects.filter(user=request.user, message_id=message_id)
        qs.delete()
        return standardize_response(data={"message": "Unsaved"})


class CallViewSet(viewsets.ModelViewSet):
    serializer_class = CallSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Call.objects.filter(channel__memberships__user=self.request.user).distinct()

    def perform_create(self, serializer):
        channel = serializer.validated_data['channel']
        if not ChannelMember.objects.filter(channel=channel, user=self.request.user).exists():
            raise permissions.PermissionDenied("You are not a member of this channel")
        serializer.save(started_by=self.request.user)

    @action(detail=True, methods=['post'])
    def join(self, request, pk=None):
        call = self.get_object()
        if not ChannelMember.objects.filter(channel=call.channel, user=request.user).exists():
            return standardize_response(success=False, error="Forbidden", status=status.HTTP_403_FORBIDDEN)
        
        participant, created = CallParticipant.objects.get_or_create(
            call=call,
            user=request.user,
            defaults={'is_active': True}
        )
        if not created and not participant.is_active:
            participant.is_active = True
            participant.joined_at = timezone.now()
            participant.save()
        
        serializer = CallParticipantSerializer(participant)
        return standardize_response(data=serializer.data)

    @action(detail=True, methods=['post'])
    def leave(self, request, pk=None):
        call = self.get_object()
        participant = get_object_or_404(CallParticipant, call=call, user=request.user, is_active=True)
        participant.is_active = False
        participant.left_at = timezone.now()
        participant.save()
        
        # If no active participants, end the call
        if not call.participants.filter(is_active=True).exists():
            call.is_active = False
            call.ended_at = timezone.now()
            call.save()
        
        return standardize_response(data={"message": "Left call"})

    @action(detail=True, methods=['post'])
    def end(self, request, pk=None):
        call = self.get_object()
        if call.started_by != request.user:
            return standardize_response(success=False, error="Only the call starter can end the call", status=status.HTTP_403_FORBIDDEN)
        
        call.is_active = False
        call.ended_at = timezone.now()
        call.save()
        
        # Mark all participants as left
        call.participants.filter(is_active=True).update(is_active=False, left_at=timezone.now())
        
        return standardize_response(data={"message": "Call ended"})
