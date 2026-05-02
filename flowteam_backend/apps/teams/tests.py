from __future__ import annotations

from django.test import TestCase
from django.test.utils import override_settings
from django.core import mail
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.teams.models import Team, TeamMember
from apps.users.models import User


def authed_client(user: User) -> APIClient:
    client = APIClient()
    access = str(RefreshToken.for_user(user).access_token)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
    return client


class TeamRBACAPITests(TestCase):
    def setUp(self):
        self.ceo = User.objects.create_user(email="ceo@example.com", full_name="CEO", password="password123")
        self.admin = User.objects.create_user(email="admin@example.com", full_name="Admin", password="password123")
        self.manager = User.objects.create_user(email="mgr@example.com", full_name="Manager", password="password123")
        self.member = User.objects.create_user(email="mem@example.com", full_name="Member", password="password123")
        self.other = User.objects.create_user(email="other@example.com", full_name="Other", password="password123")

        self.team = Team.objects.create(name="Acme", created_by=self.ceo, plan="pro")
        TeamMember.objects.create(team=self.team, user=self.ceo, role=TeamMember.CEO)
        TeamMember.objects.create(team=self.team, user=self.admin, role=TeamMember.ADMIN)
        TeamMember.objects.create(team=self.team, user=self.manager, role=TeamMember.MANAGER)
        TeamMember.objects.create(team=self.team, user=self.member, role=TeamMember.MEMBER)

    def test_admin_cannot_delete_team(self):
        client = authed_client(self.admin)
        resp = client.delete(f"/api/teams/{self.team.id}/")
        self.assertEqual(resp.status_code, 403)

    def test_ceo_can_delete_team(self):
        client = authed_client(self.ceo)
        resp = client.delete(f"/api/teams/{self.team.id}/")
        self.assertIn(resp.status_code, (204, 200))
        self.assertFalse(Team.objects.filter(id=self.team.id).exists())

    def test_manager_can_add_member_as_employee_but_not_admin(self):
        client = authed_client(self.manager)

        r1 = client.post(
            f"/api/teams/{self.team.id}/members/",
            {"user_id": str(self.other.id), "role": "member"},
            format="json",
        )
        self.assertIn(r1.status_code, (200, 201))

        other_member = TeamMember.objects.get(team=self.team, user=self.other)
        self.assertEqual(other_member.role, TeamMember.MEMBER)

        r2 = client.post(
            f"/api/teams/{self.team.id}/members/",
            {"user_id": str(self.other.id), "role": "admin"},
            format="json",
        )
        self.assertEqual(r2.status_code, 403)

    def test_admin_cannot_promote_to_ceo(self):
        client = authed_client(self.admin)
        resp = client.patch(
            f"/api/teams/{self.team.id}/members/{self.member.id}/",
            {"role": "ceo"},
            format="json",
        )
        self.assertEqual(resp.status_code, 403)

    def test_ceo_can_promote_to_ceo(self):
        client = authed_client(self.ceo)
        resp = client.patch(
            f"/api/teams/{self.team.id}/members/{self.admin.id}/",
            {"role": "ceo"},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(
            TeamMember.objects.filter(team=self.team, user=self.admin, role=TeamMember.CEO).exists()
        )

    def test_cannot_demote_last_ceo(self):
        # Team currently has exactly one CEO in setUp.
        client = authed_client(self.ceo)
        resp = client.patch(
            f"/api/teams/{self.team.id}/members/{self.ceo.id}/",
            {"role": "admin"},
            format="json",
        )
        self.assertEqual(resp.status_code, 403)

    def test_bootstrap_admin_can_self_promote_when_no_ceo(self):
        team2 = Team.objects.create(name="No Owner Yet", created_by=self.admin)
        TeamMember.objects.create(team=team2, user=self.admin, role=TeamMember.ADMIN)

        client = authed_client(self.admin)
        resp = client.patch(
            f"/api/teams/{team2.id}/members/{self.admin.id}/",
            {"role": "ceo"},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(TeamMember.objects.filter(team=team2, user=self.admin, role=TeamMember.CEO).exists())

    @override_settings(
        EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
        FRONTEND_BASE_URL="https://app.example.com",
        DEFAULT_FROM_EMAIL="no-reply@example.com",
    )
    def test_invite_sends_email_and_returns_invite_link(self):
        client = authed_client(self.ceo)
        resp = client.post(
            f"/api/teams/{self.team.id}/invite/",
            {"email": "invitee@example.com", "role": "member"},
            format="json",
        )
        self.assertEqual(resp.status_code, 201)
        data = (resp.data or {}).get("data") or {}
        self.assertIn("id", data)
        self.assertEqual(data.get("email"), "invitee@example.com")
        self.assertTrue(str(data.get("invite_link", "")).startswith("https://app.example.com/accept-invite/"))

        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("invitee@example.com", mail.outbox[0].to)
