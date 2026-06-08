import logging
import time
import re
import uuid
from django.core.cache import cache
from django.http import JsonResponse
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken
from urllib.parse import parse_qs

_ws_logger = logging.getLogger("apps.core.ws_auth")

User = get_user_model()
from .request_id import request_id_ctx
from .metrics import http_requests_total, http_request_duration_seconds


class RequestIDMiddleware:
    """
    Adds an `X-Request-ID` header to responses and exposes `request.request_id`.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start = time.time()
        incoming = request.headers.get("X-Request-ID") if hasattr(request, "headers") else None
        rid = (incoming or "").strip() or uuid.uuid4().hex
        token = request_id_ctx.set(rid)
        try:
            request.request_id = rid
            response = self.get_response(request)
            try:
                response["X-Request-ID"] = rid
            except Exception:
                pass

            try:
                path = getattr(request, "path", "") or ""
                status_code = getattr(response, "status_code", 0) or 0
                http_requests_total.labels(request.method, path, str(status_code)).inc()
                http_request_duration_seconds.labels(request.method, path).observe(max(0.0, time.time() - start))
            except Exception:
                pass
            return response
        finally:
            request_id_ctx.reset(token)

class RateLimitMiddleware:
    """Cache-based rate limiting per user/IP per endpoint group."""
    
    LIMITS = {
        # Auth endpoints: keep buckets narrow so one endpoint can't starve another.
        r"^/api/auth/login/$": (10, 60),  # 10 req / 60s
        r"^/api/auth/register/$": (5, 60),  # 5 req / 60s
        r"^/api/auth/password-reset/request/$": (5, 60),  # 5 req / 60s
        r"^/api/auth/password-reset/confirm/$": (3, 60),  # 3 req / 60s — prevent token brute force
        r"^/api/auth/email/verify/request/$": (10, 60),  # 10 req / 60s
        r"^/api/auth/2fa/enable$": (5, 60),   # 5 req / 60s — verify OTP to enable 2FA
        r"^/api/auth/2fa/disable$": (5, 60),  # 5 req / 60s — verify OTP to disable 2FA
        r"^/api/auth/2fa/backup-codes/rotate$": (5, 60),  # 5 req / 60s
        r"^/api/auth/2fa/": (20, 60),  # 20 req / 60s catch-all for other 2FA endpoints
        r'^/api/search/': (30, 60),      # 30 req / 60s
        r'^/api/projects/.+/export/': (5, 60), # 5 req / 60s
        r"^/api/auth/oauth/": (10, 60),  # 10 req / 60s — OAuth redirect + callback
    }

    def _client_ip(self, request) -> str:
        # Best effort; in production, ensure the proxy sets X-Forwarded-For correctly.
        forwarded = ""
        try:
            forwarded = request.headers.get("X-Forwarded-For", "") if hasattr(request, "headers") else ""
        except Exception:
            forwarded = ""

        if forwarded:
            return forwarded.split(",")[0].strip() or "unknown"
        return (request.META.get("REMOTE_ADDR") or "").strip() or "unknown"

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        path = request.path
        for pattern, (limit, window) in self.LIMITS.items():
            if not re.match(pattern, path):
                continue

            group = pattern.replace("^", "").replace("$", "").replace("/", "_")

            actor_key = None
            if getattr(request, "user", None) is not None and request.user.is_authenticated:
                actor_key = f"user:{request.user.id}"
            else:
                # DRF JWT auth runs after middleware; best-effort extract user_id from the bearer token
                # so authenticated API calls don't get bucketed into the IP limit.
                try:
                    auth = request.headers.get("Authorization", "") if hasattr(request, "headers") else ""
                except Exception:
                    auth = request.META.get("HTTP_AUTHORIZATION", "")

                if isinstance(auth, str) and auth.lower().startswith("bearer "):
                    raw = auth.split(" ", 1)[1].strip()
                    try:
                        token = AccessToken(raw)
                        uid = token.get("user_id")
                        if uid:
                            actor_key = f"user:{uid}"
                    except Exception:
                        actor_key = None

            if not actor_key:
                actor_key = f"ip:{self._client_ip(request)}"

            key = f"rl:{actor_key}:{group}"
            count = cache.get(key, 0)
            if count >= limit:
                return JsonResponse({"success": False, "error": "Rate limit exceeded. Slow down."}, status=429)
            cache.set(key, count + 1, timeout=window)
            break
                    
        return self.get_response(request)

@database_sync_to_async
def get_user(user_id):
    try:
        return User.objects.get(id=user_id)
    except User.DoesNotExist:
        return AnonymousUser()

def _ws_cookie(scope, name):
    """Parse a cookie value from the ASGI WebSocket handshake headers."""
    for header, value in scope.get("headers", []):
        if header.lower() == b"cookie":
            for part in value.decode().split(";"):
                part = part.strip()
                if part.startswith(f"{name}="):
                    return part[len(name) + 1:]
    return None


class IPAllowlistMiddleware:
    """
    Enforces company-level IP allowlists for authenticated users.
    If a company has settings_json.security.ip_allowlist populated, only those
    CIDR ranges / exact IPs may access the API. Anonymous requests pass through.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    @staticmethod
    def _client_ip(request) -> str:
        try:
            forwarded = request.headers.get("X-Forwarded-For", "") if hasattr(request, "headers") else ""
        except Exception:
            forwarded = ""
        if forwarded:
            return forwarded.split(",")[0].strip()
        return (request.META.get("REMOTE_ADDR") or "").strip()

    @staticmethod
    def _ip_allowed(client_ip: str, allowlist: list[str]) -> bool:
        import ipaddress
        try:
            addr = ipaddress.ip_address(client_ip)
        except ValueError:
            return False
        for entry in allowlist:
            try:
                if "/" in entry:
                    if addr in ipaddress.ip_network(entry, strict=False):
                        return True
                else:
                    if addr == ipaddress.ip_address(entry):
                        return True
            except ValueError:
                continue
        return False

    def __call__(self, request):
        # Only enforce for authenticated users after auth middleware has run.
        user = getattr(request, "user", None)
        if user and getattr(user, "is_authenticated", False) and not getattr(user, "is_superuser", False):
            try:
                from apps.companies.models import CompanyMember
                member = (
                    CompanyMember.objects
                    .select_related("company")
                    .filter(user=user)
                    .first()
                )
                if member:
                    allowlist = (
                        (member.company.settings_json or {})
                        .get("security", {})
                        .get("ip_allowlist", [])
                    )
                    if allowlist:
                        client_ip = self._client_ip(request)
                        if not self._ip_allowed(client_ip, allowlist):
                            return JsonResponse(
                                {"success": False, "error": "Access denied: your IP is not on the allowlist."},
                                status=403,
                            )
            except Exception:
                pass  # Never block on unexpected errors in security middleware
        return self.get_response(request)


