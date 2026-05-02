from rest_framework import viewsets, permissions
from .models import AuditLog
from .serializers import AuditLogSerializer
from apps.teams.permissions import IsTeamAdmin
from config.utils import standardize_response

class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated, IsTeamAdmin]

    def get_queryset(self):
        team_id = self.request.query_params.get("team_id")
        if not team_id:
            return AuditLog.objects.none()
        queryset = AuditLog.objects.filter(team_id=team_id)
        
        model = self.request.query_params.get("model")
        action = self.request.query_params.get("action")
        actor_id = self.request.query_params.get("actor_id")
        start = self.request.query_params.get("start")
        end = self.request.query_params.get("end")
        
        if model: queryset = queryset.filter(model_name=model)
        if action: queryset = queryset.filter(action=action)
        if actor_id: queryset = queryset.filter(actor_id=actor_id)
        if start: queryset = queryset.filter(created_at__gte=start)
        if end: queryset = queryset.filter(created_at__lte=end)
        
        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return standardize_response(data=serializer.data)
