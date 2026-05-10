from __future__ import annotations

from dataclasses import dataclass

from .models import Team, TeamMember


def normalize_team_role(role: str | None) -> str:
    """
    Normalize incoming role strings.

    Notes:
    - UI may refer to "employee" but the DB role is "member".
    """
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
    if getattr(user, "is_superuser", False):
        return TeamMember.CEO
    # Check if this user is the CEO of the company that owns this team.
    from apps.companies.models import Company
    is_company_ceo = Company.objects.filter(teams__id=team_id, ceo=user).exists()
    if is_company_ceo:
        return TeamMember.CEO
    membership = TeamMember.objects.filter(team_id=team_id, user=user).only("role").first()
    return membership.role if membership else None


def team_has_ceo(*, team_id: str) -> bool:
    return TeamMember.objects.filter(team_id=team_id, role=TeamMember.CEO).exists()


def ceo_count(*, team_id: str) -> int:
    return TeamMember.objects.filter(team_id=team_id, role=TeamMember.CEO).count()


def assignable_roles_for_invite(*, actor_role: str | None, has_ceo: bool) -> list[str]:
    """
    Which roles the actor is allowed to assign when inviting/adding a member.

    Company-style defaults:
    - CEO can assign any role (including CEO).
    - Admin can assign admin/manager/member/viewer (not CEO).
    - Manager can assign member/viewer.
    - Member/Viewer cannot invite.

    Bootstrap:
    - If the team has no CEO yet, allow an Admin to assign themselves as CEO via role change,
      but do not allow creating arbitrary CEOs via invites.
    """
    if not actor_role:
        return []
    if actor_role == TeamMember.CEO:
        return [TeamMember.CEO, TeamMember.ADMIN, TeamMember.MANAGER, TeamMember.MEMBER, TeamMember.VIEWER]
    if actor_role == TeamMember.ADMIN:
        return [TeamMember.ADMIN, TeamMember.MANAGER, TeamMember.MEMBER, TeamMember.VIEWER]
    if actor_role == TeamMember.MANAGER:
        return [TeamMember.MEMBER, TeamMember.VIEWER]
    return []


def can_change_member_role(
    *,
    team_id: str,
    actor,
    actor_role: str | None,
    target_user_id: str,
    current_role: str,
    new_role: str,
) -> tuple[bool, str]:
    """
    Returns (allowed, reason_code). reason_code is safe to show in API errors.
    """
    if getattr(actor, "is_superuser", False):
        return True, "ok"

    if not actor_role:
        return False, "not_a_member"

    if not is_valid_team_role(new_role):
        return False, "invalid_role"

    if current_role == new_role:
        return True, "ok"

    is_self = str(getattr(actor, "id", "")) == str(target_user_id)
    has_ceo = team_has_ceo(team_id=team_id)

    # Bootstrap: existing teams might have no CEO. Allow an Admin to promote themselves.
    if not has_ceo and actor_role == TeamMember.ADMIN and is_self and new_role == TeamMember.CEO:
        return True, "ok"

    # CEO changes are protected.
    if current_role == TeamMember.CEO and actor_role != TeamMember.CEO:
        return False, "ceo_protected"
    if new_role == TeamMember.CEO and actor_role != TeamMember.CEO:
        return False, "ceo_protected"

    # Prevent removing the last CEO (demotion/transfer).
    if current_role == TeamMember.CEO and new_role != TeamMember.CEO:
        if ceo_count(team_id=team_id) <= 1:
            return False, "last_ceo"

    # Admin can manage roles except CEO.
    if actor_role == TeamMember.ADMIN:
        return True, "ok"

    # CEO can manage roles (already handled by CEO protected checks).
    if actor_role == TeamMember.CEO:
        return True, "ok"

    return False, "forbidden"


def can_remove_member(
    *,
    team_id: str,
    actor,
    actor_role: str | None,
    target_user_id: str,
    target_role: str,
) -> tuple[bool, str]:
    if getattr(actor, "is_superuser", False):
        return True, "ok"

    if not actor_role:
        return False, "not_a_member"

    is_self = str(getattr(actor, "id", "")) == str(target_user_id)

    # Only CEO/Admin can remove members (including themselves) by default.
    if actor_role not in (TeamMember.CEO, TeamMember.ADMIN):
        return False, "forbidden"

    # Only CEO can remove a CEO.
    if target_role == TeamMember.CEO and actor_role != TeamMember.CEO:
        return False, "ceo_protected"

    # Prevent removing the last CEO.
    if target_role == TeamMember.CEO:
        if ceo_count(team_id=team_id) <= 1:
            return False, "last_ceo"

    # Optional: prevent self-removal for CEO unless another CEO exists (covered above).
    if is_self and target_role == TeamMember.CEO and ceo_count(team_id=team_id) <= 1:
        return False, "last_ceo"

    return True, "ok"


@dataclass(frozen=True)
class TeamCapabilities:
    role: str | None
    can_manage_team: bool
    can_invite_members: bool
    can_change_roles: bool
    can_remove_members: bool
    can_delete_team: bool
    can_view_audit_log: bool
    can_create_project: bool
    assignable_invite_roles: list[str]


def compute_team_capabilities(*, team: Team, user) -> TeamCapabilities:
    role = get_user_team_role(team_id=str(team.id), user=user)
    is_ceo = role == TeamMember.CEO
    is_admin = is_ceo or role == TeamMember.ADMIN
    is_manager = is_admin or role == TeamMember.MANAGER
    has_ceo = team_has_ceo(team_id=str(team.id))

    return TeamCapabilities(
        role=role,
        can_manage_team=is_admin,
        can_invite_members=is_manager,
        can_change_roles=is_admin,
        can_remove_members=is_admin,
        can_delete_team=is_ceo,
        can_view_audit_log=is_admin,
        can_create_project=is_manager,
        assignable_invite_roles=assignable_roles_for_invite(actor_role=role, has_ceo=has_ceo),
    )

