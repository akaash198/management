"""
Force-overwrite module-access capabilities on all system CustomRoles.

Migration 0009 used `if cap not in caps` which skipped any role that
already had the cap key present (even if set to False by a previous
migration or code path). This migration unconditionally overwrites
the correct True/False value for every module-access cap on every
system role, regardless of what is currently stored.
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

CORRECT_VALUES = {
    "ceo":     {c: True for c in MODULE_ACCESS_CAPS},
    "admin":   {c: True for c in MODULE_ACCESS_CAPS},
    "manager": {c: True for c in MODULE_ACCESS_CAPS},
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


def overwrite_caps(apps, schema_editor):
    CustomRole = apps.get_model("teams", "CustomRole")
    roles_to_save = []

    for role in CustomRole.objects.filter(is_system=True):
        if role.slug not in CORRECT_VALUES:
            continue
        caps = dict(role.capabilities) if isinstance(role.capabilities, dict) else {}
        correct = CORRECT_VALUES[role.slug]
        changed = False
        for cap, expected in correct.items():
            if caps.get(cap) != expected:
                caps[cap] = expected
                changed = True
        if changed:
            role.capabilities = caps
            roles_to_save.append(role)

    if roles_to_save:
        CustomRole.objects.bulk_update(roles_to_save, ["capabilities"])


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("teams", "0009_backfill_module_access_caps"),
    ]

    operations = [
        migrations.RunPython(overwrite_caps, reverse_code=noop_reverse),
    ]
