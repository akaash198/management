from __future__ import annotations

from dataclasses import dataclass, field

from .models import Team, TeamMember, CustomRole, ALL_TEAM_CAPABILITIES


def normalize_team_role(role: str | None) -> str:
    if not role:
        return TeamMember.MEMBER
    role = str(role).strip().lower()
    if role == "employee":
        return TeamMember.MEMBER
    return role


def is_valid_team_role(role: str) -> bool:
    return role in {TeamMember.CEO, TeamMember.ADMIN, TeamMember.MANAGER, TeamMember.MEMBER, TeamMember.VIEWER}


def get_user_team_role(*, team_id: str, user) -> str | None:
    if not getattr(user, "is_authenticated", False):
        return None
    from apps.companies.models import Company
    if Company.objects.filter(teams__id=team_id, ceo=user).exists():
        return TeamMember.CEO

    team = Team.objects.filter(id=team_id).only("company_id").first()
    if team and team.company_id:
        from apps.companies.rbac import get_user_company_role
        from apps.companies.models import CompanyMember
        company_role = get_user_company_role(company_id=str(team.company_id), user=user)
        if company_role == CompanyMember.CEO:
            return TeamMember.CEO
        if company_role == CompanyMember.ADMIN:
            return TeamMember.ADMIN
    membership = TeamMember.objects.filter(team_id=team_id, user=user).only("role").first()
    return membership.role if membership else None


def get_user_custom_role(*, team_id: str, user) -> CustomRole | None:
    if not getattr(user, "is_authenticated", False):
        return None
    from apps.companies.models import Company
    if Company.objects.filter(teams__id=team_id, ceo=user).exists():
        return CustomRole.objects.filter(team_id=team_id, slug="ceo").first()

    team = Team.objects.filter(id=team_id).only("company_id").first()
    if team and team.company_id:
        from apps.companies.rbac import get_user_company_role
        from apps.companies.models import CompanyMember
        company_role = get_user_company_role(company_id=str(team.company_id), user=user)
        if company_role == CompanyMember.CEO:
            return CustomRole.objects.filter(team_id=team_id, slug="ceo").first()
        if company_role == CompanyMember.ADMIN:
            return CustomRole.objects.filter(team_id=team_id, slug="admin").first()
    membership = (
        TeamMember.objects.select_related("custom_role")
        .filter(team_id=team_id, user=user)
        .first()
    )
    return membership.custom_role if membership else None


def team_has_owner(*, team_id: str) -> bool:
    return TeamMember.objects.filter(
        team_id=team_id, custom_role__is_owner_role=True
    ).exists() or TeamMember.objects.filter(team_id=team_id, role=TeamMember.CEO).exists()


def owner_count(*, team_id: str) -> int:
    from django.db.models import Q
    return TeamMember.objects.filter(
        team_id=team_id
    ).filter(
        Q(custom_role__is_owner_role=True) | Q(role=TeamMember.CEO)
    ).count()


def ceo_count(*, team_id: str) -> int:
    return TeamMember.objects.filter(team_id=team_id, role=TeamMember.CEO).count()


def _resolve_caps(custom_role: CustomRole | None, permissions_json: dict | None) -> dict:
    """Merge role capability baseline with per-member overrides."""
    base = dict(custom_role.capabilities) if custom_role else {c: False for c in ALL_TEAM_CAPABILITIES}
    overrides = permissions_json or {}
    result = {}
    for cap in ALL_TEAM_CAPABILITIES:
        override = overrides.get(cap)
        if override is None:
            result[cap] = bool(base.get(cap, False))
        else:
            result[cap] = bool(override)
    return result


def assignable_roles_for_invite(*, actor_role: str | None, has_ceo: bool) -> list[str]:
    if not actor_role:
        return []
    if actor_role == TeamMember.CEO:
        return [TeamMember.CEO, TeamMember.ADMIN, TeamMember.MANAGER, TeamMember.MEMBER, TeamMember.VIEWER]
    if actor_role == TeamMember.ADMIN:
        return [TeamMember.ADMIN, TeamMember.MANAGER, TeamMember.MEMBER, TeamMember.VIEWER]
    if actor_role == TeamMember.MANAGER:
        return [TeamMember.MEMBER, TeamMember.VIEWER]
    return []


def assignable_custom_roles_for_invite(*, actor_custom_role: CustomRole | None, team_id: str) -> list[CustomRole]:
    """Return CustomRole objects the actor is allowed to assign when inviting."""
    if not actor_custom_role:
        return []
    actor_level = actor_custom_role.level
    if actor_custom_role.is_owner_role:
        return list(CustomRole.objects.filter(team_id=team_id).order_by("level"))
    # Actors can only assign roles at a strictly higher level (lower authority) than their own.
    return list(CustomRole.objects.filter(team_id=team_id, level__gt=actor_level).order_by("level"))


