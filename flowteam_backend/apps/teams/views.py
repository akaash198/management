from rest_framework import generics, status, permissions
from rest_framework.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404
from .models import Team, TeamMember, TeamInvite
from .serializers import TeamSerializer, TeamMemberSerializer, TeamInviteSerializer, TeamInvitePreviewSerializer
import logging
from django.conf import settings
from apps.core.email import send_transactional_email
from .permissions import IsTeamAdmin, IsTeamCEO, IsTeamMember, IsTeamManager
from .rbac import (
    can_change_member_role,
    can_remove_member,
    compute_team_capabilities,
    get_user_team_role,
    is_valid_team_role,
    normalize_team_role,
)
from config.utils import standardize_response
from django.db import transaction
from django.contrib.auth import get_user_model

User = get_user_model()

# TeamCapabilitiesView is now in role_views.py — kept here as a passthrough alias
# to avoid breaking any direct imports elsewhere.
from .role_views import TeamCapabilitiesView  # noqa: F401, E402

class TeamListCreateView(generics.ListCreateAPIView):
    serializer_class = TeamSerializer

    def get_queryset(self):
        if self.request.user.is_superuser:
            return Team.objects.all()
        return Team.objects.filter(members__user=self.request.user)

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return standardize_response(data=serializer.data)

    def perform_create(self, serializer):
        from .models import CustomRole, DEFAULT_ROLE_CAPABILITIES, ALL_TEAM_CAPABILITIES
        SYSTEM_ROLES = [
            {"slug": "ceo",     "name": "CEO",      "level": 0,  "is_owner_role": True},
            {"slug": "admin",   "name": "Admin",    "level": 10, "is_owner_role": False},
            {"slug": "manager", "name": "Manager",  "level": 30, "is_owner_role": False},
            {"slug": "member",  "name": "Employee", "level": 50, "is_owner_role": False},
            {"slug": "viewer",  "name": "Viewer",   "level": 80, "is_owner_role": False},
        ]
        with transaction.atomic():
            team = serializer.save(created_by=self.request.user)
            ceo_custom_role = None
            for role_def in SYSTEM_ROLES:
                caps = DEFAULT_ROLE_CAPABILITIES.get(role_def["slug"], {})
                full_caps = {c: bool(caps.get(c, False)) for c in ALL_TEAM_CAPABILITIES}
                cr = CustomRole.objects.create(
                    team=team,
                    name=role_def["name"],
                    slug=role_def["slug"],
                    level=role_def["level"],
                    is_owner_role=role_def["is_owner_role"],
                    is_system=True,
                    capabilities=full_caps,
                )
                if role_def["slug"] == TeamMember.CEO:
                    ceo_custom_role = cr
            TeamMember.objects.create(
                team=team,
                user=self.request.user,
                role=TeamMember.CEO,
                custom_role=ceo_custom_role,
            )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return standardize_response(data=serializer.data, status=status.HTTP_201_CREATED)

class TeamDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TeamSerializer
    lookup_field = "id"

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.IsAuthenticated(), IsTeamMember()]
        if self.request.method == "DELETE":
            return [permissions.IsAuthenticated(), IsTeamCEO()]
        return [permissions.IsAuthenticated(), IsTeamAdmin()]

    def get_queryset(self):
        return Team.objects.all()

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return standardize_response(data=serializer.data)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return standardize_response(data=serializer.data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return standardize_response(status=status.HTTP_204_NO_CONTENT)

class TeamMembersView(generics.ListCreateAPIView):
    serializer_class = TeamMemberSerializer

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.IsAuthenticated(), IsTeamMember()]
        # Allow CEO/Admin/Manager (and superusers) to add members.
        return [permissions.IsAuthenticated(), IsTeamManager()]

    def get_queryset(self):
        return TeamMember.objects.filter(team_id=self.kwargs["id"])

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return standardize_response(data=serializer.data)

    def create(self, request, *args, **kwargs):
        team = get_object_or_404(Team, id=self.kwargs["id"])

        from .plans import get_team_limits
        limits = get_team_limits(team)
        current_member_count = TeamMember.objects.filter(team=team).count()
        if current_member_count >= int(limits.get("max_members", 5)):
            return standardize_response(
                success=False,
                error={"code": "plan_limit", "message": "Team member limit reached for your plan."},
                status=status.HTTP_402_PAYMENT_REQUIRED,
            )

        user_id = request.data.get("user_id") or request.data.get("user")
        email = request.data.get("email")
        desired_role = normalize_team_role(request.data.get("role")) if request.data.get("role") else TeamMember.MEMBER
        if not is_valid_team_role(desired_role):
            return standardize_response(
                success=False,
                error={"code": "invalid_role", "message": "Invalid role."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if user_id:
            user = get_object_or_404(User, id=user_id)
        elif email:
            user = User.objects.filter(email=email).first()
            if not user:
                return standardize_response(success=False, error="User not found", status=status.HTTP_400_BAD_REQUEST)
        else:
            return standardize_response(success=False, error="user_id or email is required", status=status.HTTP_400_BAD_REQUEST)

        actor_role = get_user_team_role(team_id=str(team.id), user=request.user)

        # Managers can add members, but only at/under "member" by default.
        allowed_roles = compute_team_capabilities(team=team, user=request.user).assignable_invite_roles
        if desired_role not in allowed_roles and not request.user.is_superuser:
            return standardize_response(
                success=False,
                error={"code": "forbidden_role", "message": "You are not allowed to assign that role."},
                status=status.HTTP_403_FORBIDDEN,
            )

        member, created = TeamMember.objects.get_or_create(
            team=team,
            user=user,
            defaults={"role": desired_role, "invited_by": request.user},
        )

        # If member already exists, treat role change as a separate, protected operation.
        if not created and member.role != desired_role:
            allowed, reason = can_change_member_role(
                team_id=str(team.id),
                actor=request.user,
                actor_role=actor_role,
                target_user_id=str(user.id),
                current_role=member.role,
                new_role=desired_role,
            )
            if not allowed:
                return standardize_response(
                    success=False,
                    error={"code": reason, "message": "Role change not permitted."},
                    status=status.HTTP_403_FORBIDDEN if reason not in ("invalid_role",) else status.HTTP_400_BAD_REQUEST,
                )
            member.role = desired_role
            member.save(update_fields=["role"])

        return standardize_response(data=TeamMemberSerializer(member).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

class TeamMemberDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TeamMemberSerializer
    permission_classes = [permissions.IsAuthenticated, IsTeamAdmin]
    lookup_field = "user_id"
    lookup_url_kwarg = "uid"

    def get_queryset(self):
        return TeamMember.objects.filter(team_id=self.kwargs["id"])

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        team_id = str(self.kwargs["id"])
        actor_role = get_user_team_role(team_id=team_id, user=request.user)

        if "role" in request.data:
            new_role = normalize_team_role(request.data.get("role"))
            allowed, reason = can_change_member_role(
                team_id=team_id,
                actor=request.user,
                actor_role=actor_role,
                target_user_id=str(instance.user_id),
                current_role=instance.role,
                new_role=new_role,
            )
            if not allowed:
                return standardize_response(
                    success=False,
                    error={"code": reason, "message": "Role change not permitted."},
                    status=status.HTTP_403_FORBIDDEN if reason not in ("invalid_role",) else status.HTTP_400_BAD_REQUEST,
                )

        # Only CEO/Admin can set granular permission overrides.
        if "permissions_json" in request.data:
            is_admin_or_above = actor_role in (TeamMember.CEO, TeamMember.ADMIN) or request.user.is_superuser
            if not is_admin_or_above:
                return standardize_response(
                    success=False,
                    error={"code": "forbidden", "message": "Only admins can set permission overrides."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return standardize_response(data=serializer.data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        team_id = str(self.kwargs["id"])
        actor_role = get_user_team_role(team_id=team_id, user=request.user)
        allowed, reason = can_remove_member(
            team_id=team_id,
            actor=request.user,
            actor_role=actor_role,
            target_user_id=str(instance.user_id),
            target_role=instance.role,
        )
        if not allowed:
            return standardize_response(
                success=False,
                error={"code": reason, "message": "Remove not permitted."},
                status=status.HTTP_403_FORBIDDEN,
            )
        instance.delete()
        return standardize_response(status=status.HTTP_204_NO_CONTENT)

class InviteCreateView(generics.CreateAPIView):
    serializer_class = TeamInviteSerializer
    permission_classes = [permissions.IsAuthenticated, IsTeamManager]

    def perform_create(self, serializer):
        team = get_object_or_404(Team, id=self.kwargs["id"])
        from .plans import get_team_limits
        limits = get_team_limits(team)
        current_member_count = TeamMember.objects.filter(team=team).count()
        pending_invites = TeamInvite.objects.filter(team=team, is_accepted=False).count()
        if current_member_count + pending_invites >= int(limits.get("max_members", 5)):
            raise PermissionDenied("Team member limit reached for your plan.")

        desired_role = normalize_team_role(serializer.validated_data.get("role"))
        if not is_valid_team_role(desired_role):
            raise PermissionDenied("Invalid role.")

        allowed_roles = compute_team_capabilities(team=team, user=self.request.user).assignable_invite_roles
        if desired_role not in allowed_roles and not self.request.user.is_superuser:
            raise PermissionDenied("You are not allowed to assign that role.")

        invite = serializer.save(team=team, invited_by=self.request.user, role=desired_role)
        invite_link = TeamInviteSerializer(context={"request": self.request}).get_invite_link(invite)
        logger = logging.getLogger(__name__)

        company_name = getattr(getattr(team, "company", None), "name", None) or team.name
        inviter_name = self.request.user.full_name or self.request.user.email

        subject = f"Invitation to join {company_name} on CowrkFlow"
        message = (
            f"Hello,\n\n"
            f"{inviter_name} invited you to join {company_name} on CowrkFlow.\n\n"
            f"To accept the invitation, open this link:\n{invite_link}\n\n"
            f"If you don’t have an account yet, you’ll be prompted to create one using this email address.\n\n"
            f"Thanks,\n"
            f"CowrkFlow\n"
        )

        result = send_transactional_email(to_email=invite.email, subject=subject, text=message)
        if result.ok:
            logger.info(
                "Team invite email dispatched",
                extra={"invite_id": str(invite.id), "team_id": str(team.id), "provider": result.provider},
            )
        else:
            # Don't block invite creation; surface the invite_link via API response.
            logger.warning(
                "Failed to send team invite email",
                extra={
                    "invite_id": str(invite.id),
                    "team_id": str(team.id),
                    "recipient": invite.email,
                    "provider": result.provider,
                    "error": result.error,
                },
            )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return standardize_response(data=serializer.data, status=status.HTTP_201_CREATED)

class AcceptInviteView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, token):
        invite = get_object_or_404(TeamInvite, id=token, is_accepted=False)

        if (request.user.email or "").strip().lower() != (invite.email or "").strip().lower():
            return standardize_response(
                success=False,
                error={"code": "email_mismatch", "message": "This invite is for a different email address."},
                status=status.HTTP_403_FORBIDDEN,
            )

        with transaction.atomic():
            member, _created = TeamMember.objects.get_or_create(
                team=invite.team,
                user=request.user,
                defaults={
                    "role": invite.role,
                    "custom_role": invite.custom_role,
                    "invited_by": invite.invited_by,
                },
            )
            invite.is_accepted = True
            invite.save()

        return standardize_response(data={"message": "Invite accepted successfully", "member": TeamMemberSerializer(member).data})


class InvitePreviewView(generics.RetrieveAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = TeamInvitePreviewSerializer
    lookup_url_kwarg = "token"

    def get_queryset(self):
        return TeamInvite.objects.select_related("team", "invited_by", "custom_role").filter(is_accepted=False)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return standardize_response(data=serializer.data)
