from __future__ import annotations

import secrets
import logging
from django.db import transaction
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import generics, status, permissions
from rest_framework.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404

from config.utils import standardize_response
from apps.core.email import send_transactional_email
from .models import Company, CompanyMember, CompanyInvite, CompanyOnboardingInvite
from .serializers import (
    CompanySerializer,
    CompanyDetailSerializer,
    CompanyMemberSerializer,
    CompanyInviteSerializer,
    CompanyInviteCreateSerializer,
    CompanyCapabilitiesSerializer,
    CompanyOnboardingInviteSerializer,
    CompanyOnboardingSerializer,
    CompanySettingsSerializer,
)
from .permissions import (
    IsSuperUser,
    IsCompanyCEO,
    IsCompanyMemberPermission,
    IsCompanyManagerPermission,
    IsCompanyAdminPermission,
)
from .rbac import (
    compute_company_capabilities,
    get_user_company_role,
    can_change_company_member_role,
    can_remove_company_member,
    assignable_roles_for_company,
)

logger = logging.getLogger(__name__)
User = get_user_model()


# ──────────────────────────────────────────────────────────────
# Company CRUD (super-admin + CEO)
# ──────────────────────────────────────────────────────────────

class CompanyListCreateView(generics.ListCreateAPIView):
    """Super admin: list all / create. CEO: list their own."""
    serializer_class = CompanySerializer

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated(), IsSuperUser()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return Company.objects.all().order_by("-created_at")
        # Return companies where user is CEO or a member
        from django.db.models import Q
        return Company.objects.filter(
            Q(ceo=user) | Q(members__user=user)
        ).distinct().order_by("-created_at")

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        data = CompanySerializer(qs, many=True, context={"request": request}).data
        return standardize_response(data=data)

    def create(self, request, *args, **kwargs):
        serializer = CompanySerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            company = serializer.save(created_by=request.user)
            if company.ceo:
                CompanyMember.objects.get_or_create(
                    company=company,
                    user=company.ceo,
                    defaults={"role": CompanyMember.CEO},
                )
        return standardize_response(
            data=CompanySerializer(company, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class CompanyDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CompanyDetailSerializer
    lookup_field = "id"

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.IsAuthenticated()]
        if self.request.method == "DELETE":
            return [permissions.IsAuthenticated(), IsSuperUser()]
        return [permissions.IsAuthenticated(), IsCompanyCEO()]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return Company.objects.all()
        from django.db.models import Q
        return Company.objects.filter(Q(ceo=user) | Q(members__user=user)).distinct()

    def retrieve(self, request, *args, **kwargs):
        company = self.get_object()
        data = CompanyDetailSerializer(company, context={"request": request}).data
        return standardize_response(data=data)

    def update(self, request, *args, **kwargs):
        company = self.get_object()
        self.check_object_permissions(request, company)
        serializer = CompanySerializer(company, data=request.data, partial=True, context={"request": request})
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            updated = serializer.save()
            if updated.ceo:
                CompanyMember.objects.get_or_create(
                    company=updated,
                    user=updated.ceo,
                    defaults={"role": CompanyMember.CEO},
                )
        return standardize_response(data=CompanySerializer(updated, context={"request": request}).data)

    def destroy(self, request, *args, **kwargs):
        company = self.get_object()
        company.delete()
        return standardize_response(status=status.HTTP_204_NO_CONTENT)


# ──────────────────────────────────────────────────────────────
# Company Members
# ──────────────────────────────────────────────────────────────

class CompanyMembersView(generics.ListAPIView):
    """
    GET  /companies/<id>/members/  → list members (any company member)
    POST /companies/<id>/members/  → add existing user directly (admin+)
    """
    serializer_class = CompanyMemberSerializer

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.IsAuthenticated(), IsCompanyMemberPermission()]
        return [permissions.IsAuthenticated(), IsCompanyAdminPermission()]

    def get_queryset(self):
        return CompanyMember.objects.filter(company_id=self.kwargs["id"]).select_related("user")

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        data = self.get_serializer(qs, many=True).data
        return standardize_response(data=data)

    def post(self, request, id):
        company = get_object_or_404(Company, id=id)
        actor_role = get_user_company_role(company_id=str(id), user=request.user)
        allowed_roles = assignable_roles_for_company(actor_role=actor_role)

        user_id = request.data.get("user_id")
        email = request.data.get("email")
        desired_role = request.data.get("role", CompanyMember.MEMBER)

        if desired_role not in [r[0] for r in CompanyMember.ROLE_CHOICES]:
            return standardize_response(success=False, error="Invalid role.", status=status.HTTP_400_BAD_REQUEST)
        if desired_role not in allowed_roles and not request.user.is_superuser:
            return standardize_response(success=False, error="You cannot assign that role.", status=status.HTTP_403_FORBIDDEN)

        if user_id:
            user = get_object_or_404(User, id=user_id)
        elif email:
            user = User.objects.filter(email=email).first()
            if not user:
                return standardize_response(success=False, error="User not found.", status=status.HTTP_400_BAD_REQUEST)
        else:
            return standardize_response(success=False, error="user_id or email required.", status=status.HTTP_400_BAD_REQUEST)

        member, created = CompanyMember.objects.get_or_create(
            company=company,
            user=user,
            defaults={"role": desired_role, "invited_by": request.user},
        )
        if not created:
            member.role = desired_role
            member.save(update_fields=["role"])

        return standardize_response(
            data=CompanyMemberSerializer(member).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class CompanyMemberDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    PATCH  /companies/<id>/members/<uid>/  → change role (admin+)
    DELETE /companies/<id>/members/<uid>/  → remove member (admin+)
    """
    serializer_class = CompanyMemberSerializer
    permission_classes = [permissions.IsAuthenticated, IsCompanyAdminPermission]
    lookup_field = "user_id"
    lookup_url_kwarg = "uid"

    def get_queryset(self):
        return CompanyMember.objects.filter(company_id=self.kwargs["id"]).select_related("user")

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        company_id = str(self.kwargs["id"])
        actor_role = get_user_company_role(company_id=company_id, user=request.user)

        if "role" in request.data:
            new_role = request.data["role"]
            allowed, reason = can_change_company_member_role(
                company_id=company_id,
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
                    status=status.HTTP_403_FORBIDDEN,
                )
            instance.role = new_role
            instance.save(update_fields=["role"])

        return standardize_response(data=CompanyMemberSerializer(instance).data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        company_id = str(self.kwargs["id"])
        actor_role = get_user_company_role(company_id=company_id, user=request.user)
        allowed, reason = can_remove_company_member(
            company_id=company_id,
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


# ──────────────────────────────────────────────────────────────
# Company Invites (email-based invite flow)
# ──────────────────────────────────────────────────────────────

class CompanyInviteListCreateView(generics.GenericAPIView):
    """
    GET  /companies/<id>/invites/   → list pending invites (admin+)
    POST /companies/<id>/invites/   → send email invite (manager+)
    """

    def get_permissions(self):
        return [permissions.IsAuthenticated(), IsCompanyManagerPermission()]

    def get(self, request, id):
        company = get_object_or_404(Company, id=id)
        actor_role = get_user_company_role(company_id=str(id), user=request.user)
        # Managers only see their own sent invites; admin+ see all
        if request.user.is_superuser or actor_role in (CompanyMember.CEO, CompanyMember.ADMIN):
            invites = CompanyInvite.objects.filter(company=company)
        else:
            invites = CompanyInvite.objects.filter(company=company, invited_by=request.user)
        data = CompanyInviteSerializer(invites, many=True, context={"request": request}).data
        return standardize_response(data=data)

    def post(self, request, id):
        company = get_object_or_404(Company, id=id)
        actor_role = get_user_company_role(company_id=str(id), user=request.user)
        allowed_roles = assignable_roles_for_company(actor_role=actor_role)

        serializer = CompanyInviteCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        desired_role = serializer.validated_data["role"]

        if desired_role not in allowed_roles and not request.user.is_superuser:
            return standardize_response(
                success=False,
                error=f"You cannot invite someone as '{desired_role}'.",
                status=status.HTTP_403_FORBIDDEN,
            )

        # If already a member, skip
        if CompanyMember.objects.filter(company=company, user__email=email).exists():
            return standardize_response(
                success=False, error="This user is already a member.", status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            # Re-invite: delete old expired/pending invite and create fresh
            CompanyInvite.objects.filter(company=company, email=email, status__in=["pending", "expired"]).delete()
            invite = CompanyInvite.objects.create(
                company=company,
                email=email,
                role=desired_role,
                invited_by=request.user,
            )

        self._send_invite_email(invite=invite, inviter=request.user, company=company)

        data = CompanyInviteSerializer(invite, context={"request": request}).data
        return standardize_response(data=data, status=status.HTTP_201_CREATED)

    def _send_invite_email(self, *, invite, inviter, company):
        from django.conf import settings as django_settings
        base = (getattr(django_settings, "FRONTEND_BASE_URL", "") or "http://localhost:3000").rstrip("/")
        link = f"{base}/company-invite/{invite.token}"
        role_display = dict(CompanyMember.ROLE_CHOICES).get(invite.role, invite.role)
        subject = f"You're invited to join {company.name} on FlowTeam"
        body = (
            f"Hi,\n\n"
            f"{inviter.full_name or inviter.email} has invited you to join "
            f"{company.name} as {role_display} on FlowTeam.\n\n"
            f"Accept your invite (valid 7 days):\n{link}\n\n"
            f"If you don't have an account yet, you'll be prompted to create one.\n\n"
            f"— FlowTeam"
        )
        result = send_transactional_email(to_email=invite.email, subject=subject, text=body)
        if not result.ok:
            logger.warning(
                "Company invite email failed",
                extra={"invite_id": str(invite.id), "company_id": str(company.id), "error": result.error},
            )


class CompanyInviteDeleteView(generics.DestroyAPIView):
    """DELETE /companies/<id>/invites/<invite_id>/  → revoke pending invite (manager can revoke own; admin+ can revoke any)"""
    permission_classes = [permissions.IsAuthenticated, IsCompanyManagerPermission]

    def get_object(self):
        return get_object_or_404(CompanyInvite, id=self.kwargs["invite_id"], company_id=self.kwargs["id"])

    def destroy(self, request, *args, **kwargs):
        invite = self.get_object()
        actor_role = get_user_company_role(company_id=str(self.kwargs["id"]), user=request.user)
        # Managers can only revoke invites they sent themselves
        if not request.user.is_superuser and actor_role == CompanyMember.MANAGER:
            if invite.invited_by_id != request.user.id:
                return standardize_response(
                    success=False,
                    error="You can only revoke invites you sent.",
                    status=status.HTTP_403_FORBIDDEN,
                )
        invite.delete()
        return standardize_response(status=status.HTTP_204_NO_CONTENT)


class CompanyInviteAcceptView(generics.GenericAPIView):
    """
    POST /companies/invites/<token>/accept/
    Public endpoint. If user is authenticated, joins directly.
    If not, returns company + role info so the frontend can redirect to register.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, token):
        """Preview invite details before accepting (so frontend can show context)."""
        invite = get_object_or_404(CompanyInvite, token=token)
        if invite.status != "pending":
            return standardize_response(
                success=False,
                error=f"This invite has already been {invite.status}.",
                status=status.HTTP_400_BAD_REQUEST,
            )
        if invite.expires_at and invite.expires_at < timezone.now():
            invite.status = "expired"
            invite.save(update_fields=["status"])
            return standardize_response(success=False, error="This invite has expired.", status=status.HTTP_410_GONE)

        return standardize_response(data={
            "email": invite.email,
            "role": invite.role,
            "company_name": invite.company.name,
            "company_slug": invite.company.slug,
            "invite_id": str(invite.id),
        })

    def post(self, request, token):
        invite = get_object_or_404(CompanyInvite, token=token)

        if invite.status != "pending":
            return standardize_response(
                success=False,
                error=f"This invite has already been {invite.status}.",
                status=status.HTTP_400_BAD_REQUEST,
            )
        if invite.expires_at and invite.expires_at < timezone.now():
            invite.status = "expired"
            invite.save(update_fields=["status"])
            return standardize_response(success=False, error="This invite has expired.", status=status.HTTP_410_GONE)

        # Determine the user to join
        if request.user.is_authenticated:
            user = request.user
            # Enforce email match unless superuser
            if not request.user.is_superuser and user.email.lower() != invite.email.lower():
                return standardize_response(
                    success=False,
                    error="This invite was sent to a different email address.",
                    status=status.HTTP_403_FORBIDDEN,
                )
        else:
            user = User.objects.filter(email__iexact=invite.email).first()
            if not user:
                # User hasn't registered yet — tell frontend to redirect to register
                return standardize_response(
                    success=False,
                    error="account_required",
                    data={"redirect_to": "register", "email": invite.email, "token": token},
                    status=status.HTTP_202_ACCEPTED,
                )

        with transaction.atomic():
            member, created = CompanyMember.objects.get_or_create(
                company=invite.company,
                user=user,
                defaults={"role": invite.role, "invited_by": invite.invited_by},
            )
            if not created and member.role != invite.role:
                # Upgrade role if invite offers a higher one (preserve existing if higher)
                role_rank = {CompanyMember.CEO: 5, CompanyMember.ADMIN: 4, CompanyMember.MANAGER: 3, CompanyMember.MEMBER: 2, CompanyMember.VIEWER: 1}
                if role_rank.get(invite.role, 0) > role_rank.get(member.role, 0):
                    member.role = invite.role
                    member.save(update_fields=["role"])

            invite.status = "accepted"
            invite.accepted_at = timezone.now()
            invite.save(update_fields=["status", "accepted_at"])

        return standardize_response(data={
            "message": "You have joined the company.",
            "company_id": str(invite.company.id),
            "company_name": invite.company.name,
            "role": member.role,
        })


