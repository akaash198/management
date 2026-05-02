from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("teams", "0003_team_plan"),
    ]

    operations = [
        migrations.AddField(
            model_name="team",
            name="ai_enabled",
            field=models.BooleanField(default=False),
        ),
    ]