def can_change_member_role(
    *,
    team_id: str,
    actor,
    actor_role: str | None,
    target_user_id: str,
    current_role: str,
    new_role: str,
) -> tuple[bool, str]:
    if getattr(actor, "is_superuser", False):
        return True, "ok"
    if not actor_role:
        return False, "not_a_member"
    if not is_valid_team_role(new_role):
        return False, "invalid_role"
    if current_role == new_role:
        return True, "ok"

    is_self = str(getattr(actor, "id", "")) == str(target_user_id)
    has_ceo = team_has_owner(team_id=team_id)

    if not has_ceo and actor_role == TeamMember.ADMIN and is_self and new_role == TeamMember.CEO:
        return True, "ok"

    if current_role == TeamMember.CEO and actor_role != TeamMember.CEO:
        return False, "ceo_protected"
    if new_role == TeamMember.CEO and actor_role != TeamMember.CEO:
        return False, "ceo_protected"

    if current_role == TeamMember.CEO and new_role != TeamMember.CEO:
        if ceo_count(team_id=team_id) <= 1:
            return False, "last_ceo"

    if actor_role in (TeamMember.ADMIN, TeamMember.CEO):
        return True, "ok"

    return False, "forbidden"


def can_change_member_custom_role(
    *,
    team_id: str,
    actor,
    actor_custom_role: CustomRole | None,
    target_user_id: str,
    target_current_custom_role: CustomRole | None,
    new_custom_role: CustomRole,
) -> tuple[bool, str]:
    if getattr(actor, "is_superuser", False):
        return True, "ok"
    if not actor_custom_role:
        return False, "not_a_member"

    is_self = str(getattr(actor, "id", "")) == str(target_user_id)

    # Protect owner role: only owner-role actors can assign/remove owner roles.
    if target_current_custom_role and target_current_custom_role.is_owner_role:
        if not actor_custom_role.is_owner_role:
            return False, "owner_protected"
    if new_custom_role.is_owner_role and not actor_custom_role.is_owner_role:
        return False, "owner_protected"

    # Prevent removing the last owner.
    if target_current_custom_role and target_current_custom_role.is_owner_role:
        if not new_custom_role.is_owner_role and owner_count(team_id=team_id) <= 1:
            return False, "last_owner"

    # Actors can only assign roles they themselves can be assigned (level >= their own level).
    if not actor_custom_role.is_owner_role:
        if new_custom_role.level <= actor_custom_role.level:
            return False, "forbidden"

    return True, "ok"


def can_remove_member(
    *,
    team_id: str,
    actor,
    actor_role: str | None,
    target_user_id: str,
    target_role: str,
) -> tuple[bool, str]:
    if not actor_role:
        return False, "not_a_member"
    is_self = str(getattr(actor, "id", "")) == str(target_user_id)
    if actor_role not in (TeamMember.CEO, TeamMember.ADMIN):
        return False, "forbidden"
    if target_role == TeamMember.CEO and actor_role != TeamMember.CEO:
        return False, "ceo_protected"
    if target_role == TeamMember.CEO:
        if ceo_count(team_id=team_id) <= 1:
            return False, "last_ceo"
    if is_self and target_role == TeamMember.CEO and ceo_count(team_id=team_id) <= 1:
        return False, "last_ceo"
    return True, "ok"


def can_grant_revoke_permissions(
    *,
    actor,
    actor_custom_role: CustomRole | None,
    target_permissions_json: dict | None,
    grant: list[str],
    revoke: list[str],
) -> tuple[bool, str]:
    """
    CEO/Admin (or owner-role) can grant/revoke caps.
    Actor cannot grant a capability they themselves don't have (no escalation).
    """
    if not actor_custom_role:
        return False, "not_a_member"

    actor_caps = _resolve_caps(actor_custom_role, None)

    if not (actor_custom_role.is_owner_role or actor_caps.get("can_change_roles")):
        return False, "forbidden"

    for cap in grant:
        if cap not in ALL_TEAM_CAPABILITIES:
            return False, f"unknown_capability:{cap}"
        if not actor_caps.get(cap, False):
            return False, "privilege_escalation"

    for cap in revoke:
        if cap not in ALL_TEAM_CAPABILITIES:
            return False, f"unknown_capability:{cap}"

    return True, "ok"


