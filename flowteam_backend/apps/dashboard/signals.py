from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.cache import cache
from apps.projects.models import Task, TaskActivity

@receiver(post_save, sender=TaskActivity)
def invalidate_dashboard_cache(sender, instance, **kwargs):
    # actor_id is the user who made the change
    actor_id = instance.actor_id
    # We might want to invalidate for everyone in the team, but for now just the user
    # In a real app, you'd find the team_id from the task
    team_id = instance.task.project.team_id
    
    # Best-effort invalidation across cache backends.
    # django-redis supports `delete_pattern`; locmem/filebased caches do not.
    patterns = [
        f"flowteam:dashboard_*_{team_id}*",
        f"flowteam:workload_{team_id}_*",
    ]
    if hasattr(cache, "delete_pattern"):
        for p in patterns:
            cache.delete_pattern(p)
    else:
        cache.clear()

@receiver(post_save, sender=Task)
def invalidate_on_task_save(sender, instance, **kwargs):
    team_id = instance.project.team_id
    patterns = [
        f"flowteam:dashboard_*_{team_id}*",
        f"flowteam:workload_{team_id}_*",
    ]
    if hasattr(cache, "delete_pattern"):
        for p in patterns:
            cache.delete_pattern(p)
    else:
        cache.clear()
