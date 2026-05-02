from rest_framework import viewsets, status
from rest_framework.decorators import action

from django.contrib.auth import get_user_model
from django.db.models import Q
from django.db import transaction

from config.utils import standardize_response
from .permissions import IsSuperUser
from .serializers import AdminUserSerializer, AdminUserCreateSerializer, AdminUserUpdateSerializer

User = get_user_model()


class SuperAdminUserViewSet(viewsets.ModelViewSet):
    permission_classes = [IsSuperUser]
    queryset = User.objects.all().order_by("-date_joined")

    def get_serializer_class(self):
        if self.action == "create":
            return AdminUserCreateSerializer
        if self.action in {"update", "partial_update"}:
            return AdminUserUpdateSerializer
        return AdminUserSerializer

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        q = request.query_params.get("q")
        if q:
            qs = qs.filter(Q(email__icontains=q) | Q(full_name__icontains=q))
        data = AdminUserSerializer(qs[:200], many=True).data
        return standardize_response(data=data)

    def retrieve(self, request, *args, **kwargs):
        user = self.get_object()
        return standardize_response(data=AdminUserSerializer(user).data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return standardize_response(data=AdminUserSerializer(user).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return standardize_response(data=AdminUserSerializer(user).data)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return standardize_response(data=AdminUserSerializer(user).data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.id == request.user.id:
            return standardize_response(success=False, error="Cannot delete yourself", status=status.HTTP_400_BAD_REQUEST)
        instance.delete()
        return standardize_response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["post"], url_path="bulk-delete")
    def bulk_delete(self, request):
        ids = request.data.get("ids")
        if not isinstance(ids, list) or not ids:
            return standardize_response(success=False, error="ids must be a non-empty list", status=status.HTTP_400_BAD_REQUEST)

        # Never allow deleting the currently authenticated superuser via this endpoint.
        ids = [i for i in ids if str(i) != str(request.user.id)]
        if not ids:
            return standardize_response(data={"deleted": 0, "skipped_self": True})

        with transaction.atomic():
            qs = User.objects.filter(id__in=ids)
            deleted_count, _ = qs.delete()

        return standardize_response(data={"deleted": deleted_count, "skipped_self": True})

    @action(detail=True, methods=["post"])
    def reset_password(self, request, pk=None):
        instance = self.get_object()
        password = request.data.get("password")
        if not password or len(password) < 6:
            return standardize_response(success=False, error="password must be at least 6 characters", status=status.HTTP_400_BAD_REQUEST)
        instance.set_password(password)
        instance.save(update_fields=["password"])
        return standardize_response(data={"message": "Password reset"})
