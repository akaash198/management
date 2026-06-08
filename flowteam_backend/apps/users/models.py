import uuid
import hashlib
import secrets
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


class UserSession(models.Model):
    """
    Tracks active JWT sessions so users can list and revoke them.
    Populated on every login; revoked tokens are added to simplejwt's blacklist.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sessions")
    jti = models.CharField(max_length=64, unique=True)  # JWT ID from access token
    device_name = models.CharField(max_length=200, blank=True, default="")
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, default="")
    last_active = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)
    is_revoked = models.BooleanField(default=False)

    class Meta:
        ordering = ["-last_active"]
        indexes = [
            models.Index(fields=["user", "is_revoked"], name="usersession_user_revoked_idx"),
            models.Index(fields=["jti"], name="usersession_jti_idx"),
        ]

    def __str__(self):
        return f"{self.user_id} / {self.jti[:8]}…"


class PublicAPIKey(models.Model):
    """
    Long-lived API keys for Zapier / Make / external integrations.
    The raw key is shown ONCE at creation; only its SHA-256 hash is stored.
    """
    SCOPE_TASKS_READ   = "tasks:read"
    SCOPE_TASKS_WRITE  = "tasks:write"
    SCOPE_PROJECTS_READ = "projects:read"
    SCOPE_WEBHOOKS     = "webhooks:manage"

    ALL_SCOPES = [
        (SCOPE_TASKS_READ,    "Read tasks"),
        (SCOPE_TASKS_WRITE,   "Create / update tasks"),
        (SCOPE_PROJECTS_READ, "Read projects"),
        (SCOPE_WEBHOOKS,      "Manage webhook subscriptions"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    team = models.ForeignKey("teams.Team", on_delete=models.CASCADE, related_name="api_keys")
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="created_api_keys")
    name = models.CharField(max_length=120)
    prefix = models.CharField(max_length=10)           # first 8 chars of raw key — for display
    key_hash = models.CharField(max_length=64, unique=True)  # SHA-256 hex
    scopes = models.JSONField(default=list)
    last_used_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["team", "is_active"], name="apikey_team_active_idx"),
            models.Index(fields=["key_hash"], name="apikey_hash_idx"),
        ]

    @classmethod
    def generate(cls, *, team, created_by, name: str, scopes: list, expires_at=None) -> tuple["PublicAPIKey", str]:
        """
        Create a key, return (instance, raw_key).
        raw_key is shown to user once and never stored.
        """
        raw = f"cwrk_{secrets.token_urlsafe(40)}"
        prefix = raw[:10]
        key_hash = hashlib.sha256(raw.encode()).hexdigest()
        instance = cls.objects.create(
            team=team, created_by=created_by, name=name,
            prefix=prefix, key_hash=key_hash,
            scopes=scopes, expires_at=expires_at,
        )
        return instance, raw

    @classmethod
    def authenticate(cls, raw_key: str) -> "PublicAPIKey | None":
        """Look up a key by its hash. Returns None if invalid/expired/revoked."""
        key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
        try:
            key = cls.objects.select_related("team").get(key_hash=key_hash, is_active=True)
        except cls.DoesNotExist:
            return None
        if key.expires_at and key.expires_at < timezone.now():
            return None
        key.last_used_at = timezone.now()
        key.save(update_fields=["last_used_at"])
        return key

    def __str__(self):
        return f"{self.prefix}… ({self.name})"
