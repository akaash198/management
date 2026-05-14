from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from .models import Notification
from .serializers import NotificationSerializer
from apps.projects.models import Task
from django.conf import settings
from apps.core.email import send_transactional_email
import logging

logger = logging.getLogger(__name__)

@shared_task
def send_notification_ws(recipient_id, notification_id):
    try:
        notification = Notification.objects.get(id=notification_id)
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"notifications_{recipient_id}",
            {
                "type": "notification.push",
                "data": NotificationSerializer(notification).data
            }
        )
    except Notification.DoesNotExist:
        pass

@shared_task
def send_daily_digest():
    last_24h = timezone.now() - timedelta(days=1)
    unread = Notification.objects.filter(is_read=False, digest_sent=False, created_at__gte=last_24h)
    
    # Group by recipient
    recipients = unread.values_list("recipient_id", flat=True).distinct()
    
    for r_id in recipients:
        user_notifications = unread.filter(recipient_id=r_id).select_related("recipient")
        count = user_notifications.count()
        if count <= 0:
            continue

        recipient = user_notifications[0].recipient
        pref = getattr(recipient, "notification_preference", None)
        if not pref or not pref.email_enabled:
            continue

        lines = [f"You have {count} unread notifications in FlowTeam (last 24h):", ""]
        for n in user_notifications[:20]:
            lines.append(f"- {n.title}: {n.body}")
        if count > 20:
            lines.append(f"...and {count - 20} more.")

        base = (getattr(settings, "FRONTEND_BASE_URL", "") or "").rstrip("/") or "http://localhost:3000"
        lines += ["", f"Open FlowTeam: {base}/dashboard", f"Notifications: {base}/dashboard"]

        result = send_transactional_email(to_email=recipient.email, subject="FlowTeam daily digest", text="\n".join(lines))
        if result.ok:
            user_notifications.update(digest_sent=True)
            logger.info(
                "Daily digest email sent",
                extra={"recipient_id": str(r_id), "count": count, "provider": result.provider},
            )
        else:
            logger.warning(
                "Failed to send daily digest email",
                extra={"recipient_id": str(r_id), "count": count, "provider": result.provider, "error": result.error},
            )

@shared_task
def send_task_due_reminders():
    tomorrow = (timezone.now() + timedelta(days=1)).date()
    # Find tasks due tomorrow that are not done
    due_tasks = Task.objects.filter(
        due_date=tomorrow,
        assignee__isnull=False
    ).exclude(column__is_done_column=True)
    
    for task in due_tasks:
        notification = Notification.objects.create(
            recipient=task.assignee,
            type="task_due",
            title="Task due tomorrow",
            body=f"Task '{task.title}' is due on {tomorrow}",
            reference_type="task",
            reference_id=task.id
        )
        send_notification_ws.delay(str(task.assignee.id), str(notification.id))
        try:
            from apps.users.tasks import send_push_async

            send_push_async.delay(
                str(task.assignee.id),
                notification.title,
                notification.body,
                notification.action_url or f"/projects/{task.project_id}?task={task.id}",
            )
        except Exception:
            pass

@shared_task
def notify_offline_users(channel_id, message_id, sender_id):
    """
    Check if channel members are offline and notify them about a new message.
    """
    from .models import Message, ChannelMember
    from .utils import is_user_online
    
    try:
        msg = Message.objects.get(id=message_id)
        # Get members who are NOT the sender
        members = ChannelMember.objects.filter(channel_id=channel_id).exclude(user_id=sender_id).select_related("user")
        
        for member in members:
            # Skip if user is online
            if is_user_online(str(member.user_id)):
                continue
                
            # Skip if user has muted the channel
            if member.notification_level == ChannelMember.NOTIFY_MUTE:
                continue
                
            # Only notify if they haven't been notified for this channel in the last 15 minutes
            # to avoid spamming.
            cache_key = f"notified:offline:{member.user_id}:{channel_id}"
            if cache.get(cache_key):
                continue
            
            # Send email
            subject = f"New message in #{msg.channel.name}"
            body = (
                f"Hi {member.user.full_name or 'there'},\n\n"
                f"You have a new message in #{msg.channel.name} from {msg.sender.full_name}:\n\n"
                f"\"{msg.text[:200]}{'...' if len(msg.text) > 200 else ''}\"\n\n"
                f"Open FlowTeam to reply: {settings.FRONTEND_BASE_URL}/messages?channel={channel_id}"
            )
            
            res = send_transactional_email(to_email=member.user.email, subject=subject, text=body)
            if res.ok:
                # Set cache for 15 mins
                cache.set(cache_key, True, 60 * 15)
                logger.info(f"Offline notification sent to {member.user.email}")
                
    except Message.DoesNotExist:
        pass
    except Exception as e:
        logger.exception(f"Error in notify_offline_users: {str(e)}")

from django.core.cache import cache
