from rest_framework import generics, status, permissions
from django.db import transaction
from django.contrib.auth import get_user_model

from config.utils import standardize_response
from .models import Company, CompanyMember
from .serializers import CompanySerializer, CompanyDetailSerializer, CompanyMemberSerializer
from .permissions import IsSuperUser, IsCompanyCEO

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
            # Auto-add CEO as a company member
            if company.ceo:
                CompanyMember.objects.get_or_create(company=company, user=company.ceo)
        return standardize_response(data=CompanySerializer(company, context={"request": request}).data, status=status.HTTP_201_CREATED)


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
            # Keep CEO in member list
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
