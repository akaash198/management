from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("teams", "0002_alter_teaminvite_role_alter_teammember_role"),
    ]

    operations = [
        migrations.AddField(
            model_name="team",
            name="plan",
            field=models.CharField(default="free", max_length=20),
        ),
    ]

