from django.db.models.signals import post_save
from django.dispatch import receiver
from apps.teams.models import Team, TeamMember
from .models import Channel, ChannelMember

@receiver(post_save, sender=Team)
def create_default_channels(sender, instance, created, **kwargs):
    if created:
        defaults = [
            ("general", "General", "General discussion for the whole team"),
            ("announcements", "Announcements", "Important updates and news"),
        ]
        for name, d_name, desc in defaults:
            Channel.objects.create(
                team=instance,
                name=name,
                display_name=d_name,
                description=desc,
                created_by=instance.created_by
            )

@receiver(post_save, sender=Channel)
def add_team_members_to_public_channel(sender, instance, created, **kwargs):
    if created and not instance.is_private:
        team_members = TeamMember.objects.filter(team=instance.team)
        for tm in team_members:
            ChannelMember.objects.get_or_create(channel=instance, user=tm.user)

@receiver(post_save, sender=TeamMember)
def add_new_member_to_public_channels(sender, instance, created, **kwargs):
    if created:
        public_channels = Channel.objects.filter(team=instance.team, is_private=False)
        for channel in public_channels:
            ChannelMember.objects.get_or_create(channel=channel, user=instance.user)
