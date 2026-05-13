from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed
from django.conf import settings

class CookieJWTAuthentication(JWTAuthentication):
    """
    Custom JWT authentication that checks for the access token in:
    1. Authorization header (standard DRF JWT behavior)
    2. `access_token` cookie (fallback for httpOnly cookie flow)
    """
    def authenticate(self, request):
        print(f"DEBUG AUTH: Path: {request.path}")
        print(f"DEBUG AUTH: Origin: {request.headers.get('Origin')}")
        print(f"DEBUG AUTH: Headers: {request.headers.get('Authorization')[:20] if request.headers.get('Authorization') else 'None'}")
        
        result = super().authenticate(request)
        if result is not None:
            print(f"DEBUG AUTH: Authenticated via header: {result[0]}")
            return result

        raw_token = request.COOKIES.get("access_token")
        if not raw_token:
            return None

        try:
            validated_token = self.get_validated_token(raw_token)
            user = self.get_user(validated_token)
            request.successful_authenticator = self
            return (user, validated_token)
        except (InvalidToken, AuthenticationFailed):
            return None

def set_access_token_cookie(response, access_token, secure=None):
    if secure is None:
        secure = not settings.DEBUG
    response.set_cookie(
        key="access_token",
        value=access_token,
        max_age=3600,
        httponly=True,
        secure=secure,
        samesite="Lax",
        path="/",
    )

def clear_access_token_cookie(response):
    response.set_cookie(
        key="access_token",
        value="",
        max_age=0,
        httponly=True,
        secure=not settings.DEBUG,
        samesite="Lax",
        path="/",
    )

def set_refresh_token_cookie(response, refresh_token, secure=None):
    if secure is None:
        secure = not settings.DEBUG
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        max_age=86400,  # 1 day
        httponly=True,
        secure=secure,
        samesite="Lax",
        path="/api/auth/refresh/",
    )

def clear_refresh_token_cookie(response):
    response.set_cookie(
        key="refresh_token",
        value="",
        max_age=0,
        httponly=True,
        secure=not settings.DEBUG,
        samesite="Lax",
        path="/api/auth/refresh/",
    )
