from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed
from django.conf import settings

_EMBED_PATH_PREFIXES = ("/api/projects/client-portal/", "/media/")


class CookieJWTAuthentication(JWTAuthentication):
    """
    Custom JWT authentication that checks for the access token in:
    1. Authorization header (standard DRF JWT behavior)
    2. `access_token` httpOnly cookie (primary web flow)
    3. `token` / `access_token` query param — only for embed/media paths
       where cookies are unavailable (e.g. iframe src, direct file downloads).
       Restricting this to known embed paths prevents tokens from leaking via
       server logs or browser history on regular API calls.
    """
    def authenticate(self, request):
        result = super().authenticate(request)
        if result is not None:
            return result

        raw_token = request.COOKIES.get("access_token")
        if not raw_token:
            path = getattr(request, "path", "") or ""
            if any(path.startswith(p) for p in _EMBED_PATH_PREFIXES):
                raw_token = request.GET.get("token") or request.GET.get("access_token")

        if not raw_token:
            return None

        try:
            validated_token = self.get_validated_token(raw_token)
            user = self.get_user(validated_token)
            return (user, validated_token)
        except (InvalidToken, AuthenticationFailed):
            return None

def set_access_token_cookie(response, access_token, secure=None):
    if secure is None:
        secure = getattr(settings, "SESSION_COOKIE_SECURE", not settings.DEBUG)
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
        secure=getattr(settings, "SESSION_COOKIE_SECURE", not settings.DEBUG),
        samesite="Lax",
        path="/",
    )

def set_refresh_token_cookie(response, refresh_token, secure=None):
    if secure is None:
        secure = getattr(settings, "SESSION_COOKIE_SECURE", not settings.DEBUG)
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
        secure=getattr(settings, "SESSION_COOKIE_SECURE", not settings.DEBUG),
        samesite="Lax",
        path="/api/auth/refresh/",
    )
