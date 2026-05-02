from django.db import migrations, models
from django.utils import timezone
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("teams", "0001_initial"),
        ("users", "0003_user_2fa_fields"),
    ]

    operations = [
        migrations.CreateModel(
            name="SlackWebhook",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("name", models.CharField(default="Default", max_length=120)),
                ("webhook_url", models.URLField(max_length=500)),
                ("enabled", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "created_by",
                    models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to="users.user"),
                ),
                (
                    "team",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="slack_webhooks", to="teams.team"),
                ),
            ],
            options={
                "unique_together": {("team", "name")},
            },
        ),
        migrations.CreateModel(
            name="OutboxEvent",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("destination", models.CharField(choices=[("slack", "Slack")], default="slack", max_length=40)),
                ("event_type", models.CharField(max_length=120)),
                ("payload", models.JSONField(blank=True, default=dict)),
                (
                    "status",
                    models.CharField(
                        choices=[("pending", "Pending"), ("processing", "Processing"), ("sent", "Sent"), ("failed", "Failed")],
                        default="pending",
                        max_length=20,
                    ),
                ),
                ("attempts", models.PositiveIntegerField(default=0)),
                ("next_attempt_at", models.DateTimeField(default=timezone.now)),
                ("last_error", models.TextField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "team",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="outbox_events",
                        to="teams.team",
                    ),
                ),
            ],
        ),
        migrations.AddIndex(
            model_name="slackwebhook",
            index=models.Index(fields=["team", "enabled"], name="integrations_team_en_idx"),
        ),
        migrations.AddIndex(
            model_name="outboxevent",
            index=models.Index(fields=["status", "next_attempt_at"], name="outbox_status_next_idx"),
        ),
        migrations.AddIndex(
            model_name="outboxevent",
            index=models.Index(fields=["team", "destination", "status"], name="outbox_team_dest_status_idx"),
        ),
    ]
