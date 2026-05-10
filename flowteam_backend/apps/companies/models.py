import uuid
from django.db import models
from django.conf import settings
from slugify import slugify


class Company(models.Model):
    ONBOARDING_STATUS_CHOICES = [
        ("pending", "Pending"),
        ("in_progress", "In Progress"),
        ("active", "Active"),
        ("suspended", "Suspended"),
    ]

    INDUSTRY_CHOICES = [
        ("technology", "Technology"),
        ("finance", "Finance"),
        ("healthcare", "Healthcare"),
        ("education", "Education"),
        ("retail", "Retail"),
        ("manufacturing", "Manufacturing"),
        ("media", "Media & Entertainment"),
        ("consulting", "Consulting"),
        ("real_estate", "Real Estate"),
        ("other", "Other"),
    ]

    SIZE_CHOICES = [
        ("1-10", "1–10 employees"),
        ("11-50", "11–50 employees"),
        ("51-200", "51–200 employees"),
        ("201-500", "201–500 employees"),
        ("501-1000", "501–1000 employees"),
        ("1000+", "1000+ employees"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True, blank=True)

    # Contact & identity
    website = models.URLField(blank=True, default="")
    industry = models.CharField(max_length=50, choices=INDUSTRY_CHOICES, blank=True, default="")
    size = models.CharField(max_length=20, choices=SIZE_CHOICES, blank=True, default="")
    country = models.CharField(max_length=100, blank=True, default="")
    logo = models.ImageField(upload_to="company_logos/", null=True, blank=True)

    # Email domain (for SSO/auto-join)
    email_domain = models.CharField(
        max_length=255, blank=True, default="",
        help_text="Verified domain for automatic team membership (e.g. acme.com).",
    )
    email_domain_verified = models.BooleanField(default=False)
    email_domain_verification_token = models.CharField(max_length=64, blank=True, default="")

    # Hierarchy
    ceo = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="led_companies",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_companies",
    )

    # Onboarding lifecycle
    onboarding_status = models.CharField(
        max_length=20, choices=ONBOARDING_STATUS_CHOICES, default="pending"
    )
    onboarding_completed_at = models.DateTimeField(null=True, blank=True)

    # Flexible config store (AI, integrations, notifications, etc.)
    settings_json = models.JSONField(default=dict, blank=True)

    # Internal notes (super-admin only)
    notes = models.TextField(blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.name)
            candidate = base
            for _ in range(30):
                if not Company.objects.filter(slug=candidate).exclude(pk=self.pk).exists():
                    break
                candidate = f"{base}-{uuid.uuid4().hex[:4]}"
            self.slug = candidate
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name_plural = "companies"
        ordering = ["-created_at"]


class CompanyMember(models.Model):
    """Tracks which users belong to which companies (many-to-many)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="members")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="company_memberships",
    )
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("company", "user")

    def __str__(self):
        return f"{self.user.email} @ {self.company.name}"


class CompanyOnboardingInvite(models.Model):
    """
    Tracks invitations sent during company onboarding (CEO invite, team seed members).
    Separate from TeamInvite so we can track per-company onboarding state.
    """
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("accepted", "Accepted"),
        ("expired", "Expired"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="onboarding_invites")
    email = models.EmailField()
    role = models.CharField(max_length=20, default="member")
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="sent_onboarding_invites"
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    sent_at = models.DateTimeField(auto_now_add=True)
    accepted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ("company", "email")
        ordering = ["-sent_at"]

    def __str__(self):
        return f"Onboarding invite: {self.email} → {self.company.name}"
