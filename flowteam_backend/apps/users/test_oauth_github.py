from __future__ import annotations

from urllib.parse import parse_qs, urlparse

from django.test import TestCase, override_settings
from rest_framework.test import APIClient


class GitHubOAuthRedirectTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    @override_settings(
        FRONTEND_BASE_URL="http://frontend.local",
        GITHUB_CLIENT_ID="test_client_id",
        GITHUB_REDIRECT_URI="http://backend.local/api/auth/oauth/github/callback/",
    )
    def test_redirect_includes_client_id_and_redirect_uri(self):
        resp = self.client.get("/api/auth/oauth/github/redirect/", {"project_id": "123"})
        self.assertEqual(resp.status_code, 302)
        location = resp["Location"]

        parsed = urlparse(location)
        self.assertEqual(parsed.scheme, "https")
        self.assertEqual(parsed.netloc, "github.com")
        self.assertEqual(parsed.path, "/login/oauth/authorize")

        qs = parse_qs(parsed.query)
        self.assertEqual(qs.get("client_id"), ["test_client_id"])
        self.assertEqual(qs.get("redirect_uri"), ["http://backend.local/api/auth/oauth/github/callback/"])

    @override_settings(
        FRONTEND_BASE_URL="http://frontend.local",
        GITHUB_CLIENT_ID="",
        GITHUB_REDIRECT_URI="",
    )
    def test_missing_config_redirects_with_error(self):
        resp = self.client.get("/api/auth/oauth/github/redirect/", {"project_id": "123"})
        self.assertEqual(resp.status_code, 302)
        self.assertEqual(
            resp["Location"],
            "http://frontend.local/projects/123/settings/permissions?error=github_not_configured",
        )

