from __future__ import annotations

from django.test import TestCase
from django.utils import timezone
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from django.contrib.auth.tokens import default_token_generator
from django.core.cache import cache
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.models import User
from apps.users.tokens import email_verification_token


class AuthHardeningTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(email="u@example.com", full_name="User", password="password123")
        cache.clear()

    def test_password_reset_confirm_sets_password(self):
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        token = default_token_generator.make_token(self.user)

        resp = self.client.post(
            "/api/auth/password-reset/confirm/",
            {"uid": uid, "token": token, "new_password": "newpassword123"},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("newpassword123"))

    def test_email_verify_confirm_sets_verified_at(self):
        self.assertIsNone(self.user.email_verified_at)
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        token = email_verification_token.make_token(self.user)

        resp = self.client.post("/api/auth/email/verify/confirm/", {"uid": uid, "token": token}, format="json")
        self.assertEqual(resp.status_code, 200)
        self.user.refresh_from_db()
        self.assertIsNotNone(self.user.email_verified_at)
        self.assertLess(abs((timezone.now() - self.user.email_verified_at).total_seconds()), 10)

    def test_email_verify_request_requires_auth(self):
        resp = self.client.post("/api/auth/email/verify/request/", {}, format="json")
        self.assertIn(resp.status_code, (401, 403))

        access = str(RefreshToken.for_user(self.user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        resp2 = self.client.post("/api/auth/email/verify/request/", {"verify_url": "https://example.com/verify"}, format="json")
        self.assertEqual(resp2.status_code, 200)

    def test_rate_limit_applies_to_unauthenticated_auth_endpoints_by_ip(self):
        # Hit an unauthenticated endpoint repeatedly and confirm IP-based limiting kicks in.
        for i in range(5):
            r = self.client.post("/api/auth/password-reset/request/", {"email": "nobody@example.com"}, format="json")
            self.assertEqual(r.status_code, 200)
        r_last = self.client.post("/api/auth/password-reset/request/", {"email": "nobody@example.com"}, format="json")
        self.assertEqual(r_last.status_code, 429)


class TwoFactorTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(email="2fa@example.com", full_name="Two Fa", password="password123")
        access = str(RefreshToken.for_user(self.user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

    def test_2fa_setup_and_enable_and_login_requires_otp(self):
        resp = self.client.post("/api/auth/2fa/setup/", {}, format="json")
        self.assertEqual(resp.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(bool(self.user.totp_secret))

        import pyotp

        code = pyotp.TOTP(self.user.totp_secret).now()
        resp2 = self.client.post("/api/auth/2fa/enable/", {"otp_code": code}, format="json")
        self.assertEqual(resp2.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.two_factor_enabled)

        # Login without OTP should fail with otp_required.
        anon = APIClient()
        r3 = anon.post("/api/auth/login/", {"email": self.user.email, "password": "password123"}, format="json")
        self.assertEqual(r3.status_code, 400)
        self.assertEqual((r3.data or {}).get("error", {}).get("code"), "otp_required")

        # Login with OTP should succeed.
        code2 = pyotp.TOTP(self.user.totp_secret).now()
        r4 = anon.post(
            "/api/auth/login/",
            {"email": self.user.email, "password": "password123", "otp_code": code2},
            format="json",
        )
        self.assertEqual(r4.status_code, 200)
