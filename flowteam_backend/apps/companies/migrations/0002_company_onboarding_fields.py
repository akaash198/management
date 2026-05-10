import uuid
import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("companies", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # New fields on Company
        migrations.AddField(
            model_name="company",
            name="website",
            field=models.URLField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="company",
            name="industry",
            field=models.CharField(
                blank=True,
                choices=[
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
                ],
                default="",
                max_length=50,
            ),
        ),
        migrations.AddField(
            model_name="company",
            name="size",
            field=models.CharField(
                blank=True,
                choices=[
                    ("1-10", "1–10 employees"),
                    ("11-50", "11–50 employees"),
                    ("51-200", "51–200 employees"),
                    ("201-500", "201–500 employees"),
                    ("501-1000", "501–1000 employees"),
                    ("1000+", "1000+ employees"),
                ],
                default="",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="company",
            name="country",
            field=models.CharField(blank=True, default="", max_length=100),
        ),
        migrations.AddField(
            model_name="company",
            name="logo",
            field=models.ImageField(blank=True, null=True, upload_to="company_logos/"),
        ),
        migrations.AddField(
            model_name="company",
            name="email_domain",
            field=models.CharField(
                blank=True,
                default="",
                help_text="Verified domain for automatic team membership (e.g. acme.com).",
                max_length=255,
            ),
        ),
        migrations.AddField(
            model_name="company",
            name="email_domain_verified",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="company",
            name="email_domain_verification_token",
            field=models.CharField(blank=True, default="", max_length=64),
        ),
        migrations.AddField(
            model_name="company",
            name="onboarding_status",
            field=models.CharField(
                choices=[
                    ("pending", "Pending"),
                    ("in_progress", "In Progress"),
                    ("active", "Active"),
                    ("suspended", "Suspended"),
                ],
                default="pending",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="company",
            name="onboarding_completed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="company",
            name="settings_json",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name="company",
            name="notes",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="company",
            name="updated_at",
            field=models.DateTimeField(auto_now=True),
        ),
        migrations.AlterModelOptions(
            name="company",
            options={"ordering": ["-created_at"], "verbose_name_plural": "companies"},
        ),
        # New model: CompanyOnboardingInvite
        migrations.CreateModel(
            name="CompanyOnboardingInvite",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("email", models.EmailField()),
                ("role", models.CharField(default="member", max_length=20)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "Pending"),
                            ("accepted", "Accepted"),
                            ("expired", "Expired"),
                        ],
                        default="pending",
                        max_length=20,
                    ),
                ),
                ("sent_at", models.DateTimeField(auto_now_add=True)),
                ("accepted_at", models.DateTimeField(blank=True, null=True)),
                (
                    "company",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="onboarding_invites",
                        to="companies.company",
                    ),
                ),
                (
                    "invited_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="sent_onboarding_invites",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-sent_at"],
                "unique_together": {("company", "email")},
            },
        ),
    ]
