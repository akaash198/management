from __future__ import annotations

from django.shortcuts import get_object_or_404
from rest_framework import permissions, serializers, status
from rest_framework.views import APIView
from slugify import slugify

from apps.audit.models import AuditLog
from config.utils import standardize_response

from .models import ALL_TEAM_CAPABILITIES, CustomRole, Team, TeamMember
from .permissions import IsTeamAdmin, IsTeamMember
from .rbac import (
    _resolve_caps,
    assignable_custom_roles_for_invite,
    can_change_member_custom_role,
    can_grant_revoke_permissions,
    compute_team_capabilities,
    get_user_custom_role,
    get_user_team_role,
    owner_count,
)


# ── Serializers ──────────────────────────────────────────────────────────────

class CustomRoleSerializer(serializers.ModelSerializer):
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = CustomRole
        fields = (
            "id", "name", "slug", "level", "is_owner_role", "is_system",
            "capabilities", "member_count", "created_at",
        )
        read_only_fields = ("id", "slug", "is_system", "created_at")

    def get_member_count(self, obj: CustomRole) -> int:
        return obj.members.count()

    def validate_capabilities(self, value: dict) -> dict:
        unknown = set(value.keys()) - set(ALL_TEAM_CAPABILITIES)
        if unknown:
            raise serializers.ValidationError(f"Unknown capabilities: {', '.join(unknown)}")
        return value

    def validate_name(self, value: str) -> str:
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Name cannot be blank.")
        if len(value) > 64:
            raise serializers.ValidationError("Name must be 64 characters or fewer.")
        return value

    def validate_level(self, value: int) -> int:
        if not (0 <= value <= 100):
            raise serializers.ValidationError("Level must be between 0 and 100.")
        return value


# ── Helpers ───────────────────────────────────────────────────────────────────

def _actor_is_admin(request, team_id: str) -> bool:
    if request.user.is_superuser:
        return True
    custom_role = get_user_custom_role(team_id=str(team_id), user=request.user)
    if custom_role:
        caps = _resolve_caps(custom_role, None)
        return bool(caps.get("can_change_roles") or custom_role.is_owner_role)
    # Fallback to legacy role check
    legacy = get_user_team_role(team_id=str(team_id), user=request.user)
    return legacy in (TeamMember.CEO, TeamMember.ADMIN)


def _actor_is_owner(request, team_id: str) -> bool:
    if request.user.is_superuser:
        return True
    custom_role = get_user_custom_role(team_id=str(team_id), user=request.user)
    if custom_role:
        return custom_role.is_owner_role
    legacy = get_user_team_role(team_id=str(team_id), user=request.user)
    return legacy == TeamMember.CEO


def _unique_slug(team: Team, base: str, exclude_id=None) -> str:
    candidate = slugify(base)[:64] or "role"
    suffix = 2
    while True:
        qs = CustomRole.objects.filter(team=team, slug=candidate)
        if exclude_id:
            qs = qs.exclude(id=exclude_id)
        if not qs.exists():
            return candidate
        candidate = f"{slugify(base)[:60]}-{suffix}"
        suffix += 1


# ── Views ─────────────────────────────────────────────────────────────────────

class CustomRoleListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsTeamMember]

    def get(self, request, team_id):
        team = get_object_or_404(Team, id=team_id)
        roles = CustomRole.objects.filter(team=team).order_by("level", "name")
        return standardize_response(data=CustomRoleSerializer(roles, many=True).data)

    def post(self, request, team_id):
        team = get_object_or_404(Team, id=team_id)
        if not _actor_is_admin(request, team_id):
            return standardize_response(
                success=False,
                error={"code": "forbidden", "message": "Only Admin or CEO can create roles."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = CustomRoleSerializer(data=request.data)
        if not serializer.is_valid():
            return standardize_response(
                success=False, error=serializer.errors,
                status=status.HTTP_400_BAD_REQUEST,
            )

        name = serializer.validated_data["name"]
        slug = _unique_slug(team, name)
        caps = serializer.validated_data.get("capabilities", {})
        full_caps = {c: bool(caps.get(c, False)) for c in ALL_TEAM_CAPABILITIES}

        # Non-owners cannot create an owner role.
        is_owner = serializer.validated_data.get("is_owner_role", False)
        if is_owner and not _actor_is_owner(request, team_id):
            return standardize_response(
                success=False,
                error={"code": "owner_protected", "message": "Only the owner can create an owner role."},
                status=status.HTTP_403_FORBIDDEN,
            )

        role = CustomRole.objects.create(
            team=team,
            name=name,
            slug=slug,
            level=serializer.validated_data.get("level", 50),
            is_owner_role=is_owner,
            is_system=False,
            capabilities=full_caps,
        )
        AuditLog.log(
            actor=request.user,
            action="create",
            instance=role,
            changes={"name": name, "level": role.level, "capabilities": full_caps},
            request=request,
        )
        return standardize_response(
            data=CustomRoleSerializer(role).data,
            status=status.HTTP_201_CREATED,
        )


class CustomRoleDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsTeamMember]

    def _get_role(self, team_id, role_id) -> CustomRole:
        return get_object_or_404(CustomRole, id=role_id, team_id=team_id)

    def get(self, request, team_id, role_id):
        role = self._get_role(team_id, role_id)
        return standardize_response(data=CustomRoleSerializer(role).data)

    def patch(self, request, team_id, role_id):
        role = self._get_role(team_id, role_id)
        if not _actor_is_admin(request, team_id):
            return standardize_response(
                success=False,
                error={"code": "forbidden", "message": "Only Admin or CEO can edit roles."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Protect owner-role flag: only owner can change it.
        if "is_owner_role" in request.data and not _actor_is_owner(request, team_id):
            return standardize_response(
                success=False,
                error={"code": "owner_protected", "message": "Only the owner can change the owner role flag."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Prevent removing the last owner role.
        if request.data.get("is_owner_role") is False and role.is_owner_role:
            if owner_count(team_id=str(team_id)) <= 1:
                return standardize_response(
                    success=False,
                    error={"code": "last_owner", "message": "Cannot remove the last owner role."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        serializer = CustomRoleSerializer(role, data=request.data, partial=True)
        if not serializer.is_valid():
            return standardize_response(
                success=False, error=serializer.errors,
                status=status.HTTP_400_BAD_REQUEST,
            )

        old_caps = dict(role.capabilities)
        changes: dict = {}

        if "name" in serializer.validated_data:
            changes["name"] = {"from": role.name, "to": serializer.validated_data["name"]}
            role.name = serializer.validated_data["name"]
            # Re-slug only for user-created roles.
            if not role.is_system:
                role.slug = _unique_slug(role.team, role.name, exclude_id=role.id)

        if "level" in serializer.validated_data:
            changes["level"] = {"from": role.level, "to": serializer.validated_data["level"]}
            role.level = serializer.validated_data["level"]

        if "is_owner_role" in serializer.validated_data:
            changes["is_owner_role"] = {"from": role.is_owner_role, "to": serializer.validated_data["is_owner_role"]}
            role.is_owner_role = serializer.validated_data["is_owner_role"]

        if "capabilities" in serializer.validated_data:
            new_caps = {c: bool(serializer.validated_data["capabilities"].get(c, role.capabilities.get(c, False)))
                        for c in ALL_TEAM_CAPABILITIES}
            changes["capabilities"] = {"from": old_caps, "to": new_caps}
            role.capabilities = new_caps

        role.save()
        AuditLog.log(
            actor=request.user, action="update", instance=role,
            changes=changes, request=request,
        )
        return standardize_response(data=CustomRoleSerializer(role).data)

    def delete(self, request, team_id, role_id):
        role = self._get_role(team_id, role_id)

        if not _actor_is_owner(request, team_id):
            return standardize_response(
                success=False,
                error={"code": "forbidden", "message": "Only the owner can delete roles."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if role.is_owner_role and owner_count(team_id=str(team_id)) <= 1:
            return standardize_response(
                success=False,
                error={"code": "last_owner", "message": "Cannot delete the last owner role."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        member_count = role.members.count()
        if member_count > 0:
            return standardize_response(
                success=False,
                error={
                    "code": "role_in_use",
                    "message": f"Reassign {member_count} member(s) before deleting this role.",
                    "member_count": member_count,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        AuditLog.log(
            actor=request.user, action="delete", instance=role,
            changes={"name": role.name}, request=request,
        )
        role.delete()
        return standardize_response(status=status.HTTP_204_NO_CONTENT)


class MemberCustomRoleView(APIView):
    """PATCH /teams/{team_id}/members/{uid}/role/ — change a member's CustomRole."""
    permission_classes = [permissions.IsAuthenticated, IsTeamMember]

    def patch(self, request, team_id, uid):
        team = get_object_or_404(Team, id=team_id)
        member = get_object_or_404(TeamMember, team=team, user_id=uid)
        actor_custom_role = get_user_custom_role(team_id=str(team_id), user=request.user)

        new_role_id = request.data.get("custom_role_id")
        if not new_role_id:
            return standardize_response(
                success=False,
                error={"code": "missing_field", "message": "custom_role_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        new_custom_role = get_object_or_404(CustomRole, id=new_role_id, team=team)
        allowed, reason = can_change_member_custom_role(
            team_id=str(team_id),
            actor=request.user,
            actor_custom_role=actor_custom_role,
            target_user_id=str(uid),
            target_current_custom_role=member.custom_role,
            new_custom_role=new_custom_role,
        )
        if not allowed:
            return standardize_response(
                success=False,
                error={"code": reason, "message": "Role change not permitted."},
                status=status.HTTP_403_FORBIDDEN,
            )

        old_role_name = member.custom_role.name if member.custom_role else member.role
        member.custom_role = new_custom_role
        # Keep legacy role field in sync with the closest system slug.
        member.role = new_custom_role.slug if new_custom_role.slug in (
            TeamMember.CEO, TeamMember.ADMIN, TeamMember.MANAGER,
            TeamMember.MEMBER, TeamMember.VIEWER,
        ) else TeamMember.MEMBER
        member.save(update_fields=["custom_role", "role"])

        AuditLog.log(
            actor=request.user, action="permission_change", instance=member,
            changes={"custom_role": {"from": old_role_name, "to": new_custom_role.name}},
            request=request,
        )
        from .serializers import TeamMemberSerializer
        return standardize_response(data=TeamMemberSerializer(member).data)


class MemberPermissionsView(APIView):
    """
    GET  /teams/{team_id}/members/{uid}/permissions/  — current resolved caps + overrides
    PATCH /teams/{team_id}/members/{uid}/permissions/ — grant/revoke individual capabilities
    DELETE /teams/{team_id}/members/{uid}/permissions/ — reset overrides to role defaults
    """
    permission_classes = [permissions.IsAuthenticated, IsTeamMember]

    def _get_member(self, team_id, uid) -> TeamMember:
        team = get_object_or_404(Team, id=team_id)
        return get_object_or_404(TeamMember, team=team, user_id=uid)

    def get(self, request, team_id, uid):
        member = self._get_member(team_id, uid)
        from .rbac import _resolve_caps
        resolved = _resolve_caps(member.custom_role, member.permissions_json)
        return standardize_response(data={
            "role_name": member.custom_role.name if member.custom_role else member.role,
            "role_capabilities": dict(member.custom_role.capabilities) if member.custom_role else {},
            "overrides": member.permissions_json or {},
            "resolved": resolved,
        })

    def patch(self, request, team_id, uid):
        member = self._get_member(team_id, uid)
        actor_custom_role = get_user_custom_role(team_id=str(team_id), user=request.user)

        grant = request.data.get("grant", [])
        revoke = request.data.get("revoke", [])

        if not isinstance(grant, list) or not isinstance(revoke, list):
            return standardize_response(
                success=False,
                error={"code": "invalid_input", "message": "grant and revoke must be lists."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Prevent owner-role members from having caps revoked by non-owners.
        if member.custom_role and member.custom_role.is_owner_role:
            if not (actor_custom_role and actor_custom_role.is_owner_role) and not request.user.is_superuser:
                return standardize_response(
                    success=False,
                    error={"code": "owner_protected", "message": "Cannot modify permissions of an owner role member."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        allowed, reason = can_grant_revoke_permissions(
            actor=request.user,
            actor_custom_role=actor_custom_role,
            target_permissions_json=member.permissions_json,
            grant=grant,
            revoke=revoke,
        )
        if not allowed:
            return standardize_response(
                success=False,
                error={"code": reason, "message": "Permission change not allowed."},
                status=status.HTTP_403_FORBIDDEN,
            )

        overrides = dict(member.permissions_json or {})
        old_overrides = dict(overrides)

        for cap in grant:
            overrides[cap] = True
        for cap in revoke:
            overrides[cap] = False

        # Remove overrides that match the role baseline (keep json clean).
        role_caps = member.custom_role.capabilities if member.custom_role else {}
        cleaned = {k: v for k, v in overrides.items() if role_caps.get(k) != v}

        member.permissions_json = cleaned or None
        member.save(update_fields=["permissions_json"])

        AuditLog.log(
            actor=request.user, action="permission_change", instance=member,
            changes={"overrides": {"from": old_overrides, "to": cleaned}},
            request=request,
        )
        from .rbac import _resolve_caps
        return standardize_response(data={
            "overrides": member.permissions_json or {},
            "resolved": _resolve_caps(member.custom_role, member.permissions_json),
        })

    def delete(self, request, team_id, uid):
        """Reset all per-member overrides back to role defaults."""
        member = self._get_member(team_id, uid)
        actor_custom_role = get_user_custom_role(team_id=str(team_id), user=request.user)

        if not (actor_custom_role and (actor_custom_role.is_owner_role or
                _resolve_caps(actor_custom_role, None).get("can_change_roles"))):
            if not request.user.is_superuser:
                return standardize_response(
                    success=False,
                    error={"code": "forbidden", "message": "Not permitted."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        member.permissions_json = None
        member.save(update_fields=["permissions_json"])
        AuditLog.log(
            actor=request.user, action="permission_change", instance=member,
            changes={"overrides": "reset_to_role_defaults"}, request=request,
        )
        return standardize_response(data={"overrides": {}, "resolved": _resolve_caps(member.custom_role, None)})


class TeamCapabilitiesView(APIView):
    """GET /teams/{team_id}/capabilities/ — full capabilities for the requesting user."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, team_id):
        team = get_object_or_404(Team, id=team_id)
        caps = compute_team_capabilities(team=team, user=request.user)
        return standardize_response(data={
            "role": caps.role,
            "custom_role_id": caps.custom_role_id,
            "custom_role_name": caps.custom_role_name,
            "is_owner_role": caps.is_owner_role,
            "can_manage_team": caps.can_manage_team,
            "can_invite_members": caps.can_invite_members,
            "can_change_roles": caps.can_change_roles,
            "can_remove_members": caps.can_remove_members,
            "can_delete_team": caps.can_delete_team,
            "can_view_audit_log": caps.can_view_audit_log,
            "can_create_project": caps.can_create_project,
            "can_manage_billing": caps.can_manage_billing,
            "can_access_reports": caps.can_access_reports,
            "can_manage_integrations": caps.can_manage_integrations,
            "assignable_invite_roles": caps.assignable_invite_roles,
            "assignable_custom_role_ids": caps.assignable_custom_role_ids,
        })
