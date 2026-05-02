import re
from apps.users.models import User
from apps.teams.models import TeamMember
from .models import Notification

def parse_mentions(text: str, team_id: str) -> list[str]:
    """
    Extract @username patterns from text.
    Look up TeamMember by username/email prefix in the given team.
    Return list of matched user UUIDs.
    """
    # Pattern to match @username (assuming username is email prefix)
    pattern = r"@(\w+)"
    matches = re.findall(pattern, text)
    if not matches:
        return []

    # Look up members by email prefix and/or name match.
    user_id_strs: set[str] = set()

    for match in matches:
        match = (match or "").strip()
        if not match:
            continue

        qs = TeamMember.objects.filter(team_id=team_id).filter(
            user__email__istartswith=match
        )
        user_id_strs.update(str(uid) for uid in qs.values_list("user_id", flat=True))

        qs2 = TeamMember.objects.filter(team_id=team_id).filter(
            user__full_name__icontains=match
        )
        user_id_strs.update(str(uid) for uid in qs2.values_list("user_id", flat=True))

    return list(user_id_strs)

def create_mention_notifications(mentions: list[str], actor,
                                  reference_type: str, reference_id: str,
                                  preview_text: str):
    """
    For each mentioned user UUID, create a Notification record.
    Do not notify the actor themselves.
    Trigger send_notification_ws.delay() for each recipient.
    """
    from .tasks import send_notification_ws
    
    for user_id in mentions:
        if str(user_id) == str(actor.id):
            continue
            
        notification = Notification.objects.create(
            recipient_id=user_id,
            type=f"mentioned_{reference_type}",
            title=f"{actor.full_name} mentioned you",
            body=preview_text[:100],
            reference_type=reference_type,
            reference_id=reference_id
        )
        # Delay trigger
        send_notification_ws.delay(str(user_id), str(notification.id))
        try:
            from apps.users.tasks import send_push_async

            send_push_async.delay(
                str(user_id),
                notification.title,
                notification.body,
                notification.action_url or "/dashboard",
            )
        except Exception:
            pass
