from rest_framework import serializers
from .models import AuditLog
from apps.users.serializers import UserSerializer

class AuditLogSerializer(serializers.ModelSerializer):
    actor = UserSerializer(read_only=True)
    
    class Meta:
        model = AuditLog
        fields = [
            "id", "actor", "action", "model_name", "object_id", 
            "object_repr", "changes", "ip_address", "user_agent", 
            "team", "created_at"
        ]
