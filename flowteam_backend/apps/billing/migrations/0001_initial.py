from __future__ import annotations

import uuid
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("teams", "0003_team_plan"),
    ]

    operations = [
        migrations.CreateModel(
            name="TeamBilling",
            fields=[
                ("id", models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
                ("provider", models.CharField(default="stripe", max_length=20)),
                ("customer_id", models.CharField(blank=True, default="", max_length=120)),
                ("subscription_id", models.CharField(blank=True, default="", max_length=120)),
                ("status", models.CharField(blank=True, default="", max_length=40)),
                ("current_period_end", models.DateTimeField(blank=True, null=True)),
                ("cancel_at_period_end", models.BooleanField(default=False)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "team",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="billing",
                        to="teams.team",
                    ),
                ),
            ],
        ),
    ]

