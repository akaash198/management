"""
Data migration: for every existing Team, create five default CustomRole rows
(ceo, admin, manager, member, viewer) and backfill custom_role FK on all
existing TeamMember and TeamInvite rows by matching their legacy role slug.
"""
from django.db import migrations

ALL_CAPS = [
    "can_manage_team", "can_invite_members", "can_change_roles",
    "can_remove_members", "can_delete_team", "can_view_audit_log",
    "can_access_projects", "can_create_project", "can_manage_billing",
    "can_access_reports", "can_manage_integrations",
    "can_access_messages", "can_access_calendar", "can_access_meetings",
    "can_access_issues", "can_access_planning", "can_access_operations",
]

SYSTEM_ROLES = [
    {
        "slug": "ceo",
        "name": "CEO",
        "level": 0,
        "is_owner_role": True,
        "capabilities": {c: True for c in ALL_CAPS},
    },
    {
        "slug": "admin",
        "name": "Admin",
        "level": 10,
        "is_owner_role": False,
        "capabilities": {c: c != "can_delete_team" for c in ALL_CAPS},
    },
    {
        "slug": "manager",
        "name": "Manager",
        "level": 30,
        "is_owner_role": False,
        "capabilities": {c: c in (
            "can_invite_members", "can_access_projects", "can_create_project",
            "can_access_reports", "can_access_messages", "can_access_calendar",
            "can_access_meetings", "can_access_issues", "can_access_planning",
            "can_access_operations",
        ) for c in ALL_CAPS},
    },
    {
        "slug": "member",
        "name": "Employee",
        "level": 50,
        "is_owner_role": False,
        "capabilities": {c: c in (
            "can_access_projects", "can_access_messages", "can_access_calendar",
            "can_access_meetings", "can_access_issues", "can_access_planning",
        ) for c in ALL_CAPS},
    },
    {
        "slug": "viewer",
        "name": "Viewer",
        "level": 80,
        "is_owner_role": False,
        "capabilities": {c: c in (
            "can_access_projects", "can_access_messages", "can_access_calendar",
            "can_access_meetings", "can_access_issues", "can_access_planning",
        ) for c in ALL_CAPS},
    },
]


def seed_custom_roles(apps, schema_editor):
    Team = apps.get_model("teams", "Team")
    CustomRole = apps.get_model("teams", "CustomRole")
    TeamMember = apps.get_model("teams", "TeamMember")
    TeamInvite = apps.get_model("teams", "TeamInvite")

    for team in Team.objects.all():
        slug_to_role = {}
        for role_def in SYSTEM_ROLES:
            role_obj, _ = CustomRole.objects.get_or_create(
                team=team,
                slug=role_def["slug"],
                defaults={
                    "name": role_def["name"],
                    "level": role_def["level"],
                    "is_owner_role": role_def["is_owner_role"],
                    "is_system": True,
                    "capabilities": role_def["capabilities"],
                },
            )
            slug_to_role[role_def["slug"]] = role_obj

        for member in TeamMember.objects.filter(team=team, custom_role__isnull=True):
            if member.role in slug_to_role:
                member.custom_role = slug_to_role[member.role]
                member.save(update_fields=["custom_role"])

        for invite in TeamInvite.objects.filter(team=team, custom_role__isnull=True):
            if invite.role in slug_to_role:
                invite.custom_role = slug_to_role[invite.role]
                invite.save(update_fields=["custom_role"])


def unseed_custom_roles(apps, schema_editor):
    CustomRole = apps.get_model("teams", "CustomRole")
    CustomRole.objects.filter(is_system=True).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("teams", "0007_customrole_teammember_custom_role_teaminvite_custom_role"),
    ]

    operations = [
        migrations.RunPython(seed_custom_roles, reverse_code=unseed_custom_roles),
    ]
