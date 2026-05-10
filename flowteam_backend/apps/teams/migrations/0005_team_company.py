import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("teams", "0004_team_ai_enabled"),
        ("companies", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="team",
            name="company",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="teams",
                to="companies.company",
            ),
        ),
    ]
