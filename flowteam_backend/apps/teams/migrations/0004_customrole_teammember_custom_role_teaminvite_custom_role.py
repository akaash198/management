import django.db.models.deletion
import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("teams", "0003_team_plan"),
    ]

    operations = [
        migrations.CreateModel(
            name="CustomRole",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=64)),
                ("slug", models.SlugField(max_length=64)),
                ("level", models.PositiveSmallIntegerField(default=50)),
                ("is_owner_role", models.BooleanField(default=False)),
                ("is_system", models.BooleanField(default=True)),
                ("capabilities", models.JSONField(default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "team",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="custom_roles",
                        to="teams.team",
                    ),
                ),
            ],
            options={
                "ordering": ["level", "name"],
                "unique_together": {("team", "slug")},
            },
        ),
        migrations.AddField(
            model_name="teammember",
            name="custom_role",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="members",
                to="teams.customrole",
            ),
        ),
        migrations.AddField(
            model_name="teaminvite",
            name="custom_role",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="invites",
                to="teams.customrole",
            ),
        ),
    ]
