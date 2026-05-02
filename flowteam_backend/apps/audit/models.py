import uuid
from django.db import models
from django.conf import settings
from apps.teams.models import Team

class AuditLog(models.Model):
    ACTION_CHOICES = [
        ("create", "Create"),
        ("update", "Update"),
        ("delete", "Delete"),
        ("permission_change", "Permission Change"),
        ("approval_change", "Approval Change"),
        ("automation_trigger", "Automation Trigger"),
        ("notification_rule_change", "Notification Rule Change"),
        ("export", "Export"),
        ("login", "Login"),
        ("logout", "Logout"),
        ("invite_sent", "Invite Sent"),
        ("invite_accepted", "Invite Accepted"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="audit_actions")
    action = models.CharField(max_length=40, choices=ACTION_CHOICES)
    model_name = models.CharField(max_length=100)
    object_id = models.CharField(max_length=100)
    object_repr = models.CharField(max_length=200)
    changes = models.JSONField(default=dict)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=500, null=True, blank=True)
    team = models.ForeignKey(Team, on_delete=models.SET_NULL, null=True, blank=True, related_name="audit_logs")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["model_name", "object_id"]),
            models.Index(fields=["actor", "created_at"]),
            models.Index(fields=["team", "created_at"]),
        ]

    @classmethod
    def log(cls, actor, action, instance, changes=None, request=None):
        team = None
        if hasattr(instance, "team"): team = instance.team
        elif hasattr(instance, "project"): team = instance.project.team
        
        ip = None
        ua = None
        if request:
            x_forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
            ip = x_forwarded.split(",")[0] if x_forwarded else request.META.get("REMOTE_ADDR")
            ua = request.META.get("HTTP_USER_AGENT", "")[:500]

        return cls.objects.create(
            actor=actor,
            action=action,
            model_name=instance.__class__.__name__,
            object_id=str(instance.pk),
            object_repr=str(instance)[:200],
            changes=changes or {},
            ip_address=ip,
            user_agent=ua,
            team=team
        )