@dataclass(frozen=True)
class TeamCapabilities:
    role: str | None
    custom_role_id: str | None
    custom_role_name: str | None
    is_owner_role: bool
    can_manage_team: bool
    can_invite_members: bool
    can_change_roles: bool
    can_remove_members: bool
    can_delete_team: bool
    can_view_audit_log: bool
    can_access_projects: bool
    can_create_project: bool
    can_manage_billing: bool
    can_access_reports: bool
    can_manage_integrations: bool
    can_access_messages: bool
    can_access_calendar: bool
    can_access_meetings: bool
    can_access_issues: bool
    can_access_planning: bool
    can_access_operations: bool
    assignable_invite_roles: list[str]
    assignable_custom_role_ids: list[str] = field(default_factory=list)


def compute_team_capabilities(*, team: Team, user) -> TeamCapabilities:
    membership = (
        TeamMember.objects.select_related("custom_role")
        .filter(team=team, user=user)
        .first()
    )

    if not membership:
        # Company admins (and the designated company CEO) can administer all teams
        # even without an explicit TeamMember row.
        company_role = None
        if team.company_id:
            from apps.companies.rbac import get_user_company_role
            company_role = get_user_company_role(company_id=str(team.company_id), user=user)

        if not company_role:
            return TeamCapabilities(
                role=None, custom_role_id=None, custom_role_name=None,
                is_owner_role=False,
                can_manage_team=False, can_invite_members=False,
                can_change_roles=False, can_remove_members=False,
                can_delete_team=False, can_view_audit_log=False,
                can_access_projects=False, can_create_project=False, can_manage_billing=False,
                can_access_reports=False, can_manage_integrations=False,
                can_access_messages=False, can_access_calendar=False, can_access_meetings=False,
                can_access_issues=False, can_access_planning=False, can_access_operations=False,
                assignable_invite_roles=[], assignable_custom_role_ids=[],
            )

        # Company CEO/Admin gets seeded role caps even without membership.
        from apps.companies.models import CompanyMember
        role_slug = TeamMember.CEO if company_role == CompanyMember.CEO else TeamMember.ADMIN
        custom_role = CustomRole.objects.filter(team=team, slug=role_slug).first()
        caps = _resolve_caps(custom_role, None)
        has_ceo = team_has_owner(team_id=str(team.id))
        assignable = assignable_custom_roles_for_invite(actor_custom_role=custom_role, team_id=str(team.id))
        return TeamCapabilities(
            role=role_slug,
            custom_role_id=str(custom_role.id) if custom_role else None,
            custom_role_name=custom_role.name if custom_role else role_slug,
            is_owner_role=role_slug == TeamMember.CEO,
            **{k: caps.get(k, False) for k in ALL_TEAM_CAPABILITIES},
            assignable_invite_roles=assignable_roles_for_invite(actor_role=role_slug, has_ceo=has_ceo),
            assignable_custom_role_ids=[str(r.id) for r in assignable],
        )

    custom_role = membership.custom_role
    caps = _resolve_caps(custom_role, membership.permissions_json)
    has_ceo = team_has_owner(team_id=str(team.id))
    assignable = assignable_custom_roles_for_invite(actor_custom_role=custom_role, team_id=str(team.id))

    return TeamCapabilities(
        role=membership.role,
        custom_role_id=str(custom_role.id) if custom_role else None,
        custom_role_name=custom_role.name if custom_role else membership.role,
        is_owner_role=bool(custom_role.is_owner_role) if custom_role else membership.role == TeamMember.CEO,
        can_manage_team=caps.get("can_manage_team", False),
        can_invite_members=caps.get("can_invite_members", False),
        can_change_roles=caps.get("can_change_roles", False),
        can_remove_members=caps.get("can_remove_members", False),
        can_delete_team=caps.get("can_delete_team", False),
        can_view_audit_log=caps.get("can_view_audit_log", False),
        can_access_projects=caps.get("can_access_projects", False),
        can_create_project=caps.get("can_create_project", False),
        can_manage_billing=caps.get("can_manage_billing", False),
        can_access_reports=caps.get("can_access_reports", False),
        can_manage_integrations=caps.get("can_manage_integrations", False),
        can_access_messages=caps.get("can_access_messages", False),
        can_access_calendar=caps.get("can_access_calendar", False),
        can_access_meetings=caps.get("can_access_meetings", False),
        can_access_issues=caps.get("can_access_issues", False),
        can_access_planning=caps.get("can_access_planning", False),
        can_access_operations=caps.get("can_access_operations", False),
        assignable_invite_roles=assignable_roles_for_invite(actor_role=membership.role, has_ceo=has_ceo),
        assignable_custom_role_ids=[str(r.id) for r in assignable],
    )
