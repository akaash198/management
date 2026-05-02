from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ("messaging", "0008_channelmember_mute_until"),
    ]

    operations = [
        migrations.AddField(
            model_name="channelmember",
            name="notification_keywords",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="channelmember",
            name="notification_level",
            field=models.CharField(
                choices=[("all", "All Messages"), ("mentions", "Mentions Only"), ("mute", "Muted")],
                default="all",
                max_length=16,
            ),
        ),
        migrations.CreateModel(
            name="ScheduledMessage",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("text", models.TextField()),
                ("send_at", models.DateTimeField()),
                ("sent_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("channel", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="scheduled_messages", to="messaging.channel")),
                ("parent", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="scheduled_replies", to="messaging.message")),
                ("sender", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="scheduled_messages", to="users.user")),
            ],
            options={
                "ordering": ["send_at"],
            },
        ),
    ]
