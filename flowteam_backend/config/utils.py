from rest_framework.views import exception_handler
from rest_framework.response import Response

def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        response.data = {
            "success": False,
            "error": response.data
        }
    else:
        # For unhandled exceptions
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
