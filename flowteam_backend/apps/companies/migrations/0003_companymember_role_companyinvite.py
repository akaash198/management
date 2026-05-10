import uuid
import secrets
import datetime
import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("companies", "0002_company_onboarding_fields"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # Add role + invited_by to CompanyMember
        migrations.AddField(
            model_name="companymember",
            name="role",
            field=models.CharField(
                choices=[
                    ("ceo", "CEO"),
                    ("admin", "Admin"),
                    ("manager", "Manager"),
                    ("member", "Member"),
                    ("viewer", "Viewer"),
                ],
                default="member",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="companymember",
            name="invited_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="company_invites_sent",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        # New model: CompanyInvite
        migrations.CreateModel(
            name="CompanyInvite",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("email", models.EmailField()),
                (
                    "role",
                    models.CharField(
                        choices=[
                            ("ceo", "CEO"),
                            ("admin", "Admin"),
                            ("manager", "Manager"),
                            ("member", "Member"),
                            ("viewer", "Viewer"),
                        ],
                        default="member",
                        max_length=20,
                    ),
                ),
                ("token", models.CharField(blank=True, max_length=64, unique=True)),
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
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("accepted_at", models.DateTimeField(blank=True, null=True)),
                ("expires_at", models.DateTimeField(blank=True, null=True)),
                (
                    "company",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="invites",
                        to="companies.company",
                    ),
                ),
                (
                    "invited_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="sent_company_invites",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
                "unique_together": {("company", "email")},
            },
        ),
    ]
