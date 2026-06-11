import hashlib
import uuid
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.contrib.auth import get_user_model
from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.cache import cache
import logging
from django.core.mail import send_mail

logger = logging.getLogger(__name__)
from django.utils import timezone
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
import uuid
from .serializers import UserSerializer, RegisterSerializer
from .tokens import email_verification_token
from .two_factor import (
    build_otpauth_uri,
    consume_backup_code,
    generate_backup_codes,
    generate_totp_secret,
    hash_backup_codes,
    verify_totp,
)
from apps.teams.models import Team, TeamMember
from config.utils import standardize_response
from apps.core.jwt_cookie_auth import set_access_token_cookie, clear_access_token_cookie, set_refresh_token_cookie, clear_refresh_token_cookie

User = get_user_model()

class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = (permissions.AllowAny,)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Create default personal team — loop to guarantee uniqueness
        import secrets
        team_name = f"{user.full_name}'s Team"
        while Team.objects.filter(name=team_name).exists():
            team_name = f"{user.full_name}'s Team {secrets.token_hex(2)}"

        team = Team.objects.create(
            name=team_name,
            created_by=user
        )
        TeamMember.objects.create(team=team, user=user, role=TeamMember.ADMIN)

        # Auto-join company if email domain matches a verified company
        email_domain = user.email.split("@")[-1].lower() if "@" in user.email else ""
        if email_domain:
            from apps.companies.models import Company, CompanyMember
            matched = Company.objects.filter(
                email_domain=email_domain,
                email_domain_verified=True,
            ).first()
            if matched:
                CompanyMember.objects.get_or_create(
                    company=matched,
                    user=user,
                    defaults={"role": CompanyMember.MEMBER},
                )

        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)

        data = {
            "user": UserSerializer(user, context={"request": request}).data,
            "access": access_token,
            "refresh": str(refresh),
        }
        response = standardize_response(data=data, status=status.HTTP_201_CREATED)
        set_access_token_cookie(response, access_token)
        set_refresh_token_cookie(response, str(refresh))
        return response

