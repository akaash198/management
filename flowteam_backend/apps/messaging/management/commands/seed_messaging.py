"""
Management command to seed messaging channels for the team.
"""
from django.core.management.base import BaseCommand
from apps.messaging.models import Channel, ChannelMember
from apps.teams.models import Team, TeamMember
from apps.users.models import User


class Command(BaseCommand):
    help = 'Seed messaging channels for the team'

    def handle(self, *args, **options):
        team = Team.objects.all().first()
        owner = User.objects.filter(email='akaash@example.com').first()
        
        if not team or not owner:
            self.stdout.write(self.style.ERROR('Team or Owner not found'))
            return

        channels = [
            ('general', 'General discussions', False),
            ('engineering', 'Development and tech talks', False),
            ('marketing', 'Market reach and branding', False),
            ('announcements', 'Company wide announcements', False),
        ]

        members = User.objects.all()

        for name, desc, is_private in channels:
            channel, created = Channel.objects.get_or_create(
                team=team,
                name=name,
                defaults={
                    'display_name': name.capitalize(),
                    'description': desc,
                    'is_private': is_private,
                    'created_by': owner
                }
            )
            
            # Ensure all team members are in these public channels
            for user in members:
                # Check if user is actually in the team
                if TeamMember.objects.filter(team=team, user=user).exists():
                     ChannelMember.objects.get_or_create(
                         channel=channel,
                         user=user
                     )

            status = 'Created' if created else 'Updated'
            self.stdout.write(f'  {status}: {name}')

        self.stdout.write(self.style.SUCCESS('Messaging seeding complete!'))
