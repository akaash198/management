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
        r"^/api/auth/password-reset/confirm/$": (10, 60),  # 10 req / 60s
        r"^/api/auth/email/verify/request/$": (10, 60),  # 10 req / 60s
        r"^/api/auth/2fa/": (20, 60),  # 20 req / 60s (per user when authenticated)
        r'^/api/search/': (30, 60),      # 30 req / 60s
        r'^/api/projects/.+/export/': (5, 60), # 5 req / 60s
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

class JWTAuthMiddleware:
    """
    Custom middleware that takes user ID from JWT in query string and populates scope['user']
    """
    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        query_params = parse_qs(scope["query_string"].decode())
        token = query_params.get("token", [None])[0]
        
        if token:
            try:
                access_token = AccessToken(token)
                user_id = access_token["user_id"]
                scope["user"] = await get_user(user_id)
            except Exception as e:
                print(f"WS JWT Auth Error: {e}")
                scope["user"] = AnonymousUser()
        else:
            scope["user"] = AnonymousUser()

        return await self.inner(scope, receive, send)
