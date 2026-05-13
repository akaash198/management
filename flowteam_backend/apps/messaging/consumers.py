import json
import time
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone
from django.core.cache import cache
from django.db import models
from django.utils.dateparse import parse_datetime
from django.contrib.auth import get_user_model
from .models import (
    Channel,
    ChannelMember,
    Message,
    MessageReaction,
    Notification,
    MessageEdit,
)
from .serializers import MessageSerializer, NotificationSerializer, CallSerializer, CallParticipantSerializer
from .services import create_message_with_seq, get_latest_seq
from apps.core.metrics import ws_events_total
from apps.projects.models import Task, Comment
from apps.teams.models import TeamMember

User = get_user_model()

class ChatConsumer(AsyncWebsocketConsumer):
    MAX_INBOUND_BYTES = 64 * 1024
    RATE_LIMIT_WINDOW_SECONDS = 10
    RATE_LIMIT_EVENTS_PER_WINDOW = 60

    async def connect(self):
        self.channel_id = self.scope["url_route"]["kwargs"]["channel_id"]
        self.group_name = f"chat_{self.channel_id}"
        self._rate_key_prefix = None

        if not self.scope["user"].is_authenticated:
            await self.close(code=4001)
            return

        self.user = self.scope["user"]
        if not await self.is_member(self.user, self.channel_id):
            await self.close(code=4001)
            return
        self._rate_key_prefix = f"ws:chat:{self.channel_id}:user:{self.user.id}"

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        
        # Send history (backwards-compatible: array payload).
        try:
            history, latest_seq = await self.get_history(self.channel_id)
        except Exception:
            history, latest_seq = [], 0
        await self.send(text_data=json.dumps({"type": "history", "data": history}))
        # Newer clients can use this cursor for resumable sync.
        await self.send(text_data=json.dumps({"type": "history.cursor", "data": {"latest_seq": latest_seq}}))
        # Consider the channel read when the user opens/connects to it.
        await self.update_last_read(self.user, self.channel_id)

    async def disconnect(self, close_code):
        if hasattr(self, "user"):
            await self.update_last_read(self.user, self.channel_id)
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        if isinstance(text_data, str) and len(text_data.encode("utf-8")) > self.MAX_INBOUND_BYTES:
            await self.close(code=4009)
            return

        try:
            data = json.loads(text_data)
        except Exception:
            await self.send(
                text_data=json.dumps({"type": "error", "data": {"message": "Invalid JSON"}})
            )
            return

        event_type = data.get("type")
        payload = data.get("data", {})

        try:
            ws_events_total.labels("ChatConsumer", str(event_type or "")).inc()
        except Exception:
            pass

        if not await self._allow_event(event_type):
            await self.send(
                text_data=json.dumps({"type": "error", "data": {"message": "Rate limit exceeded"}})
            )
            await self.close(code=4008)
            return

        if event_type == "message.send":
            client_id = payload.get("client_id")
            msg = await self.create_message(
                payload.get("text"),
                payload.get("parent_id"),
                client_id,
                payload.get("attachment_ids"),
            )
            if msg:
                await self.broadcast("message.new", msg)
                await self.push_channel_unread_events()
                if isinstance(client_id, str) and client_id:
                    await self.send(
                        text_data=json.dumps(
                            {
                                "type": "message.ack",
                                "data": {"client_id": client_id, "message_id": msg.get("id"), "seq": msg.get("seq")},
                            }
                        )
                    )
            
        elif event_type == "message.edit":
            result = await self.edit_message(payload.get("message_id"), payload.get("text"))
            if result:
                await self.broadcast("message.updated", result)
                
        elif event_type == "message.delete":
            result = await self.delete_message(payload.get("message_id"))
            if result:
                await self.broadcast("message.deleted", {"message_id": payload.get("message_id")})
                
        elif event_type == "reaction.add":
            reactions = await self.toggle_reaction(payload.get("message_id"), payload.get("emoji"), True)
            await self.broadcast("reaction.updated", {"message_id": payload.get("message_id"), "reactions": reactions})

        elif event_type == "reaction.remove":
            reactions = await self.toggle_reaction(payload.get("message_id"), payload.get("emoji"), False)
            await self.broadcast("reaction.updated", {"message_id": payload.get("message_id"), "reactions": reactions})

        elif event_type in ["typing.start", "typing.stop"]:
            await self.broadcast("user.typing", {
                "user_id": str(self.user.id),
                "user_name": self.user.full_name,
                "is_typing": event_type == "typing.start"
            })

        elif event_type == "call.start":
            call = await self.start_call(payload.get("call_type", "audio"))
            if call:
                await self.broadcast("call.started", call)
                # Also notify all members via their personal channel event sockets
                # so they ring even if they aren't currently viewing this specific channel.
                recipient_ids = await self.get_channel_member_user_ids_excluding_self()
                for uid in recipient_ids:
                    await self.channel_layer.group_send(
                        f"channels_{uid}",
                        {
                            "type": "call.started",
                            "data": call,
                        },
                    )

        elif event_type == "call.join":
            # join_call with no call_id joins the latest active call in the channel
            participant = await self.join_call(payload.get("call_id"))
            if participant:
                await self.broadcast("call.participant_joined", {
                    **participant,
                    "user_id": str(self.user.id),
                })

        elif event_type == "call.leave":
            result = await self.leave_call(payload.get("call_id"))
            if result:
                await self.broadcast("call.participant_left", result)

        elif event_type == "call.end":
            result = await self.end_call(payload.get("call_id"))
            if result:
                await self.broadcast("call.ended", result)
            duration = payload.get("duration_seconds")
            # Determine if anyone actually joined (connected) or it was unanswered
            was_answered = payload.get("was_answered", False)
            event_name = "call_ended" if was_answered else "call_missed"
            sys_msg = await self.create_system_message(
                event_name,
                payload.get("call_type", "audio"),
                duration=duration if was_answered else None,
            )
            if sys_msg:
                await self.broadcast("message.new", sys_msg)
                await self.push_channel_unread_events()
                if not was_answered:
                    await self.create_missed_call_notifications(payload.get("call_type", "audio"))

        elif event_type == "call.missed":
            # 30s timeout with no answer
            call_id = payload.get("call_id")
            await self.end_call(call_id)
            await self.broadcast("call.ended", {"call_id": call_id})
            sys_msg = await self.create_system_message(
                "call_missed",
                payload.get("call_type", "audio"),
            )
            if sys_msg:
                await self.broadcast("message.new", sys_msg)
                await self.push_channel_unread_events()
                await self.create_missed_call_notifications(payload.get("call_type", "audio"))

        elif event_type == "call.signal":
            # WebRTC signaling: offer, answer, ice_candidate
            await self.broadcast("call.signal", {
                "from_user_id": str(self.user.id),
                "target_user_id": payload.get("target_user_id"),
                "signal_type": payload.get("signal_type"),
                "signal_data": payload.get("signal_data"),
                "call_id": payload.get("call_id")
            })

        elif event_type == "history.sync":
            messages, latest_seq = await self.get_history_delta(
                last_seq=payload.get("last_seq"),
                since=payload.get("since"),
                after_message_id=payload.get("after_message_id"),
                limit=payload.get("limit"),
            )
            await self.send(
                text_data=json.dumps(
                    {"type": "history.sync", "data": {"messages": messages, "latest_seq": latest_seq}}
                )
            )
            # Connecting/syncing implies the user is actively viewing the channel.
            await self.update_last_read(self.user, self.channel_id)

    async def broadcast(self, event_type, data):
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "chat_message",
                "message_type": event_type,
                "data": data
            }
        )

    async def chat_message(self, event):
        # If the user is connected to this channel, treat it as read.
        if event.get("message_type") == "message.new" and hasattr(self, "user"):
            await self.update_last_read(self.user, self.channel_id)
        await self.send(text_data=json.dumps({
            "type": event["message_type"],
            "data": event["data"]
        }))

    @database_sync_to_async
    def is_member(self, user, channel_id):
        return ChannelMember.objects.filter(user=user, channel_id=channel_id).exists()

    @database_sync_to_async
    def get_history(self, channel_id):
        msgs = list(Message.objects.filter(channel_id=channel_id).order_by("-seq")[:30])
        msgs.reverse()
        latest_seq = get_latest_seq(channel_id)
        return MessageSerializer(msgs, many=True).data, int(latest_seq)

    @database_sync_to_async
    def create_message(self, text, parent_id, client_id=None, attachment_ids=None):
        try:
            msg, _created = create_message_with_seq(
                channel_id=self.channel_id,
                sender=self.user,
                text=text,
                parent_id=parent_id,
                client_id=client_id,
                attachment_ids=attachment_ids,
            )
        except Exception:
            return None

        data = MessageSerializer(msg).data
        if isinstance(client_id, str) and client_id:
            data["client_id"] = client_id
        return data

    @database_sync_to_async
    def get_history_delta(self, last_seq=None, since=None, after_message_id=None, limit=None):
        qs = Message.objects.filter(channel_id=self.channel_id).order_by("seq")
        n = 50
        try:
            n = int(limit or n)
        except Exception:
            n = 50
        n = max(1, min(200, n))

        if last_seq is not None:
            try:
                last_seq_int = int(last_seq)
                qs = qs.filter(seq__gt=last_seq_int)
            except Exception:
                pass
        elif isinstance(after_message_id, str) and after_message_id:
            try:
                anchor = Message.objects.get(id=after_message_id, channel_id=self.channel_id)
                qs = qs.filter(seq__gt=anchor.seq)
            except Message.DoesNotExist:
                pass
        elif isinstance(since, str) and since:
            dt = parse_datetime(since)
            if dt is not None:
                qs = qs.filter(created_at__gt=dt)

        latest_seq = get_latest_seq(self.channel_id)
        return MessageSerializer(qs[:n], many=True).data, int(latest_seq)

    async def _allow_event(self, event_type: str | None) -> bool:
        """
        Simple per-connection/user sliding-window limiter to protect WebSocket consumers.
        """
        if not self._rate_key_prefix:
            return True

        # Down-weight chatty signals.
        weight = 1
        if event_type in ("typing.start", "typing.stop", "call.signal"):
            weight = 0.25

        window = int(time.time() // self.RATE_LIMIT_WINDOW_SECONDS)
        key = f"{self._rate_key_prefix}:w:{window}"
        try:
            current = cache.get(key) or 0
            next_value = float(current) + float(weight)
            cache.set(key, next_value, timeout=self.RATE_LIMIT_WINDOW_SECONDS + 2)
            return next_value <= float(self.RATE_LIMIT_EVENTS_PER_WINDOW)
        except Exception:
            # Fail closed — deny event when cache is unavailable to prevent rate limit bypass.
            return False

    @database_sync_to_async
    def edit_message(self, message_id, text):
        try:
            msg = Message.objects.get(id=message_id, sender=self.user)
            next_text = (text or "").strip()
            if msg.text != next_text:
                MessageEdit.objects.create(
                    message=msg,
                    edited_by=self.user,
                    old_text=msg.text,
                    new_text=next_text,
                )
            msg.text = next_text
            msg.is_edited = True
            msg.edited_at = timezone.now()
            msg.save()
            return MessageSerializer(msg).data
        except Message.DoesNotExist:
            return None

    @database_sync_to_async
    def delete_message(self, message_id):
        try:
            msg = Message.objects.get(id=message_id)
            if msg.sender_id == self.user.id or self.user.is_superuser:
                msg.is_deleted = True
                msg.deleted_by = self.user
                msg.save()
                return True

            # Allow team CEO/Admin/Manager to delete messages in their team channels.
            is_team_admin = TeamMember.objects.filter(
                team_id=msg.channel.team_id,
                user_id=self.user.id,
                role__in=[TeamMember.CEO, TeamMember.ADMIN, TeamMember.MANAGER],
            ).exists()
            if is_team_admin:
                msg.is_deleted = True
                msg.deleted_by = self.user
                msg.save()
                return True
            return False
        except Message.DoesNotExist:
            return False

    @database_sync_to_async
    def toggle_reaction(self, message_id, emoji, add):
        if add:
            MessageReaction.objects.get_or_create(message_id=message_id, user=self.user, emoji=emoji)
        else:
            MessageReaction.objects.filter(message_id=message_id, user=self.user, emoji=emoji).delete()
        
        # Return all reactions for this message
        msg = Message.objects.get(id=message_id)
        return MessageSerializer(msg).data["reactions"]

    @database_sync_to_async
    def update_last_read(self, user, channel_id):
        ChannelMember.objects.filter(user=user, channel_id=channel_id).update(last_read_at=timezone.now())

    async def push_channel_unread_events(self):
        """
        Notify all channel members (except the sender) that a new message arrived.
        Frontend uses this to update unread badges in real-time without polling.
        """
        recipient_ids = await self.get_channel_member_user_ids_excluding_self_not_muted()
        for uid in recipient_ids:
            await self.channel_layer.group_send(
                f"channels_{uid}",
                {
                    "type": "channel.unread",
                    "data": {"channel_id": str(self.channel_id), "increment": 1},
                },
            )

    @database_sync_to_async
    def create_system_message(self, event, call_type, duration=None):
        channel = Channel.objects.get(id=self.channel_id)
        if event == "call_missed":
            text = f"📵 Missed {call_type} call"
        else:
            if duration:
                mins, secs = divmod(int(duration), 60)
                dur_str = f"{mins}m {secs}s" if mins else f"{secs}s"
                text = f"📞 {call_type.capitalize()} call ended · {dur_str}"
            else:
                text = f"📞 {call_type.capitalize()} call ended"
        msg = Message.objects.create(
            channel=channel,
            sender=self.user,
            text=text,
            is_system=True,
            meta={"event": event, "call_type": call_type, "duration": duration},
        )
        return MessageSerializer(msg).data

    @database_sync_to_async
    def get_channel_member_user_ids_excluding_self_not_muted(self):
        now = timezone.now()
        return list(
            ChannelMember.objects.filter(channel_id=self.channel_id)
            .exclude(user_id=self.user.id)
            .filter(models.Q(mute_until__isnull=True) | models.Q(mute_until__lt=now))
            .values_list("user_id", flat=True)
        )

    @database_sync_to_async
    def get_channel_member_user_ids_excluding_self(self):
        return list(
            ChannelMember.objects.filter(channel_id=self.channel_id)
            .exclude(user_id=self.user.id)
            .values_list("user_id", flat=True)
        )

    @database_sync_to_async
    def create_missed_call_notifications(self, call_type):
        from .models import Notification
        from .tasks import send_notification_ws
        recipient_ids = ChannelMember.objects.filter(channel_id=self.channel_id).exclude(user_id=self.user.id).values_list("user_id", flat=True)
        for user_id in recipient_ids:
            notification = Notification.objects.create(
                recipient_id=user_id,
                type=f"missed_call",
                title=f"Missed {call_type} call",
                body=f"Missed a {call_type} call from {self.user.full_name}",
                reference_type="channel",
                reference_id=str(self.channel_id)
            )
            send_notification_ws.delay(str(user_id), str(notification.id))
            try:
                from apps.users.tasks import send_push_async
                send_push_async.delay(
                    str(user_id),
                    notification.title,
                    notification.body,
                    f"/messages?channel={self.channel_id}"
                )
            except Exception:
                pass

    @database_sync_to_async
    def start_call(self, call_type):
        from .models import Call, CallParticipant
        channel = Channel.objects.get(id=self.channel_id)
        call = Call.objects.create(channel=channel, started_by=self.user, call_type=call_type)
        CallParticipant.objects.create(call=call, user=self.user)
        return CallSerializer(call).data

    @database_sync_to_async
    def join_call(self, call_id):
        from .models import CallParticipant
        try:
            if call_id:
                call = Call.objects.get(id=call_id, channel_id=self.channel_id, is_active=True)
            else:
                call = Call.objects.filter(channel_id=self.channel_id, is_active=True).latest('started_at')
            participant, created = CallParticipant.objects.get_or_create(
                call=call,
                user=self.user,
                defaults={'is_active': True}
            )
            if not created and not participant.is_active:
                participant.is_active = True
                participant.joined_at = timezone.now()
                participant.save()
            return CallParticipantSerializer(participant).data
        except Call.DoesNotExist:
            return None

    @database_sync_to_async
    def leave_call(self, call_id):
        from .models import CallParticipant
        try:
            participant = CallParticipant.objects.get(call_id=call_id, user=self.user, is_active=True)
            participant.is_active = False
            participant.left_at = timezone.now()
            participant.save()
            
            # Check if call should end
            call = participant.call
            if not call.participants.filter(is_active=True).exists():
                call.is_active = False
                call.ended_at = timezone.now()
                call.save()
            
            return {"call_id": call_id, "user_id": str(self.user.id)}
        except CallParticipant.DoesNotExist:
            return None

    @database_sync_to_async
    def end_call(self, call_id):
        from .models import Call
        try:
            # Race conditions can occur where the caller hangs up before the
            # `call.start` was processed and the `started_by` field isn't set
            # on the stored Call yet. Try to find an active call by id/channel
            # first without requiring `started_by`, falling back to the
            # previous behaviour when appropriate.
            if not call_id:
                call = Call.objects.filter(channel_id=self.channel_id, is_active=True).latest('started_at')
            else:
                try:
                    call = Call.objects.get(id=call_id, channel_id=self.channel_id, is_active=True)
                except Call.DoesNotExist:
                    # Fallback to the stricter lookup for compatibility
                    call = Call.objects.get(id=call_id, channel_id=self.channel_id, started_by=self.user, is_active=True)
            call.is_active = False
            call.ended_at = timezone.now()
            call.save()
            call.participants.filter(is_active=True).update(is_active=False, left_at=timezone.now())
            return {"call_id": str(call.id)}
        except Call.DoesNotExist:
            return None
        except Exception:
            # Unexpected errors should not crash the consumer; surface None
            return None


class ChannelEventsConsumer(AsyncWebsocketConsumer):
    """
    Per-user socket used for lightweight channel events (e.g., unread badge increments).
    """

    async def connect(self):
        if not self.scope["user"].is_authenticated:
            await self.close(code=4001)
            return

        self.user = self.scope["user"]
        self.user_id = str(self.user.id)
        self.group_name = f"channels_{self.user_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def channel_unread(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "type": "channel.unread",
                    "data": event.get("data", {}),
                }
            )
        )

    async def call_started(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "type": "call.started",
                    "data": event.get("data", {}),
                }
            )
        )

    async def call_ended(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "type": "call.ended",
                    "data": event.get("data", {}),
                }
            )
        )

    async def call_missed(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "type": "call.missed",
                    "data": event.get("data", {}),
                }
            )
        )


