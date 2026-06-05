from django.db import migrations, models
import django.db.models.deletion
import uuid
from django.conf import settings


class Migration(migrations.Migration):
    dependencies = [
        ("integrations", "0006_schedule_github_sync_open_prs"),
        ("projects", "0020_seed_ml_experiment_field_definitions"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="ExperimentBroadcastConfig",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("enabled", models.BooleanField(default=True)),
                ("notify_on_statuses", models.JSONField(blank=True, default=list)),
                (
                    "message_template",
                    models.TextField(
                        blank=True,
                        default="Experiment *{title}* moved to *{status}* in project *{project}*.",
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "project",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="experiment_broadcast_config",
                        to="projects.project",
                    ),
                ),
                (
                    "slack_webhook",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="experiment_broadcast_configs",
                        to="integrations.slackwebhook",
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="experiment_broadcast_configs",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name="ExperimentBroadcastLog",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("task_id", models.UUIDField(blank=True, null=True)),
                ("task_title", models.CharField(blank=True, default="", max_length=255)),
                ("experiment_status", models.CharField(blank=True, default="", max_length=100)),
                ("message_sent", models.TextField(blank=True, default="")),
                (
                    "status",
                    models.CharField(
                        choices=[("sent", "Sent"), ("failed", "Failed"), ("skipped", "Skipped")],
                        default="sent",
                        max_length=20,
                    ),
                ),
                ("error", models.TextField(blank=True, default="")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "config",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="logs",
                        to="integrations.experimentbroadcastconfig",
                    ),
                ),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.AddIndex(
            model_name="experimentbroadcastlog",
            index=models.Index(
                fields=["config", "created_at"],
                name="expbroadcast_config_time_idx",
            ),
        ),
    ]
