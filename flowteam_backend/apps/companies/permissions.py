from rest_framework import permissions
from .models import Company


class IsSuperUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)


class IsCompanyCEO(permissions.BasePermission):
    """Allows access to the CEO of the specific company or platform superusers."""

    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True
        if isinstance(obj, Company):
            return obj.ceo_id == request.user.id
        return False
