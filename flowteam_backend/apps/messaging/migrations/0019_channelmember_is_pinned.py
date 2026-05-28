from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("messaging", "0018_alter_notification_type"),
    ]

    operations = [
        migrations.AddField(
            model_name="channelmember",
            name="is_pinned",
            field=models.BooleanField(default=False),
        ),
    ]

