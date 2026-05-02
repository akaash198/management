from __future__ import annotations

from django.db import IntegrityError, transaction
from django.db.models import Max

from apps.messaging.models import (
    Channel,
    ChannelMessageSequence,
    Message,
    MessageAttachment,
)
from apps.integrations.models import OutboxEvent, SlackWebhook


def get_latest_seq(channel_id) -> int:
    latest = Message.objects.filter(channel_id=channel_id).aggregate(Max("seq")).get("seq__max") or 0
    return int(latest)


def get_messages_after_seq(channel_id, last_seq: int, limit: int = 50):
    limit = max(1, min(200, int(limit or 50)))
    return list(
        Message.objects.filter(channel_id=channel_id, seq__gt=int(last_seq))
        .order_by("seq")
        .select_related("sender", "deleted_by")
        [:limit]
    )


def create_message_with_seq(
    *,
    channel_id,
    sender,
    text: str | None,
    parent_id=None,
    client_id: str | None = None,
    attachment_ids: list[str] | None = None,
) -> tuple[Message, bool]:
    """
    Creates (or returns existing) message with:
    - idempotency: (channel, sender, client_id)
    - strict per-channel seq allocation
    """
    from .utils import parse_mentions, create_mention_notifications

    channel = Channel.objects.get(id=channel_id)
    parent = None
    if parent_id:
        parent = Message.objects.filter(id=parent_id, channel_id=channel_id).first()

    clean_text = (text or "").strip()
    attachment_ids = attachment_ids or []
    if not isinstance(attachment_ids, list):
        attachment_ids = []

    if not clean_text and not attachment_ids:
        raise ValueError("Message must have text or attachments")

    if isinstance(client_id, str) and client_id:
        existing = Message.objects.filter(channel=channel, sender=sender, client_id=client_id).first()
        if existing:
            return existing, False

    try:
        with transaction.atomic():
            seq_row, _ = ChannelMessageSequence.objects.select_for_update().get_or_create(channel=channel)
            seq = int(seq_row.next_seq or 1)
            seq_row.next_seq = seq + 1
            seq_row.save(update_fields=["next_seq", "updated_at"])

            msg = Message.objects.create(
                channel=channel,
                sender=sender,
                client_id=client_id if isinstance(client_id, str) and client_id else None,
                seq=seq,
                text=clean_text,
                parent=parent,
            )
    except IntegrityError:
        # Most likely a retry with the same client_id raced with the first send.
        msg = Message.objects.get(channel=channel, sender=sender, client_id=client_id)
        return msg, False

    if attachment_ids:
        attach_qs = MessageAttachment.objects.filter(
            id__in=attachment_ids,
            channel_id=channel_id,
            uploaded_by=sender,
            message__isnull=True,
        ).order_by("created_at")
        attach_ids = list(attach_qs.values_list("id", flat=True)[:5])
        if attach_ids:
            MessageAttachment.objects.filter(id__in=attach_ids).update(message=msg)

    mentions = parse_mentions(clean_text, channel.team_id)
    if mentions:
        msg.mentions = mentions
        msg.save(update_fields=["mentions"])
        create_mention_notifications(mentions, sender, "message", msg.id, clean_text)

    try:
        enqueue_slack_message_event(team_id=channel.team_id, channel_id=channel.id, message=msg)
    except Exception:
        # best-effort; outbox will retry delivery but enqueue should not break message creation
        pass

    return msg, True


def enqueue_slack_message_event(*, team_id, channel_id, message: Message) -> None:
    """
    Enqueue a Slack event if at least one webhook exists for the team.
    """
    if not SlackWebhook.objects.filter(team_id=team_id, enabled=True).exists():
        return

    OutboxEvent.objects.create(
        team_id=team_id,
        destination=OutboxEvent.DEST_SLACK,
        event_type="message.new",
        payload={
            "text": f"[FlowTeam] New message in channel {channel_id}: {message.text[:500]}",
            "flowteam": {
                "channel_id": str(channel_id),
                "message_id": str(message.id),
                "seq": int(message.seq or 0),
                "sender_id": str(message.sender_id),
            },
        },
    )
