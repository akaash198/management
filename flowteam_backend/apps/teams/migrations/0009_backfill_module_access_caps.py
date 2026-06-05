"""
Backfill missing module-access capabilities into every existing CustomRole.

Migration 0008 seeded CEO/Admin/Manager/Member/Viewer roles but only stored
the management capabilities (can_manage_team, can_invite_members, etc.).
The module-access keys (can_access_projects, can_access_messages, …) were
added to ALL_TEAM_CAPABILITIES later and were never written into the stored
JSON — so _resolve_caps() returns False for every module for every existing
role, blocking all users from Projects, Messages, Calendar, etc.

This migration adds the correct value for each missing key based on the
canonical DEFAULT_ROLE_CAPABILITIES table, for every system role across
every existing team.  Non-system (user-created) roles are left untouched
unless they also have missing keys, in which case they get False as a safe
default.
"""
from django.db import migrations

MODULE_ACCESS_CAPS = [
    "can_access_projects",
    "can_access_messages",
    "can_access_calendar",
    "can_access_meetings",
    "can_access_issues",
    "can_access_planning",
    "can_access_operations",
]

# The correct value for each system role slug × module-access cap.
SYSTEM_ROLE_MODULE_DEFAULTS = {
    "ceo":     {c: True  for c in MODULE_ACCESS_CAPS},
    "admin":   {c: True  for c in MODULE_ACCESS_CAPS},
    "manager": {c: True  for c in MODULE_ACCESS_CAPS},
    "member":  {c: c in (
        "can_access_projects",
        "can_access_messages",
        "can_access_calendar",
        "can_access_meetings",
        "can_access_issues",
        "can_access_planning",
    ) for c in MODULE_ACCESS_CAPS},
    "viewer":  {c: c in (
        "can_access_projects",
        "can_access_messages",
        "can_access_calendar",
        "can_access_meetings",
        "can_access_issues",
        "can_access_planning",
    ) for c in MODULE_ACCESS_CAPS},
}


def backfill_caps(apps, schema_editor):
    CustomRole = apps.get_model("teams", "CustomRole")

    roles_to_save = []
    for role in CustomRole.objects.all():
        caps = dict(role.capabilities) if isinstance(role.capabilities, dict) else {}
        changed = False

        if role.is_system and role.slug in SYSTEM_ROLE_MODULE_DEFAULTS:
            defaults = SYSTEM_ROLE_MODULE_DEFAULTS[role.slug]
        else:
            # User-created roles: only add keys that are completely absent; use False.
            defaults = {c: False for c in MODULE_ACCESS_CAPS}

        for cap, value in defaults.items():
            if cap not in caps:
                caps[cap] = value
                changed = True

        if changed:
            role.capabilities = caps
            roles_to_save.append(role)

    # Bulk update for efficiency.
    if roles_to_save:
        CustomRole.objects.bulk_update(roles_to_save, ["capabilities"])


def reverse_backfill(apps, schema_editor):
    # Removing these keys is safe — the system will just re-apply defaults at runtime.
    CustomRole = apps.get_model("teams", "CustomRole")
    roles_to_save = []
    for role in CustomRole.objects.all():
        caps = dict(role.capabilities) if isinstance(role.capabilities, dict) else {}
        changed = False
        for cap in MODULE_ACCESS_CAPS:
            if cap in caps:
                del caps[cap]
                changed = True
        if changed:
            role.capabilities = caps
            roles_to_save.append(role)
    if roles_to_save:
        CustomRole.objects.bulk_update(roles_to_save, ["capabilities"])


class Migration(migrations.Migration):

    dependencies = [
        ("teams", "0008_seed_custom_roles"),
    ]

    operations = [
        migrations.RunPython(backfill_caps, reverse_code=reverse_backfill),
    ]
