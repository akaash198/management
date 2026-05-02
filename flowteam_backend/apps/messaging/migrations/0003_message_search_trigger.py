from django.db import migrations


def _is_postgres(schema_editor):
    return schema_editor.connection.vendor == "postgresql"


def create_message_search_trigger(apps, schema_editor):
    if not _is_postgres(schema_editor):
        return
    schema_editor.execute(
        """
        CREATE TRIGGER message_search_vector_update
        BEFORE INSERT OR UPDATE ON messaging_message
        FOR EACH ROW EXECUTE FUNCTION
        tsvector_update_trigger(search_vector, 'pg_catalog.english', text);
        """
    )
    schema_editor.execute(
        """
        UPDATE messaging_message SET search_vector =
        to_tsvector('english', coalesce(text,''));
        """
    )


def drop_message_search_trigger(apps, schema_editor):
    if not _is_postgres(schema_editor):
        return
    schema_editor.execute("DROP TRIGGER IF EXISTS message_search_vector_update ON messaging_message;")

class Migration(migrations.Migration):
    dependencies = [
        ('messaging', '0002_message_search_vector_message_msg_search_gin'),
    ]

    operations = [
        migrations.RunPython(create_message_search_trigger, reverse_code=drop_message_search_trigger),
    ]
