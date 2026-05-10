from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()

DEMO_EMAILS = [
    "sarah@nova-agency.com",
    "alex@nova-agency.com",
    "priya@nova-agency.com",
    "jordan@nova-agency.com",
    "dana@nova-agency.com",
    "marcus@nova-agency.com",
]

class Command(BaseCommand):
    help = "Reset demo user passwords to Demo@123"

    def handle(self, *args, **options):
        for email in DEMO_EMAILS:
            try:
                user = User.objects.get(email=email)
                user.set_password("Demo@123")
                user.save(update_fields=["password"])
                self.stdout.write(self.style.SUCCESS(f"  Updated: {email}"))
            except User.DoesNotExist:
                self.stdout.write(self.style.WARNING(f"  Not found: {email}"))
