from django.db import migrations


def _is_postgres(schema_editor):
    return schema_editor.connection.vendor == "postgresql"


def create_task_search_trigger(apps, schema_editor):
    if not _is_postgres(schema_editor):
        return
    schema_editor.execute(
        """
        CREATE TRIGGER task_search_vector_update
        BEFORE INSERT OR UPDATE ON projects_task
        FOR EACH ROW EXECUTE FUNCTION
        tsvector_update_trigger(search_vector, 'pg_catalog.english', title, description);
        """
    )
    schema_editor.execute(
        """
        UPDATE projects_task SET search_vector =
        to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,''));
        """
    )


def drop_task_search_trigger(apps, schema_editor):
    if not _is_postgres(schema_editor):
        return
    schema_editor.execute("DROP TRIGGER IF EXISTS task_search_vector_update ON projects_task;")

class Migration(migrations.Migration):
    dependencies = [
        ('projects', '0003_task_search_vector_task_task_search_gin'),
    ]

    operations = [
        migrations.RunPython(create_task_search_trigger, reverse_code=drop_task_search_trigger),
    ]
