from django.db import migrations, models


def backfill_message_seq(apps, schema_editor):
    Channel = apps.get_model("messaging", "Channel")
    Message = apps.get_model("messaging", "Message")
    ChannelMessageSequence = apps.get_model("messaging", "ChannelMessageSequence")

    for channel in Channel.objects.all().iterator():
        seq = 1
        # Stable ordering for deterministic replay.
        for mid in (
            Message.objects.filter(channel_id=channel.id)
            .order_by("created_at", "id")
            .values_list("id", flat=True)
            .iterator()
        ):
            Message.objects.filter(id=mid).update(seq=seq)
            seq += 1

        ChannelMessageSequence.objects.update_or_create(channel_id=channel.id, defaults={"next_seq": seq})


class Migration(migrations.Migration):

    dependencies = [
        ("messaging", "0014_message_client_id"),
    ]

    operations = [
        migrations.AddField(
            model_name="message",
            name="seq",
            field=models.BigIntegerField(blank=True, null=True),
        ),
        migrations.CreateModel(
            name="ChannelMessageSequence",
            fields=[
                (
                    "id",
                    models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID"),
                ),
                ("next_seq", models.BigIntegerField(default=1)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "channel",
                    models.OneToOneField(
                        on_delete=models.deletion.CASCADE,
                        related_name="message_sequence",
                        to="messaging.channel",
                    ),
                ),
            ],
        ),
        migrations.AddConstraint(
            model_name="message",
            constraint=models.UniqueConstraint(fields=("channel", "seq"), name="uniq_message_seq_per_channel"),
        ),
        migrations.AddIndex(
            model_name="message",
            index=models.Index(fields=["channel", "seq"], name="msg_chan_seq_idx"),
        ),
        migrations.RunPython(backfill_message_seq, reverse_code=migrations.RunPython.noop),
    ]
