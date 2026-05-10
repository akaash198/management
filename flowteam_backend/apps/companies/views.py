from __future__ import annotations

import secrets
import logging
from django.db import transaction
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import generics, status, permissions

from config.utils import standardize_response
from apps.core.email import send_transactional_email
from .models import Company, CompanyMember, CompanyOnboardingInvite
from .serializers import (
    CompanySerializer,
    CompanyDetailSerializer,
    CompanyMemberSerializer,
    CompanyOnboardingInviteSerializer,
    CompanyOnboardingSerializer,
    CompanySettingsSerializer,
)
from .permissions import IsSuperUser, IsCompanyCEO

logger = logging.getLogger(__name__)
User = get_user_model()


class CompanyListCreateView(generics.ListCreateAPIView):
    """
    Super admin: list all companies or create one.
    CEO: list only their own companies.
    """
    serializer_class = CompanySerializer

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated(), IsSuperUser()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return Company.objects.all().order_by("-created_at")
        return Company.objects.filter(ceo=user).order_by("-created_at")

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
                CompanyMember.objects.get_or_create(company=company, user=company.ceo)
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
        return Company.objects.filter(ceo=user)

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
                CompanyMember.objects.get_or_create(company=updated, user=updated.ceo)
        return standardize_response(data=CompanySerializer(updated, context={"request": request}).data)

    def destroy(self, request, *args, **kwargs):
        company = self.get_object()
        company.delete()
        return standardize_response(status=status.HTTP_204_NO_CONTENT)


class CompanyTeamsView(generics.ListAPIView):
    """List teams belonging to a company. Accessible by superusers and the company CEO."""

    def get_permissions(self):
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        return Company.objects.get(id=self.kwargs["id"]).teams.all()

    def list(self, request, *args, **kwargs):
        from apps.teams.serializers import TeamSerializer
        company = Company.objects.get(id=self.kwargs["id"])
        if not request.user.is_superuser and company.ceo_id != request.user.id:
            return standardize_response(success=False, error="Forbidden", status=status.HTTP_403_FORBIDDEN)
        teams = company.teams.all()
        data = TeamSerializer(teams, many=True, context={"request": request}).data
        return standardize_response(data=data)


class CompanyAssignTeamView(generics.GenericAPIView):
    """Super admin or CEO: assign/unassign a team to a company."""
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
    """
    Multi-step onboarding wizard endpoint.
    POST /companies/<id>/onboarding/  { step, ...step_data }

    Each step is idempotent — calling it again with the same data is safe.
    The company's onboarding_status advances automatically.
    """
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

            # Advance onboarding status
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
            CompanyMember.objects.get_or_create(company=company, user=ceo_user)

        invite_email = (data.get("invite_ceo_email") or "").strip()
        if invite_email:
            invite, created = CompanyOnboardingInvite.objects.get_or_create(
                company=company,
                email=invite_email,
                defaults={"role": "ceo", "invited_by": request.user},
            )
            if created or invite.status == "pending":
                self._send_onboarding_invite_email(
                    company=company,
                    to_email=invite_email,
                    role="CEO",
                    inviter=request.user,
                )

    def _handle_teams_setup(self, company, data, request):
        from apps.teams.models import Team, TeamMember

        # Assign existing teams
        for team_id in data.get("team_ids", []):
            team = Team.objects.filter(id=team_id).first()
            if team:
                team.company = company
                team.save(update_fields=["company"])

        # Create new teams
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
        if domain:
            # Generate a verification token; verification itself is out-of-band (DNS TXT record).
            if company.email_domain != domain:
                company.email_domain = domain
                company.email_domain_verified = False
                company.email_domain_verification_token = secrets.token_hex(16)

    def _handle_review(self, company):
        # Placeholder for any finalization side-effects (webhooks, notifications, etc.)
        pass

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
    """
    GET  /companies/<id>/settings/   → returns settings_json
    PATCH /companies/<id>/settings/  → deep-merges provided keys into settings_json
    """
    permission_classes = [permissions.IsAuthenticated, IsSuperUser]

    def get(self, request, id):
        company = Company.objects.get(id=id)
        return standardize_response(data=company.settings_json or {})

    def patch(self, request, id):
        company = Company.objects.get(id=id)
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
    """
    POST /companies/<id>/verify-domain/
    Checks that the TXT record <company.email_domain_verification_token> exists on the domain.
    In production, perform a real DNS lookup; for now we accept a manual confirmation flag.
    """
    permission_classes = [permissions.IsAuthenticated, IsSuperUser]

    def post(self, request, id):
        company = Company.objects.get(id=id)
        if not company.email_domain or not company.email_domain_verification_token:
            return standardize_response(
                success=False, error="No domain configured for this company.", status=status.HTTP_400_BAD_REQUEST
            )

        # In a real implementation, do a DNS TXT lookup here.
        # For now we trust the super-admin to manually confirm.
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
