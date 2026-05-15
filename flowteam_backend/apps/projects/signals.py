from django.db.models.signals import post_save, pre_save, m2m_changed
from django.dispatch import receiver
from .models import Project, Column, Task, TaskActivity, ProjectRole
from .permissions import sync_project_permissions
from django.contrib.auth import get_user_model
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
import json

User = get_user_model()

@receiver(post_save, sender=Project)
def create_default_columns(sender, instance, created, **kwargs):
    if created:
        defaults = [
            ("To Do", 0, False),
            ("In Progress", 1, False),
            ("In Review", 2, False),
            ("Done", 3, True),
        ]
        for name, order, is_done in defaults:
            Column.objects.create(
                project=instance,
                name=name,
                order=order,
                is_done_column=is_done
            )

@receiver(post_save, sender=Task)
def log_task_creation(sender, instance, created, **kwargs):
    if created:
        TaskActivity.objects.create(
            task=instance,
            actor=instance.reporter,
            verb="created"
        )

@receiver(pre_save, sender=Task)
def log_task_changes(sender, instance, **kwargs):
    if not instance._state.adding:
        try:
            old_instance = Task.objects.get(pk=instance.pk)
            # Log Movement
            if old_instance.column_id != instance.column_id:
                TaskActivity.objects.create(
                    task=instance,
                    actor=instance.reporter, # In a real app, use a tracker to get the actual user
                    verb="moved",
                    detail={
                        "from_col": str(old_instance.column.name),
                        "to_col": str(instance.column.name)
                    }
                )
                if instance.column.is_done_column:
                    TaskActivity.objects.create(
                        task=instance,
                        actor=instance.reporter,
                        verb="completed"
                    )
            
            # Log Assignment
            if old_instance.assignee_id != instance.assignee_id:
                TaskActivity.objects.create(
                    task=instance,
                    actor=instance.reporter,
                    verb="assigned",
                    detail={
                        "to": str(instance.assignee.full_name) if instance.assignee else None
                    }
                )
        except Task.DoesNotExist:
            pass


@receiver(m2m_changed, sender=Task.assignees.through)
def log_task_assignees_changed(sender, instance: Task, action: str, pk_set, **kwargs):
    if action not in {"post_add", "post_remove", "post_clear"}:
        return
    try:
        # Best-effort actor: reporter (request user isn't available in signal context).
        actor = instance.reporter
    except Exception:
        actor = None

    if action == "post_clear":
        TaskActivity.objects.create(task=instance, actor=actor, verb="assigned", detail={"to": None})
        return

    users = list(User.objects.filter(id__in=list(pk_set))) if pk_set else []
    for u in users:
        TaskActivity.objects.create(
            task=instance,
            actor=actor,
            verb="assigned",
            detail={"to": u.full_name},
        )

@receiver(post_save, sender=ProjectRole)
def on_project_role_save(sender, instance, **kwargs):
    sync_project_permissions(instance)


@receiver(post_save, sender=TaskActivity)
def broadcast_activity(sender, instance: TaskActivity, created, **kwargs):
    if not created:
        return

    try:
        from apps.dashboard.serializers import ActivityItemSerializer
        serializer = ActivityItemSerializer(instance)
        data = serializer.data
        team_id = str(instance.task.project.team_id)
        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                f"team_activity_{team_id}",
                {
                    "type": "activity.update", # This matches the method name in TeamActivityConsumer
                    "data": data,
                }
            )
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error broadcasting activity: {e}")
