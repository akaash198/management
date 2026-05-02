from .models import AuditLog
from django.forms.models import model_to_dict

class AuditedModelMixin:
    """Mix into APIView or ModelViewSet to auto-log create/update/delete."""
    
    def perform_create(self, serializer):
        instance = serializer.save()
        AuditLog.log(
            actor=self.request.user, 
            action="create", 
            instance=instance, 
            request=self.request
        )

    def perform_update(self, serializer):
        # Capture old state
        old_instance = serializer.instance
        old_data = model_to_dict(old_instance)
        
        instance = serializer.save()
        
        # Simple diff
        new_data = model_to_dict(instance)
        changes = {}
        for field, value in new_data.items():
            if old_data.get(field) != value:
                changes[field] = [str(old_data.get(field)), str(value)]
        
        AuditLog.log(
            actor=self.request.user, 
            action="update", 
            instance=instance, 
            changes=changes, 
            request=self.request
        )

    def perform_destroy(self, instance):
        AuditLog.log(
            actor=self.request.user, 
            action="delete", 
            instance=instance, 
            request=self.request
        )
        instance.delete()
