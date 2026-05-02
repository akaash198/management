from django.conf import settings
from django.db import migrations, models


def copy_assignee_to_assignees(apps, schema_editor):
    Task = apps.get_model("projects", "Task")
    through = Task.assignees.through  # type: ignore[attr-defined]
    db_alias = schema_editor.connection.alias

    # Bulk insert rows into the m2m through table for existing assignee values.
    rows = []
    for task_id, assignee_id in Task.objects.using(db_alias).exclude(assignee_id__isnull=True).values_list("id", "assignee_id"):
        rows.append(through(task_id=task_id, user_id=assignee_id))
    if rows:
        through.objects.using(db_alias).bulk_create(rows, ignore_conflicts=True)


class Migration(migrations.Migration):
    dependencies = [
        ("projects", "0011_githubpullrequest"),
    ]

    operations = [
        migrations.AddField(
            model_name="task",
            name="assignees",
            field=models.ManyToManyField(blank=True, related_name="assigned_tasks_multi", to=settings.AUTH_USER_MODEL),
        ),
        migrations.RunPython(copy_assignee_to_assignees, migrations.RunPython.noop),
    ]

