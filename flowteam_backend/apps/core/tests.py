from __future__ import annotations

from django.test import TestCase, override_settings
from django.core.cache import cache
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.models import User


class HealthViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        cache.clear()

    def test_health_endpoint_returns_ok(self):
        resp = self.client.get("/api/health/")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data.get("success", data.get("data", {}).get("ok", False)))


class MetricsViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(email="admin@test.com", full_name="Admin", password="admin123", is_superuser=True)
        self.normal_user = User.objects.create_user(email="user@test.com", full_name="User", password="user123")
        cache.clear()

    def test_metrics_requires_auth(self):
        resp = self.client.get("/api/metrics/")
        self.assertEqual(resp.status_code, 401)

    def test_metrics_allows_superuser(self):
        access = str(RefreshToken.for_user(self.user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        resp = self.client.get("/api/metrics/")
        # prometheus_client may not be installed in test, expect 501
        self.assertIn(resp.status_code, (200, 501))

    def test_metrics_rejects_normal_user(self):
        access = str(RefreshToken.for_user(self.normal_user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        resp = self.client.get("/api/metrics/")
        self.assertEqual(resp.status_code, 403)


class RateLimitTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        cache.clear()

    def test_rate_limit_on_oauth_endpoints(self):
        for i in range(10):
            resp = self.client.get("/api/auth/oauth/google/redirect/")
            self.assertIn(resp.status_code, (200, 302))
        # 11th request should be rate limited
        resp = self.client.get("/api/auth/oauth/google/redirect/")
        self.assertEqual(resp.status_code, 429)

    def test_rate_limit_on_register(self):
        for i in range(5):
            resp = self.client.post("/api/auth/register/", {
                "email": f"user{i}@test.com",
                "password": "testpass123",
                "full_name": "Test User",
            }, format="json")
            self.assertIn(resp.status_code, (201, 400))
        resp = self.client.post("/api/auth/register/", {
            "email": "last@test.com",
            "password": "testpass123",
            "full_name": "Test User",
        }, format="json")
        self.assertEqual(resp.status_code, 429)
