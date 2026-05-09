from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("projects", "0015_task_start_date_timelog_billed_invoice_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="projectdocument",
            name="category",
            field=models.CharField(
                choices=[
                    ("ppt", "Presentation (PPT)"),
                    ("usecase", "Use Case"),
                    ("documentation", "Project Documentation"),
                    ("excel", "Spreadsheet (Excel)"),
                    ("other", "Other"),
                ],
                default="other",
                max_length=30,
            ),
        ),
    ]

