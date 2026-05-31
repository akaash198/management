from __future__ import annotations

from dataclasses import dataclass

from .models import Company, CompanyMember


def get_user_company_role(*, company_id: str, user) -> str | None:
    """Return the user's role within a company, or None if not a member."""
    if not getattr(user, "is_authenticated", False):
        return None
    if getattr(user, "is_superuser", False):
        return CompanyMember.CEO
    # The designated CEO FK always has CEO-level access.
    if Company.objects.filter(id=company_id, ceo=user).exists():
        return CompanyMember.CEO
    membership = CompanyMember.objects.filter(company_id=company_id, user=user).only("role").first()
    return membership.role if membership else None


def assignable_roles_for_company(*, actor_role: str | None) -> list[str]:
    """Which roles an actor can assign when inviting a company member.

    Admin has full rights — same as CEO — so they can manage all roles
    including assigning or promoting other Admins and CEOs.
    """
    if not actor_role:
        return []
    if actor_role in (CompanyMember.CEO, CompanyMember.ADMIN):
        return [CompanyMember.CEO, CompanyMember.ADMIN, CompanyMember.MANAGER, CompanyMember.MEMBER, CompanyMember.VIEWER]
    if actor_role == CompanyMember.MANAGER:
        return [CompanyMember.MEMBER, CompanyMember.VIEWER]
    return []


def can_change_company_member_role(
    *,
    company_id: str,
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
    if current_role == new_role:
        return True, "ok"
    # Admin has full rights — can change any role including CEO.
    if actor_role in (CompanyMember.CEO, CompanyMember.ADMIN):
        # Prevent removing the last CEO.
        if current_role == CompanyMember.CEO and new_role != CompanyMember.CEO:
            ceo_count = CompanyMember.objects.filter(company_id=company_id, role=CompanyMember.CEO).count()
            if ceo_count <= 1:
                return False, "last_ceo"
        return True, "ok"
    return False, "forbidden"


def can_remove_company_member(
    *,
    company_id: str,
    actor,
    actor_role: str | None,
    target_user_id: str,
    target_role: str,
) -> tuple[bool, str]:
    if getattr(actor, "is_superuser", False):
        return True, "ok"
    if not actor_role:
        return False, "not_a_member"
    if actor_role not in (CompanyMember.CEO, CompanyMember.ADMIN):
        return False, "forbidden"
    # Prevent removing the last CEO.
    if target_role == CompanyMember.CEO:
        ceo_count = CompanyMember.objects.filter(company_id=company_id, role=CompanyMember.CEO).count()
        if ceo_count <= 1:
            return False, "last_ceo"
    return True, "ok"


@dataclass(frozen=True)
class CompanyCapabilities:
    role: str | None
    can_manage_company: bool
    can_invite_members: bool
    can_change_roles: bool
    can_remove_members: bool
    can_create_teams: bool
    can_view_members: bool
    assignable_invite_roles: list[str]


def compute_company_capabilities(*, company: Company, user) -> CompanyCapabilities:
    role = get_user_company_role(company_id=str(company.id), user=user)
    is_ceo = role == CompanyMember.CEO
    is_admin = is_ceo or role == CompanyMember.ADMIN
    is_manager = is_admin or role == CompanyMember.MANAGER
    is_member = is_manager or role in (CompanyMember.MEMBER, CompanyMember.VIEWER)

    return CompanyCapabilities(
        role=role,
        can_manage_company=is_admin,
        can_invite_members=is_manager,
        can_change_roles=is_admin,
        can_remove_members=is_admin,
        can_create_teams=is_admin,
        can_view_members=is_member,
        assignable_invite_roles=assignable_roles_for_company(actor_role=role),
    )
