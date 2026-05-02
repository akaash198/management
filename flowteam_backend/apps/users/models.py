import uuid
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.utils import timezone
from .managers import CustomUserManager

class User(AbstractBaseUser, PermissionsMixin):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=255)
    avatar = models.ImageField(upload_to="avatars/", null=True, blank=True)
    timezone_pref = models.CharField(max_length=50, default="UTC")
    email_verified_at = models.DateTimeField(null=True, blank=True)
    oauth_provider = models.CharField(max_length=20, null=True, blank=True)
    oauth_uid = models.CharField(max_length=255, null=True, blank=True)

    two_factor_enabled = models.BooleanField(default=False)
    totp_secret = models.CharField(max_length=64, null=True, blank=True)
    two_factor_backup_codes = models.JSONField(default=list, blank=True)
    
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)

    objects = CustomUserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name"]

    def __str__(self):
        return self.email

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["oauth_provider", "oauth_uid"],
                condition=models.Q(oauth_provider__isnull=False),
                name="unique_oauth_identity",
            )
        ]


class PushSubscription(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="push_subscriptions")
    endpoint = models.TextField(unique=True)
    p256dh = models.TextField()
    auth = models.TextField()
    user_agent = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["user"])]
