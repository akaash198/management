from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):
    dependencies = [
        ("integrations", "0002_githubintegration"),
        ("teams", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="GitLabIntegration",
            fields=[
                ("id", models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
                ("access_token", models.TextField()),
                ("gitlab_user", models.CharField(max_length=255, blank=True, default="")),
                ("repo_full_path", models.CharField(max_length=512, blank=True, default="")),
                ("webhook_id", models.CharField(max_length=80, blank=True, default="")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("project", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="gitlab_integration", to="projects.project")),
                ("team", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="gitlab_integrations", to="teams.team")),
            ],
            options={"unique_together": {("team", "project")}},
        ),
        migrations.CreateModel(
            name="BitbucketIntegration",
            fields=[
                ("id", models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
                ("access_token", models.TextField()),
                ("bitbucket_user", models.CharField(max_length=255, blank=True, default="")),
                ("workspace", models.CharField(max_length=255, blank=True, default="")),
                ("repo_slug", models.CharField(max_length=255, blank=True, default="")),
                ("webhook_id", models.CharField(max_length=80, blank=True, default="")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("project", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="bitbucket_integration", to="projects.project")),
                ("team", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="bitbucket_integrations", to="teams.team")),
            ],
            options={"unique_together": {("team", "project")}},
        ),
        migrations.CreateModel(
            name="ExternalCalendarAccount",
            fields=[
                ("id", models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
                ("provider", models.CharField(max_length=20)),
                ("access_token", models.TextField(blank=True, default="")),
                ("refresh_token", models.TextField(blank=True, default="")),
                ("expires_at", models.DateTimeField(null=True, blank=True)),
                ("scopes", models.TextField(blank=True, default="")),
                ("enabled", models.BooleanField(default=True)),
                ("sync_external_events", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("team", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="calendar_accounts", to="teams.team")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="calendar_accounts", to=settings.AUTH_USER_MODEL)),
            ],
            options={"unique_together": {("user", "team", "provider")}},
        ),
        migrations.AddIndex(
            model_name="externalcalendaraccount",
            index=models.Index(fields=["team", "provider", "enabled"], name="cal_team_provider_en_idx"),
        ),
    ]