# ──────────────────────────────────────────────────────────────
# Company Capabilities
# ──────────────────────────────────────────────────────────────

class CompanyCapabilitiesView(generics.GenericAPIView):
    """GET /companies/<id>/capabilities/ → returns role + permission flags."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, id):
        company = get_object_or_404(Company, id=id)
        caps = compute_company_capabilities(company=company, user=request.user)
        return standardize_response(data={
            "role": caps.role,
            "can_manage_company": caps.can_manage_company,
            "can_invite_members": caps.can_invite_members,
            "can_change_roles": caps.can_change_roles,
            "can_remove_members": caps.can_remove_members,
            "can_create_teams": caps.can_create_teams,
            "can_view_members": caps.can_view_members,
            "assignable_invite_roles": caps.assignable_invite_roles,
        })


# ──────────────────────────────────────────────────────────────
# Teams, Onboarding, Settings, Domain (existing, preserved)
# ──────────────────────────────────────────────────────────────

class CompanyTeamsView(generics.GenericAPIView):
    """
    GET  /companies/<id>/teams/  → list company teams (any member)
    POST /companies/<id>/teams/  → create a new team under this company (admin+)
    """

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.IsAuthenticated(), IsCompanyMemberPermission()]
        return [permissions.IsAuthenticated(), IsCompanyAdminPermission()]

    def get(self, request, *args, **kwargs):
        from apps.teams.serializers import TeamSerializer
        company = get_object_or_404(Company, id=self.kwargs["id"])
        teams = company.teams.all()
        data = TeamSerializer(teams, many=True, context={"request": request}).data
        return standardize_response(data=data)

    def post(self, request, id):
        from apps.teams.models import Team, TeamMember
        from apps.teams.serializers import TeamSerializer
        company = get_object_or_404(Company, id=id)
        name = (request.data.get("name") or "").strip()
        if not name:
            return standardize_response(success=False, error="name is required.", status=status.HTTP_400_BAD_REQUEST)
        with transaction.atomic():
            team = Team.objects.create(name=name, company=company, created_by=request.user)
            TeamMember.objects.create(team=team, user=request.user, role=TeamMember.ADMIN)
            if company.ceo and company.ceo != request.user:
                TeamMember.objects.get_or_create(
                    team=team, user=company.ceo, defaults={"role": TeamMember.CEO}
                )
        return standardize_response(
            data=TeamSerializer(team, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class CompanyAssignTeamView(generics.GenericAPIView):
    """Super admin: assign/unassign a team to a company."""
    permission_classes = [permissions.IsAuthenticated, IsSuperUser]

    def post(self, request, id):
        from apps.teams.models import Team
        company = Company.objects.get(id=id)
        team_id = request.data.get("team_id")
        if not team_id:
            return standardize_response(success=False, error="team_id required", status=status.HTTP_400_BAD_REQUEST)
        team = Team.objects.filter(id=team_id).first()
        if not team:
            return standardize_response(success=False, error="Team not found", status=status.HTTP_404_NOT_FOUND)
        team.company = company
        team.save(update_fields=["company"])
        return standardize_response(data={"message": f"Team '{team.name}' assigned to '{company.name}'"})

    def delete(self, request, id):
        from apps.teams.models import Team
        team_id = request.data.get("team_id")
        team = Team.objects.filter(id=team_id, company_id=id).first()
        if not team:
            return standardize_response(success=False, error="Team not found in this company", status=status.HTTP_404_NOT_FOUND)
        team.company = None
        team.save(update_fields=["company"])
        return standardize_response(data={"message": f"Team '{team.name}' removed from company"})


class CompanyOnboardingView(generics.GenericAPIView):
    """Multi-step onboarding wizard. POST /companies/<id>/onboarding/"""
    permission_classes = [permissions.IsAuthenticated, IsSuperUser]

    def get_company(self, id):
        return Company.objects.get(id=id)

    def post(self, request, id):
        company = self.get_company(id)
        serializer = CompanyOnboardingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        step = data["step"]

        with transaction.atomic():
            if step == "company_details":
                self._handle_company_details(company, data)
            elif step == "ceo_assignment":
                self._handle_ceo_assignment(company, data, request)
            elif step == "teams_setup":
                self._handle_teams_setup(company, data, request)
            elif step == "email_domain":
                self._handle_email_domain(company, data)
            elif step == "review":
                self._handle_review(company)

            if company.onboarding_status == "pending":
                company.onboarding_status = "in_progress"
            if step == "review":
                company.onboarding_status = "active"
                company.onboarding_completed_at = timezone.now()

            company.save()

        return standardize_response(
            data=CompanyDetailSerializer(company, context={"request": request}).data
        )

    def _handle_company_details(self, company, data):
        for field in ("name", "website", "industry", "size", "country", "notes"):
            if field in data and data[field] is not None:
                setattr(company, field, data[field])

    def _handle_ceo_assignment(self, company, data, request):
        if data.get("ceo_id"):
            ceo_user = data["ceo_id"]
            company.ceo = ceo_user
            CompanyMember.objects.get_or_create(
                company=company,
                user=ceo_user,
                defaults={"role": CompanyMember.CEO},
            )

        invite_email = (data.get("invite_ceo_email") or "").strip()
        if invite_email:
            # Use CompanyInvite (tokenized link) so the CEO lands on the
            # /company-invite/<token> page which handles register-then-join.
            CompanyInvite.objects.filter(
                company=company, email=invite_email, status__in=["pending", "expired"]
            ).delete()
            invite = CompanyInvite.objects.create(
                company=company,
                email=invite_email,
                role=CompanyMember.CEO,
                invited_by=request.user,
            )
            self._send_ceo_invite_email(invite=invite, inviter=request.user, company=company)

    def _handle_teams_setup(self, company, data, request):
        from apps.teams.models import Team, TeamMember

        for team_id in data.get("team_ids", []):
            team = Team.objects.filter(id=team_id).first()
            if team:
                team.company = company
                team.save(update_fields=["company"])

        for team_name in data.get("team_names", []):
            if not team_name.strip():
                continue
            team, created = Team.objects.get_or_create(
                name=team_name.strip(),
                company=company,
                defaults={"created_by": request.user},
            )
            if created and company.ceo:
                TeamMember.objects.get_or_create(
                    team=team,
                    user=company.ceo,
                    defaults={"role": TeamMember.CEO},
                )

    def _handle_email_domain(self, company, data):
        domain = (data.get("email_domain") or "").strip().lower()
        if domain and company.email_domain != domain:
            company.email_domain = domain
            company.email_domain_verified = False
            company.email_domain_verification_token = secrets.token_hex(16)

    def _handle_review(self, company):
        pass

    def _send_ceo_invite_email(self, *, invite, inviter, company):
        from django.conf import settings as django_settings
        base = (getattr(django_settings, "FRONTEND_BASE_URL", "") or "http://localhost:3000").rstrip("/")
        link = f"{base}/company-invite/{invite.token}"
        subject = f"You've been invited to lead {company.name} on FlowTeam"
        body = (
            f"Hi,\n\n"
            f"{inviter.full_name or inviter.email} has invited you to join "
            f"{company.name} as CEO on FlowTeam.\n\n"
            f"Accept your invite (valid 7 days):\n{link}\n\n"
            f"If you don't have an account yet, you'll be prompted to create one.\n\n"
            f"— FlowTeam"
        )
        result = send_transactional_email(to_email=invite.email, subject=subject, text=body)
        if not result.ok:
            logger.warning(
                "CEO invite email failed",
                extra={"invite_id": str(invite.id), "error": result.error},
            )

    def _send_onboarding_invite_email(self, *, company, to_email, role, inviter):
        from django.conf import settings as django_settings
        base = (getattr(django_settings, "FRONTEND_BASE_URL", "") or "http://localhost:3000").rstrip("/")
        subject = f"You've been invited to join {company.name} on FlowTeam"
        body = (
            f"Hi,\n\n"
            f"{inviter.full_name or inviter.email} has invited you to join "
            f"{company.name} as {role} on FlowTeam.\n\n"
            f"Get started here: {base}/register\n\n"
            f"FlowTeam"
        )
        result = send_transactional_email(to_email=to_email, subject=subject, text=body)
        if not result.ok:
            logger.warning(
                "Onboarding invite email failed",
                extra={"company_id": str(company.id), "recipient": to_email, "error": result.error},
            )


class CompanyOnboardingInvitesView(generics.ListAPIView):
    """List all onboarding invites for a company."""
    permission_classes = [permissions.IsAuthenticated, IsSuperUser]
    serializer_class = CompanyOnboardingInviteSerializer

    def list(self, request, id):
        company = Company.objects.get(id=id)
        invites = company.onboarding_invites.all()
        data = CompanyOnboardingInviteSerializer(invites, many=True).data
        return standardize_response(data=data)


class CompanySettingsView(generics.GenericAPIView):
    """GET/PATCH /companies/<id>/settings/"""
    permission_classes = [permissions.IsAuthenticated, IsCompanyAdminPermission]

    def get(self, request, id):
        company = get_object_or_404(Company, id=id)
        return standardize_response(data=company.settings_json or {})

    def patch(self, request, id):
        company = get_object_or_404(Company, id=id)
        incoming = request.data
        if not isinstance(incoming, dict):
            return standardize_response(
                success=False, error="settings must be a JSON object", status=status.HTTP_400_BAD_REQUEST
            )
        merged = {**(company.settings_json or {}), **incoming}
        company.settings_json = merged
        company.save(update_fields=["settings_json", "updated_at"])
        return standardize_response(data=company.settings_json)


class CompanyDomainVerifyView(generics.GenericAPIView):
    """POST /companies/<id>/verify-domain/"""
    permission_classes = [permissions.IsAuthenticated, IsCompanyAdminPermission]

    def post(self, request, id):
        company = get_object_or_404(Company, id=id)
        if not company.email_domain or not company.email_domain_verification_token:
            return standardize_response(
                success=False, error="No domain configured for this company.", status=status.HTTP_400_BAD_REQUEST
            )

        confirmed = request.data.get("confirmed", False)
        if confirmed:
            company.email_domain_verified = True
            company.save(update_fields=["email_domain_verified", "updated_at"])
            return standardize_response(data={"email_domain_verified": True, "email_domain": company.email_domain})

        token = company.email_domain_verification_token
        return standardize_response(data={
            "email_domain": company.email_domain,
            "email_domain_verified": False,
            "verification_token": token,
            "instructions": (
                f"Add a DNS TXT record to {company.email_domain} with the value: "
                f"flowteam-verification={token}"
            ),
        })


class CompanyAISettingsView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCompanyAdminPermission]

    def get(self, request, id):
        if request.user.is_superuser:
            raise PermissionDenied("Super admins cannot view company API details.")
        company = get_object_or_404(Company, id=id)
        from apps.ai.models import CompanyAIAccess, CompanyAICredits
        access, _ = CompanyAIAccess.objects.get_or_create(company=company)
        credits_status, _ = CompanyAICredits.objects.get_or_create(company=company)

        return standardize_response(data={
            "integration_mode": access.integration_mode,
            "byok_provider": access.byok_provider or "",
            "byok_model_override": access.byok_model_override or "",
            "has_api_key": bool(access.byok_api_key_encrypted),
            "total_allocated": float(credits_status.total_allocated),
            "credits_used": float(credits_status.credits_used),
            "remaining_credits": float(credits_status.remaining_credits),
            "alert_threshold_percentage": credits_status.alert_threshold_percentage
        })

    def patch(self, request, id):
        if request.user.is_superuser:
            raise PermissionDenied("Super admins cannot modify company API details.")
        from decimal import Decimal
        company = get_object_or_404(Company, id=id)
        from apps.ai.models import CompanyAIAccess, CompanyAICredits
        access, _ = CompanyAIAccess.objects.get_or_create(company=company)
        credits_status, _ = CompanyAICredits.objects.get_or_create(company=company)

        integration_mode = request.data.get("integration_mode")
        if integration_mode in [CompanyAIAccess.MODE_PLATFORM, CompanyAIAccess.MODE_BYOK]:
            access.integration_mode = integration_mode

        if "byok_provider" in request.data:
            access.byok_provider = request.data["byok_provider"] or None

        if "byok_model_override" in request.data:
            access.byok_model_override = request.data["byok_model_override"] or None

        if "byok_api_key" in request.data:
            key = request.data["byok_api_key"]
            if key:
                access.set_api_key(key)

        access.save()

        if "alert_threshold_percentage" in request.data:
            try:
                credits_status.alert_threshold_percentage = int(request.data["alert_threshold_percentage"])
            except ValueError:
                pass

        # Allow budget settings updates by superuser or by company admin/CEO when in BYOK mode
        if (request.user.is_superuser or access.integration_mode == CompanyAIAccess.MODE_BYOK) and "total_allocated" in request.data:
            try:
                credits_status.total_allocated = Decimal(str(request.data["total_allocated"]))
            except Exception:
                pass

        credits_status.save()

        return standardize_response(data={
            "integration_mode": access.integration_mode,
            "byok_provider": access.byok_provider or "",
            "byok_model_override": access.byok_model_override or "",
            "has_api_key": bool(access.byok_api_key_encrypted),
            "total_allocated": float(credits_status.total_allocated),
            "credits_used": float(credits_status.credits_used),
            "remaining_credits": float(credits_status.remaining_credits),
            "alert_threshold_percentage": credits_status.alert_threshold_percentage
        })