class LoginView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        email = (request.data.get("email") or "").strip().lower()
        password = request.data.get("password") or ""
        otp_code = (request.data.get("otp_code") or "").strip().replace(" ", "")
        backup_code = (request.data.get("backup_code") or "").strip()

        user = authenticate(request, username=email, password=password) or authenticate(request, email=email, password=password)
        if not user:
            return standardize_response(success=False, error="Invalid credentials", status=status.HTTP_401_UNAUTHORIZED)

        if getattr(settings, "REQUIRE_EMAIL_VERIFICATION", True) and not user.email_verified_at:
            return standardize_response(
                success=False,
                error="Email address is not verified.",
                status=status.HTTP_403_FORBIDDEN,
            )

        if getattr(user, "two_factor_enabled", False):
            if otp_code or backup_code:
                # Per-account OTP brute-force protection: 5 failed attempts per 5 minutes.
                uid_hash = hashlib.sha256(str(user.pk).encode()).hexdigest()[:16]
                otp_key = f"otp_fail:{uid_hash}"
                fail_count = cache.get(otp_key, 0)
                if fail_count >= 5:
                    return standardize_response(
                        success=False,
                        error={"code": "otp_locked", "message": "Too many failed 2FA attempts. Try again in 5 minutes."},
                        status=status.HTTP_429_TOO_MANY_REQUESTS,
                    )

            if otp_code:
                if not user.totp_secret or not verify_totp(secret=user.totp_secret, code=otp_code):
                    uid_hash = hashlib.sha256(str(user.pk).encode()).hexdigest()[:16]
                    otp_key = f"otp_fail:{uid_hash}"
                    cache.set(otp_key, cache.get(otp_key, 0) + 1, timeout=300)
                    return standardize_response(success=False, error="Invalid OTP code", status=status.HTTP_400_BAD_REQUEST)
            elif backup_code:
                result = consume_backup_code(user.two_factor_backup_codes, backup_code)
                if not result.ok:
                    uid_hash = hashlib.sha256(str(user.pk).encode()).hexdigest()[:16]
                    otp_key = f"otp_fail:{uid_hash}"
                    cache.set(otp_key, cache.get(otp_key, 0) + 1, timeout=300)
                    return standardize_response(success=False, error="Invalid backup code", status=status.HTTP_400_BAD_REQUEST)
                user.two_factor_backup_codes = result.remaining_hashed_codes
                user.save(update_fields=["two_factor_backup_codes"])
            else:
                return standardize_response(
                    success=False,
                    error={"code": "otp_required", "message": "Two-factor authentication required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            user = User.objects.get(email=email)
            data = {
                "user": UserSerializer(user, context={"request": request}).data,
                "access": response.data["access"],
                "refresh": response.data["refresh"],
            }
            resp = standardize_response(data=data)
            set_access_token_cookie(resp, response.data["access"])
            set_refresh_token_cookie(resp, response.data["refresh"])
            return resp
        return response

class LogoutView(generics.GenericAPIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        # Always clear cookies — even if blacklisting fails the client session is ended.
        # Read refresh from cookie first (httpOnly), fall back to body for API clients.
        refresh_token = (
            request.COOKIES.get("refresh_token")
            or request.data.get("refresh")
        )
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except Exception as exc:
                logger.warning("Token blacklist failed during logout: %s", exc)
        response = standardize_response(data={"message": "Logged out successfully"})
        clear_access_token_cookie(response)
        clear_refresh_token_cookie(response)
        return response

class UserMeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_object(self):
        return self.request.user

    def get(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object())
        return standardize_response(data=serializer.data)

    def patch(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object(), data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return standardize_response(data=serializer.data)


class ChangePasswordView(generics.GenericAPIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        user = request.user
        current_password = request.data.get("current_password")
        new_password = request.data.get("new_password")

        if not current_password or not new_password:
            return standardize_response(success=False, error="current_password and new_password are required", status=status.HTTP_400_BAD_REQUEST)

        if not user.check_password(current_password):
            return standardize_response(success=False, error="Current password is incorrect", status=status.HTTP_400_BAD_REQUEST)

        if len(new_password) < 8:
            return standardize_response(success=False, error="New password must be at least 8 characters", status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save(update_fields=["password"])
        return standardize_response(data={"message": "Password changed successfully"})


class PasswordResetRequestView(generics.GenericAPIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()
        if not email:
            return standardize_response(success=False, error="email is required", status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(email=email, is_active=True).first()
        # Always return success (avoid user enumeration).
        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            reset_url = request.data.get("reset_url") or ""
            # If the client provides a reset_url template, append parameters for convenience.
            if isinstance(reset_url, str) and reset_url:
                if "?" in reset_url:
                    reset_link = f"{reset_url}&uid={uid}&token={token}"
                else:
                    reset_link = f"{reset_url}?uid={uid}&token={token}"
            else:
                reset_link = f"uid={uid} token={token}"

            try:
                send_mail(
                    subject="FlowTeam password reset",
                    message=f"Use this link to reset your password: {reset_link}",
                    from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None),
                    recipient_list=[user.email],
                    fail_silently=False,
                )
            except Exception as e:
                logger.error("Failed to send password reset email to %s: %s", user.email, e)
                return standardize_response(
                    success=False,
                    error="Failed to send reset email. Please try again later.",
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        return standardize_response(data={"message": "If that email exists, a reset link was sent."})


class PasswordResetConfirmView(generics.GenericAPIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        uid = request.data.get("uid")
        token = request.data.get("token")
        new_password = request.data.get("new_password")

        if not uid or not token or not new_password:
            return standardize_response(
                success=False,
                error="uid, token, and new_password are required",
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user_id = urlsafe_base64_decode(uid).decode()
            user = User.objects.get(pk=user_id, is_active=True)
        except Exception:
            return standardize_response(success=False, error="Invalid token", status=status.HTTP_400_BAD_REQUEST)

        if not default_token_generator.check_token(user, token):
            return standardize_response(success=False, error="Invalid token", status=status.HTTP_400_BAD_REQUEST)

        if len(new_password) < 8:
            return standardize_response(
                success=False,
                error="New password must be at least 8 characters",
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(new_password)
        user.save(update_fields=["password"])
        return standardize_response(data={"message": "Password reset successfully"})


class EmailVerifyRequestView(generics.GenericAPIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        user = request.user
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = email_verification_token.make_token(user)
        verify_url = request.data.get("verify_url") or ""
        if isinstance(verify_url, str) and verify_url:
            if "?" in verify_url:
                verify_link = f"{verify_url}&uid={uid}&token={token}"
            else:
                verify_link = f"{verify_url}?uid={uid}&token={token}"
        else:
            verify_link = f"uid={uid} token={token}"

        send_mail(
            subject="Verify your FlowTeam email",
            message=f"Verify your email address: {verify_link}",
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None),
            recipient_list=[user.email],
            fail_silently=True,
        )
        return standardize_response(data={"message": "Verification email sent"})


class EmailVerifyConfirmView(generics.GenericAPIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        uid = request.data.get("uid")
        token = request.data.get("token")
        if not uid or not token:
            return standardize_response(success=False, error="uid and token are required", status=status.HTTP_400_BAD_REQUEST)

        try:
            user_id = urlsafe_base64_decode(uid).decode()
            user = User.objects.get(pk=user_id, is_active=True)
        except Exception:
            return standardize_response(success=False, error="Invalid token", status=status.HTTP_400_BAD_REQUEST)

        if not email_verification_token.check_token(user, token):
            return standardize_response(success=False, error="Invalid token", status=status.HTTP_400_BAD_REQUEST)

        if not user.email_verified_at:
            user.email_verified_at = timezone.now()
            user.save(update_fields=["email_verified_at"])

        return standardize_response(data={"message": "Email verified"})


class TwoFactorSetupView(generics.GenericAPIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        user = request.user
        if user.two_factor_enabled:
            return standardize_response(success=False, error="2FA is already enabled", status=status.HTTP_400_BAD_REQUEST)

        secret = generate_totp_secret()
        backup_codes = generate_backup_codes(10)
        user.totp_secret = secret
        user.two_factor_backup_codes = hash_backup_codes(backup_codes)
        user.save(update_fields=["totp_secret", "two_factor_backup_codes"])

        issuer = getattr(settings, "TOTP_ISSUER", "FlowTeam")
        uri = build_otpauth_uri(secret=secret, email=user.email, issuer=issuer)

        return standardize_response(
            data={
                "otpauth_uri": uri,
                "backup_codes": backup_codes,
            }
        )


class TwoFactorEnableView(generics.GenericAPIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        user = request.user
        if user.two_factor_enabled:
            return standardize_response(data={"message": "2FA already enabled"})

        code = (request.data.get("otp_code") or "").strip().replace(" ", "")
        if not code or not user.totp_secret:
            return standardize_response(success=False, error="otp_code is required", status=status.HTTP_400_BAD_REQUEST)

        if not verify_totp(secret=user.totp_secret, code=code):
            return standardize_response(success=False, error="Invalid OTP code", status=status.HTTP_400_BAD_REQUEST)

        user.two_factor_enabled = True
        user.save(update_fields=["two_factor_enabled"])
        return standardize_response(data={"message": "2FA enabled"})


class TwoFactorDisableView(generics.GenericAPIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        user = request.user
        if not user.two_factor_enabled:
            return standardize_response(data={"message": "2FA already disabled"})

        otp_code = (request.data.get("otp_code") or "").strip().replace(" ", "")
        backup_code = (request.data.get("backup_code") or "").strip()

        ok = False
        if otp_code and user.totp_secret and verify_totp(secret=user.totp_secret, code=otp_code):
            ok = True
        elif backup_code:
            result = consume_backup_code(user.two_factor_backup_codes, backup_code)
            if result.ok:
                ok = True
                user.two_factor_backup_codes = result.remaining_hashed_codes

        if not ok:
            return standardize_response(success=False, error="Invalid OTP/backup code", status=status.HTTP_400_BAD_REQUEST)

        user.two_factor_enabled = False
        user.totp_secret = None
        user.two_factor_backup_codes = []
        user.save(update_fields=["two_factor_enabled", "totp_secret", "two_factor_backup_codes"])
        return standardize_response(data={"message": "2FA disabled"})


class TwoFactorBackupCodesRotateView(generics.GenericAPIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        user = request.user
        if not user.two_factor_enabled or not user.totp_secret:
            return standardize_response(success=False, error="2FA is not enabled", status=status.HTTP_400_BAD_REQUEST)

        otp_code = (request.data.get("otp_code") or "").strip().replace(" ", "")
        if not otp_code or not verify_totp(secret=user.totp_secret, code=otp_code):
            return standardize_response(success=False, error="Invalid OTP code", status=status.HTTP_400_BAD_REQUEST)

        backup_codes = generate_backup_codes(10)
        user.two_factor_backup_codes = hash_backup_codes(backup_codes)
        user.save(update_fields=["two_factor_backup_codes"])
        return standardize_response(data={"backup_codes": backup_codes})


class CookieTokenRefreshView(generics.GenericAPIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        from rest_framework_simplejwt.tokens import RefreshToken as JWTRefreshToken

        refresh_token = request.data.get("refresh") or request.COOKIES.get("refresh_token")
        if not refresh_token:
            return standardize_response(success=False, error="refresh is required", status=status.HTTP_400_BAD_REQUEST)

        try:
            token = JWTRefreshToken(refresh_token)
            access_token = str(token.access_token)
            new_refresh = str(token)
            data = {"access": access_token, "refresh": new_refresh}
            response = standardize_response(data=data)
            set_access_token_cookie(response, access_token)
            set_refresh_token_cookie(response, new_refresh)
            return response
        except Exception:
            return standardize_response(success=False, error="Invalid or expired refresh token", status=status.HTTP_401_UNAUTHORIZED)


class PushSubscribeView(generics.GenericAPIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        endpoint = (request.data.get("endpoint") or "").strip()
        p256dh = (request.data.get("p256dh") or "").strip()
        auth = (request.data.get("auth") or "").strip()

        if not endpoint or not p256dh or not auth:
            return standardize_response(
                success=False,
                error="endpoint, p256dh, and auth are required",
                status=status.HTTP_400_BAD_REQUEST,
            )

        from .models import PushSubscription

        _, created = PushSubscription.objects.update_or_create(
            endpoint=endpoint,
            defaults={
                "user": request.user,
                "p256dh": p256dh,
                "auth": auth,
                "user_agent": request.META.get("HTTP_USER_AGENT", "")[:255],
            },
        )
        return standardize_response(
            data={"subscribed": True},
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    def delete(self, request):
        endpoint = (request.data.get("endpoint") or "").strip()
        if not endpoint:
            return standardize_response(
                success=False,
                error="endpoint is required",
                status=status.HTTP_400_BAD_REQUEST,
            )

        from .models import PushSubscription

        PushSubscription.objects.filter(user=request.user, endpoint=endpoint).delete()
        return standardize_response(data={"unsubscribed": True})


class PushVapidKeyView(generics.GenericAPIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        return standardize_response(data={"public_key": getattr(settings, "VAPID_PUBLIC_KEY", "")})


# ── Session management ────────────────────────────────────────────────────────

class SessionListView(generics.GenericAPIView):
    """GET /auth/sessions/ — list active sessions for the current user."""
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        from .models import UserSession
        sessions = UserSession.objects.filter(user=request.user, is_revoked=False).order_by("-last_active")
        data = [
            {
                "id": str(s.id),
                "jti": s.jti,
                "device_name": s.device_name,
                "ip_address": s.ip_address,
                "last_active": s.last_active.isoformat(),
                "created_at": s.created_at.isoformat(),
            }
            for s in sessions
        ]
        return standardize_response(data=data)


class SessionRevokeView(generics.GenericAPIView):
    """DELETE /auth/sessions/<jti>/ — revoke a specific session."""
    permission_classes = (permissions.IsAuthenticated,)

    def delete(self, request, jti):
        from .models import UserSession
        from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken

        qs = UserSession.objects.filter(user=request.user, jti=jti, is_revoked=False)
        if not qs.exists():
            return standardize_response(success=False, error="Session not found", status=status.HTTP_404_NOT_FOUND)

        qs.update(is_revoked=True)
        # Try to blacklist the underlying JWT if simplejwt has it on record
        try:
            outstanding = OutstandingToken.objects.filter(jti=jti).first()
            if outstanding:
                BlacklistedToken.objects.get_or_create(token=outstanding)
        except Exception:
            pass

        return standardize_response(data={"revoked": True})


class SessionRevokeAllView(generics.GenericAPIView):
    """DELETE /auth/sessions/ — revoke all sessions except the current one."""
    permission_classes = (permissions.IsAuthenticated,)

    def delete(self, request):
        from .models import UserSession
        from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken

        # Current session JTI from cookie token
        current_jti = None
        try:
            from rest_framework_simplejwt.tokens import AccessToken as _AT
            raw = request.COOKIES.get("access_token") or ""
            if not raw:
                auth = request.headers.get("Authorization", "") if hasattr(request, "headers") else ""
                if isinstance(auth, str) and auth.lower().startswith("bearer "):
                    raw = auth[7:].strip()
            if raw:
                current_jti = _AT(raw).get("jti")
        except Exception:
            pass

        sessions = UserSession.objects.filter(user=request.user, is_revoked=False)
        if current_jti:
            sessions = sessions.exclude(jti=current_jti)
        jtis = list(sessions.values_list("jti", flat=True))
        sessions.update(is_revoked=True)

        try:
            for jti in jtis:
                outstanding = OutstandingToken.objects.filter(jti=jti).first()
                if outstanding:
                    BlacklistedToken.objects.get_or_create(token=outstanding)
        except Exception:
            pass

        return standardize_response(data={"revoked_count": len(jtis)})


# ── Public API Key management ─────────────────────────────────────────────────

class APIKeyListCreateView(generics.GenericAPIView):
    """
    GET  /auth/api-keys/        — list active API keys for the current user's teams
    POST /auth/api-keys/        — create a new key (raw returned once)
    """
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        from .models import PublicAPIKey
        from apps.teams.models import TeamMember
        team_ids = TeamMember.objects.filter(user=request.user).values_list("team_id", flat=True)
        keys = PublicAPIKey.objects.filter(team_id__in=team_ids, is_active=True).select_related("team", "created_by")
        data = [
            {
                "id": str(k.id),
                "team_id": str(k.team_id),
                "team_name": k.team.name,
                "name": k.name,
                "prefix": k.prefix,
                "scopes": k.scopes,
                "last_used_at": k.last_used_at.isoformat() if k.last_used_at else None,
                "expires_at": k.expires_at.isoformat() if k.expires_at else None,
                "created_at": k.created_at.isoformat(),
                "created_by": str(k.created_by_id) if k.created_by_id else None,
            }
            for k in keys
        ]
        return standardize_response(data=data)

    def post(self, request):
        from .models import PublicAPIKey
        from apps.teams.models import TeamMember

        team_id = request.data.get("team_id")
        name = (request.data.get("name") or "").strip()
        scopes = request.data.get("scopes") or []
        expires_at_raw = request.data.get("expires_at")

        if not team_id or not name:
            return standardize_response(
                success=False,
                error="team_id and name are required",
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Must be team member
        if not TeamMember.objects.filter(user=request.user, team_id=team_id).exists():
            return standardize_response(success=False, error="Not a member of that team", status=status.HTTP_403_FORBIDDEN)

        valid_scopes = {s for s, _ in PublicAPIKey.ALL_SCOPES}
        invalid = [s for s in scopes if s not in valid_scopes]
        if invalid:
            return standardize_response(
                success=False,
                error=f"Invalid scopes: {invalid}. Valid: {list(valid_scopes)}",
                status=status.HTTP_400_BAD_REQUEST,
            )

        from apps.teams.models import Team
        team = Team.objects.get(id=team_id)

        expires_at = None
        if expires_at_raw:
            from django.utils.dateparse import parse_datetime
            expires_at = parse_datetime(expires_at_raw)

        key, raw = PublicAPIKey.generate(
            team=team, created_by=request.user, name=name, scopes=scopes, expires_at=expires_at
        )
        return standardize_response(
            data={
                "id": str(key.id),
                "name": key.name,
                "prefix": key.prefix,
                "scopes": key.scopes,
                "key": raw,  # shown ONCE
                "expires_at": key.expires_at.isoformat() if key.expires_at else None,
                "created_at": key.created_at.isoformat(),
            },
            status=status.HTTP_201_CREATED,
        )


class APIKeyRevokeView(generics.GenericAPIView):
    """DELETE /auth/api-keys/<key_id>/ — revoke an API key."""
    permission_classes = (permissions.IsAuthenticated,)

    def delete(self, request, key_id):
        from .models import PublicAPIKey
        from apps.teams.models import TeamMember

        try:
            key = PublicAPIKey.objects.select_related("team").get(id=key_id, is_active=True)
        except PublicAPIKey.DoesNotExist:
            return standardize_response(success=False, error="API key not found", status=status.HTTP_404_NOT_FOUND)

        if not TeamMember.objects.filter(user=request.user, team=key.team).exists():
            return standardize_response(success=False, error="Forbidden", status=status.HTTP_403_FORBIDDEN)

        key.is_active = False
        key.save(update_fields=["is_active"])
        return standardize_response(data={"revoked": True})