class TeamPresenceConsumer(AsyncWebsocketConsumer):
    """
    Per-team presence socket used to show online indicators (green dot).

    Events:
      - presence.snapshot: { online_user_ids: string[] }
      - presence.update: { user_id: string, online: boolean }
    """

    async def connect(self):
        self.team_id = str(self.scope["url_route"]["kwargs"]["team_id"])

        if not self.scope["user"].is_authenticated:
            await self.close(code=4001)
            return

        self.user = self.scope["user"]
        if not await self.can_join_team(self.user.id, self.team_id):
            await self.close(code=4001)
            return

        self.user_id = str(self.user.id)
        self.group_name = f"presence_{self.team_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        # Mark online and broadcast to others.
        online_now = await self.presence_increment(self.team_id, self.user_id)
        await self.send_snapshot()
        if online_now:
            await self.channel_layer.group_send(
                self.group_name,
                {"type": "presence.update", "data": {"user_id": self.user_id, "online": True}},
            )

    async def disconnect(self, close_code):
        try:
            if hasattr(self, "group_name"):
                await self.channel_layer.group_discard(self.group_name, self.channel_name)

            if hasattr(self, "team_id") and hasattr(self, "user_id"):
                offline_now = await self.presence_decrement(self.team_id, self.user_id)
                if offline_now and hasattr(self, "group_name"):
                    await self.channel_layer.group_send(
                        self.group_name,
                        {"type": "presence.update", "data": {"user_id": self.user_id, "online": False}},
                    )
        except Exception:
            # best-effort; don't raise during disconnect
            pass

    async def presence_update(self, event):
        await self.send(text_data=json.dumps({"type": "presence.update", "data": event.get("data", {})}))

    async def send_snapshot(self):
        online_user_ids = await self.presence_snapshot(self.team_id)
        await self.send(text_data=json.dumps({"type": "presence.snapshot", "data": {"online_user_ids": online_user_ids}}))

    @database_sync_to_async
    def can_join_team(self, user_id: str, team_id: str) -> bool:
        try:
            user = User.objects.get(id=user_id)
            if user.is_superuser:
                return True
        except Exception:
            return False
        return TeamMember.objects.filter(team_id=team_id, user_id=user_id).exists()

    @database_sync_to_async
    def presence_snapshot(self, team_id: str) -> list[str]:
        key = f"presence:team:{team_id}"
        data = cache.get(key) or {}
        # data is { user_id: count }
        return [uid for uid, count in data.items() if isinstance(count, int) and count > 0]

    @database_sync_to_async
    def presence_increment(self, team_id: str, user_id: str) -> bool:
        """
        Returns True if the user transitioned from offline -> online for this team.
        """
        key = f"presence:team:{team_id}"
        for _ in range(4):
            data = cache.get(key) or {}
            prev = int(data.get(user_id) or 0)
            data[user_id] = prev + 1
            cache.set(key, data, timeout=60 * 60)
            return prev == 0
        return False

    @database_sync_to_async
    def presence_decrement(self, team_id: str, user_id: str) -> bool:
        """
        Returns True if the user transitioned from online -> offline for this team.
        """
        key = f"presence:team:{team_id}"
        data = cache.get(key) or {}
        prev = int(data.get(user_id) or 0)
        next_count = max(0, prev - 1)
        if next_count == 0:
            data.pop(user_id, None)
        else:
            data[user_id] = next_count
        cache.set(key, data, timeout=60 * 60)
        return prev > 0 and next_count == 0

class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        if not self.scope["user"].is_authenticated:
            await self.close(code=4001)
            return

        self.user_id = str(self.scope["user"].id)
        self.group_name = f"notifications_{self.user_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        if data.get("type") == "notifications.mark_read":
            ids = data.get("data", {}).get("notification_ids", [])
            count = await self.mark_notifications_read(ids)
            await self.send(text_data=json.dumps({
                "type": "notifications.unread_count",
                "data": {"count": count}
            }))

    async def notification_push(self, event):
        await self.send(text_data=json.dumps({
            "type": "notification.new",
            "data": event["data"]
        }))

    @database_sync_to_async
    def mark_notifications_read(self, ids):
        Notification.objects.filter(id__in=ids, recipient_id=self.user_id).update(is_read=True)
        return Notification.objects.filter(recipient_id=self.user_id, is_read=False).count()
