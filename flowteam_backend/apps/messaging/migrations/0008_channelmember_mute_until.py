from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("messaging", "0007_message_edits"),
    ]

    operations = [
        migrations.AddField(
            model_name="channelmember",
            name="mute_until",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]

