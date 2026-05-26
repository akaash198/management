from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import viewsets, status

def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        response.data = {
            "success": False,
            "error": response.data
        }
    else:
        # For unhandled exceptions
        import traceback
        traceback.print_exc()
        return Response({
            "success": False,
            "error": str(exc)
        }, status=500)

    return response

def standardize_response(data=None, success=True, error=None, status=200):
    content = {
        "success": success,
        "data": data,
        "error": error
    }
    return Response(content, status=status)


class StandardizedModelViewSet(viewsets.ModelViewSet):
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return standardize_response(data=serializer.data)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return standardize_response(data=serializer.data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return standardize_response(data=serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        if getattr(instance, '_prefetched_objects_cache', None):
            instance._prefetched_objects_cache = {}
        return standardize_response(data=serializer.data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return standardize_response(status=status.HTTP_204_NO_CONTENT)

