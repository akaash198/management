from __future__ import annotations

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("projects", "0017_epic_retroitem_retrospective_task_resolution_at_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="githubpullrequest",
            name="head_branch",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.AddField(
            model_name="githubpullrequest",
            name="base_branch",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.AddField(
            model_name="githubpullrequest",
            name="head_sha",
            field=models.CharField(blank=True, default="", max_length=40),
        ),
        migrations.AddField(
            model_name="githubpullrequest",
            name="review_state",
            field=models.CharField(blank=True, default="", max_length=32),
        ),
        migrations.AddField(
            model_name="githubpullrequest",
            name="reviewers",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="githubpullrequest",
            name="checks_status",
            field=models.CharField(blank=True, default="", max_length=32),
        ),
        migrations.AddField(
            model_name="githubpullrequest",
            name="merged_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="githubpullrequest",
            name="draft",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="githubpullrequest",
            name="labels",
            field=models.JSONField(blank=True, default=list),
        ),
    ]

