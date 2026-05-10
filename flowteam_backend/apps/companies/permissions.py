from rest_framework import permissions
from .models import Company, CompanyMember


class IsSuperUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)


class IsCompanyCEO(permissions.BasePermission):
    """CEO of the specific company, or platform superuser."""

    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True
        if isinstance(obj, Company):
            return obj.ceo_id == request.user.id
        return False


class IsCompanyMemberPermission(permissions.BasePermission):
    """Any member of the company (any role)."""

    def _get_company_id(self, view, request):
        return view.kwargs.get("id") or view.kwargs.get("company_id") or request.data.get("company_id")

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        company_id = self._get_company_id(view, request)
        if not company_id:
            return False
        return CompanyMember.objects.filter(company_id=company_id, user=request.user).exists() or \
               Company.objects.filter(id=company_id, ceo=request.user).exists()


class IsCompanyManagerPermission(permissions.BasePermission):
    """Manager, Admin, or CEO of the company — can invite/add members."""

    def _get_company_id(self, view, request):
        return view.kwargs.get("id") or view.kwargs.get("company_id") or request.data.get("company_id")

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        company_id = self._get_company_id(view, request)
        if not company_id:
            return False
        if Company.objects.filter(id=company_id, ceo=request.user).exists():
            return True
        return CompanyMember.objects.filter(
            company_id=company_id,
            user=request.user,
            role__in=[CompanyMember.CEO, CompanyMember.ADMIN, CompanyMember.MANAGER],
        ).exists()


class IsCompanyAdminPermission(permissions.BasePermission):
    """Admin or CEO of the company — can change roles, remove members."""

    def _get_company_id(self, view, request):
        return view.kwargs.get("id") or view.kwargs.get("company_id") or request.data.get("company_id")

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        company_id = self._get_company_id(view, request)
        if not company_id:
            return False
        if Company.objects.filter(id=company_id, ceo=request.user).exists():
            return True
        return CompanyMember.objects.filter(
            company_id=company_id,
            user=request.user,
            role__in=[CompanyMember.CEO, CompanyMember.ADMIN],
        ).exists()
