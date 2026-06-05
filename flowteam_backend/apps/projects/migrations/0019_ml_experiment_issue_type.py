from django.db import migrations, models


class Migration(migrations.Migration):
    """
    Adds 'experiment' to Task.ISSUE_TYPE_CHOICES and 'model_card' to
    ProjectDocument.DOC_CHOICES. Both are CharField choices — no schema
    change, just altering the field validators so Django accepts the new values.
    Also adds the two new AutomationRule trigger choices.
    """

    dependencies = [
        ("projects", "0018_extend_githubpullrequest_deep_fields"),
    ]

    operations = [
        migrations.AlterField(
            model_name="task",
            name="issue_type",
            field=models.CharField(
                choices=[
                    ("epic", "Epic"),
                    ("story", "Story"),
                    ("task", "Task"),
                    ("bug", "Bug"),
                    ("subtask", "Subtask"),
                    ("experiment", "Experiment"),
                ],
                default="task",
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name="projectdocument",
            name="doc_type",
            field=models.CharField(
                choices=[
                    ("sop", "SOP"),
                    ("spec", "Spec"),
                    ("meeting", "Meeting Note"),
                    ("decision", "Decision Log"),
                    ("note", "Note"),
                    ("model_card", "Model Card"),
                ],
                default="note",
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name="automationrule",
            name="trigger",
            field=models.CharField(
                choices=[
                    ("task_done", "Task moved to done"),
                    ("task_overdue", "Task overdue"),
                    ("approval_requested", "Approval requested"),
                    ("meeting_done", "Meeting completed"),
                    ("experiment_moved", "Experiment status changed"),
                ],
                max_length=30,
            ),
        ),
    ]
