from __future__ import annotations

import uuid

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("integrations", "0004_alter_externalcalendaraccount_provider"),
        ("projects", "0017_epic_retroitem_retrospective_task_resolution_at_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="githubintegration",
            name="default_branch",
            field=models.CharField(default="main", max_length=255),
        ),
        migrations.AddField(
            model_name="githubintegration",
            name="webhook_secret",
            field=models.CharField(blank=True, default="", max_length=64),
        ),
        migrations.AddField(
            model_name="githubintegration",
            name="token_expires_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="githubintegration",
            name="last_synced_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="githubintegration",
            name="sync_commits",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="githubintegration",
            name="sync_branches",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="githubintegration",
            name="auto_advance_on_merge",
            field=models.BooleanField(default=False),
        ),
        migrations.CreateModel(
            name="GitBranch",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=255)),
                ("base_branch", models.CharField(default="main", max_length=255)),
                ("sha", models.CharField(blank=True, default="", max_length=40)),
                ("author_login", models.CharField(blank=True, default="", max_length=100)),
                ("is_merged", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "integration",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="branches", to="integrations.githubintegration"),
                ),
                (
                    "task",
                    models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="git_branches", to="projects.task"),
                ),
            ],
            options={
                "unique_together": {("integration", "name")},
            },
        ),
        migrations.CreateModel(
            name="GitCommit",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("sha", models.CharField(max_length=40, unique=True)),
                ("message", models.TextField(blank=True, default="")),
                ("author_login", models.CharField(blank=True, default="", max_length=100)),
                ("author_email", models.CharField(blank=True, default="", max_length=254)),
                ("url", models.URLField(blank=True, default="", max_length=500)),
                ("committed_at", models.DateTimeField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "branch",
                    models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="commits", to="integrations.gitbranch"),
                ),
                (
                    "integration",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="commits", to="integrations.githubintegration"),
                ),
                (
                    "task",
                    models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="git_commits", to="projects.task"),
                ),
            ],
        ),
        migrations.CreateModel(
            name="WebhookDelivery",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("event", models.CharField(max_length=50)),
                ("delivery_id", models.CharField(max_length=64)),
                ("payload_hash", models.CharField(max_length=64)),
                ("payload", models.JSONField(blank=True, default=dict)),
                ("status", models.CharField(choices=[("received", "Received"), ("processed", "Processed"), ("failed", "Failed"), ("ignored", "Ignored")], default="received", max_length=20)),
                ("error", models.TextField(blank=True, default="")),
                ("processed_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "integration",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="webhook_deliveries", to="integrations.githubintegration"),
                ),
            ],
            options={
                "unique_together": {("integration", "delivery_id")},
            },
        ),
        migrations.AddIndex(
            model_name="gitbranch",
            index=models.Index(fields=["integration", "task"], name="gitbranch_integ_task_idx"),
        ),
        migrations.AddIndex(
            model_name="gitbranch",
            index=models.Index(fields=["integration", "name"], name="gitbranch_integ_name_idx"),
        ),
        migrations.AddIndex(
            model_name="gitcommit",
            index=models.Index(fields=["integration", "task", "committed_at"], name="gitcommit_integ_task_time_idx"),
        ),
        migrations.AddIndex(
            model_name="gitcommit",
            index=models.Index(fields=["integration", "branch", "committed_at"], name="gitcommit_integ_branch_time_idx"),
        ),
        migrations.AddIndex(
            model_name="webhookdelivery",
            index=models.Index(fields=["integration", "status", "created_at"], name="whdel_integ_status_time_idx"),
        ),
        migrations.AddIndex(
            model_name="webhookdelivery",
            index=models.Index(fields=["integration", "event", "created_at"], name="whdel_integ_event_time_idx"),
        ),
    ]
