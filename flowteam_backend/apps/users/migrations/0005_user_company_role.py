from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0004_pushsubscription_user_oauth_provider_user_oauth_uid_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="company_role",
            field=models.CharField(
                choices=[
                    ("owner", "Owner"),
                    ("manager", "Manager"),
                    ("member", "Member"),
                    ("guest", "Guest / Contractor"),
                ],
                default="member",
                max_length=20,
            ),
        ),
    ]
