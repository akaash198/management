from django.db import migrations

ML_EXPERIMENT_FIELDS = [
    {"name": "Model Name",       "field_type": "text",   "is_required": True,  "options": []},
    {"name": "Dataset",          "field_type": "text",   "is_required": True,  "options": []},
    {"name": "Baseline Metric",  "field_type": "number", "is_required": False, "options": []},
    {"name": "Target Metric",    "field_type": "number", "is_required": False, "options": []},
    {"name": "Result Metric",    "field_type": "number", "is_required": False, "options": []},
    {
        "name": "Experiment Status",
        "field_type": "select",
        "is_required": False,
        "options": ["Hypothesis", "In Progress", "Eval Review", "Staging", "Deployed", "Abandoned"],
    },
    {"name": "Framework",        "field_type": "select", "is_required": False,
     "options": ["PyTorch", "TensorFlow", "Scikit-learn", "XGBoost", "LightGBM", "HuggingFace", "Other"]},
    {"name": "Experiment ID",    "field_type": "text",   "is_required": False, "options": []},
    {"name": "Training Run Date","field_type": "date",   "is_required": False, "options": []},
    {"name": "Model Version",    "field_type": "text",   "is_required": False, "options": []},
]


def seed_ml_fields(apps, schema_editor):
    """
    For every existing project, create IssueTypeFieldDefinition entries
    for the 'experiment' issue type if they don't already exist.
    New projects get these via the setup page; this seeds pre-existing projects.
    """
    Project = apps.get_model("projects", "Project")
    IssueTypeFieldDefinition = apps.get_model("projects", "IssueTypeFieldDefinition")

    for project in Project.objects.all():
        existing = set(
            IssueTypeFieldDefinition.objects.filter(
                project=project, issue_type="experiment"
            ).values_list("name", flat=True)
        )
        for field in ML_EXPERIMENT_FIELDS:
            if field["name"] not in existing:
                IssueTypeFieldDefinition.objects.create(
                    project=project,
                    issue_type="experiment",
                    **field,
                )


def unseed_ml_fields(apps, schema_editor):
    IssueTypeFieldDefinition = apps.get_model("projects", "IssueTypeFieldDefinition")
    IssueTypeFieldDefinition.objects.filter(
        issue_type="experiment",
        name__in=[f["name"] for f in ML_EXPERIMENT_FIELDS],
    ).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("projects", "0019_ml_experiment_issue_type"),
    ]

    operations = [
        migrations.RunPython(seed_ml_fields, reverse_code=unseed_ml_fields),
    ]
