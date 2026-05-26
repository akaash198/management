import uuid
from django.db import models
from django.conf import settings
from slugify import slugify

class Team(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True, blank=True)
    avatar = models.ImageField(upload_to="team_avatars/", null=True, blank=True)
    plan = models.CharField(max_length=20, default="free")
    ai_enabled = models.BooleanField(default=False)
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="teams",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="created_teams"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.name)
            candidate = base
            # Ensure slug uniqueness even when random suffixes collide in seeded/test DBs.
            for _ in range(30):
                exists = Team.objects.filter(slug=candidate).exclude(pk=self.pk).exists()
                if not exists:
                    break
                candidate = f"{base}-{uuid.uuid4().hex[:4]}"
            self.slug = candidate
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

class TeamMember(models.Model):
    CEO = "ceo"
    ADMIN = "admin"
    MANAGER = "manager"
    MEMBER = "member"
    VIEWER = "viewer"
    
    ROLE_CHOICES = [
        (CEO, "CEO"),
        (ADMIN, "Admin"),
        (MANAGER, "Manager"),
        (MEMBER, "Member"),
        (VIEWER, "Viewer"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="members")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="team_memberships"
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=MEMBER)
    # Granular per-member permission overrides on top of the role baseline.
    # Schema: { "feature": { "can_view": bool, "can_edit": bool, "can_manage": bool } }
    # Null means "use role defaults". Stored as JSON for forward-compatibility.
    permissions_json = models.JSONField(null=True, blank=True, default=None)
    joined_at = models.DateTimeField(auto_now_add=True)
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="sent_invites_member"
    )

    class Meta:
        unique_together = ("team", "user")

    def __str__(self):
        return f"{self.user.email} in {self.team.name} ({self.role})"

class TeamInvite(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="pending_invites")
    email = models.EmailField()
    role = models.CharField(max_length=20, choices=TeamMember.ROLE_CHOICES, default=TeamMember.MEMBER)
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sent_invites"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    is_accepted = models.BooleanField(default=False)

    class Meta:
        unique_together = ("team", "email")

    def __str__(self):
        return f"Invite for {self.email} to {self.team.name}"
