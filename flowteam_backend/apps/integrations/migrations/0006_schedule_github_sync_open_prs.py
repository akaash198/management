from __future__ import annotations

import json

from django.db import migrations


def create_periodic_task(apps, schema_editor):
    try:
        IntervalSchedule = apps.get_model("django_celery_beat", "IntervalSchedule")
        PeriodicTask = apps.get_model("django_celery_beat", "PeriodicTask")
    except Exception:
        return

    schedule, _ = IntervalSchedule.objects.get_or_create(every=1, period="hours")
    PeriodicTask.objects.update_or_create(
        name="github_sync_open_prs_hourly",
        defaults={
            "task": "apps.integrations.tasks.github_sync_open_prs",
            "interval": schedule,
            "enabled": True,
            "args": "[]",
            "kwargs": json.dumps({}),
        },
    )


class Migration(migrations.Migration):
    dependencies = [
        ("integrations", "0005_github_deep_integration_models"),
    ]

    operations = [
        migrations.RunPython(create_periodic_task, reverse_code=migrations.RunPython.noop),
    ]

