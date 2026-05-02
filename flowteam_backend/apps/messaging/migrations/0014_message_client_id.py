from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("messaging", "0013_message_deleted_by"),
    ]

    operations = [
        migrations.AddField(
            model_name="message",
            name="client_id",
            field=models.CharField(blank=True, max_length=64, null=True),
        ),
        migrations.AddConstraint(
            model_name="message",
            constraint=models.UniqueConstraint(
                fields=("channel", "sender", "client_id"),
                name="uniq_message_client_id_per_sender_channel",
            ),
        ),
    ]