class PublicAPIKeyAuthMiddleware:
    """
    Authenticates requests bearing an `Authorization: ApiKey cwrk_...` header.
    Sets request.user and request.auth_scopes so DRF views can enforce scopes.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        try:
            auth = request.headers.get("Authorization", "") if hasattr(request, "headers") else ""
        except Exception:
            auth = request.META.get("HTTP_AUTHORIZATION", "")

        if isinstance(auth, str) and auth.lower().startswith("apikey "):
            raw_key = auth[7:].strip()
            try:
                from apps.users.models import PublicAPIKey
                key = PublicAPIKey.authenticate(raw_key)
                if key:
                    # Attach a synthetic user from the team's creator for permission checks
                    team = key.team
                    if key.created_by and key.created_by.is_active:
                        request.user = key.created_by
                    request.api_key = key
                    request.api_key_scopes = key.scopes
            except Exception:
                pass

        return self.get_response(request)


class JWTAuthMiddleware:
    """
    Custom middleware that authenticates WebSocket connections via:
    1. `access_token` httpOnly cookie (sent automatically by browser)
    2. `?token=` query string (legacy/fallback)
    """
    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        query_params = parse_qs(scope["query_string"].decode())
        token = query_params.get("token", [None])[0]

        if not token:
            token = _ws_cookie(scope, "access_token")

        if token:
            try:
                access_token = AccessToken(token)
                user_id = access_token["user_id"]
                scope["user"] = await get_user(user_id)
            except Exception as e:
                _ws_logger.debug("WS JWT auth failed: %s", e)
                scope["user"] = AnonymousUser()
        else:
            scope["user"] = AnonymousUser()

        return await self.inner(scope, receive, send)
