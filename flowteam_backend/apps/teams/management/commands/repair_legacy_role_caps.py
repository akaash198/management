from django.core.management.base import BaseCommand

from apps.teams.models import ALL_TEAM_CAPABILITIES, DEFAULT_ROLE_CAPABILITIES, CustomRole, TeamMember


class Command(BaseCommand):
    help = "Backfill missing capability keys on legacy team custom roles."

    def handle(self, *args, **options):
        updated = 0

        for role in CustomRole.objects.prefetch_related("members").all():
            caps = dict(role.capabilities) if isinstance(role.capabilities, dict) else {}
            missing = [cap for cap in ALL_TEAM_CAPABILITIES if cap not in caps]
            if not missing:
                continue

            defaults = DEFAULT_ROLE_CAPABILITIES.get(role.slug)
            if defaults is None:
                fallback_role = next(
                    (member.role for member in role.members.only("role") if member.role in DEFAULT_ROLE_CAPABILITIES),
                    TeamMember.MEMBER,
                )
                defaults = DEFAULT_ROLE_CAPABILITIES[fallback_role]

            for cap in missing:
                caps[cap] = bool(defaults.get(cap, False))

            role.capabilities = caps
            role.save(update_fields=["capabilities"])
            updated += 1

        self.stdout.write(self.style.SUCCESS(f"Updated {updated} custom role(s)."))
