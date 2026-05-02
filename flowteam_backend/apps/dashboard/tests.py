from __future__ import annotations

from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.projects.models import Project, Task
from apps.teams.models import Team, TeamMember
from apps.users.models import User


def authed_client(user: User) -> APIClient:
    client = APIClient()
    access = str(RefreshToken.for_user(user).access_token)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
    return client


class DashboardMetricsTests(TestCase):
    def setUp(self):
        self.ceo = User.objects.create_user(email="ceo@example.com", full_name="CEO", password="password123")
        self.team = Team.objects.create(name="Acme", created_by=self.ceo, plan="free")
        TeamMember.objects.create(team=self.team, user=self.ceo, role=TeamMember.CEO)
        self.project = Project.objects.create(team=self.team, name="Website Redesign", created_by=self.ceo)

        # Default columns are created by signals (To Do, In Progress, In Review, Done)
        self.todo = self.project.columns.get(name="To Do")
        self.done = self.project.columns.get(name="Done")

    def test_dashboard_team_scope_populates_counts_and_team_signal(self):
        today = timezone.now().date()
        Task.objects.create(
            title="Overdue task",
            project=self.project,
            column=self.todo,
            reporter=self.ceo,
            priority="high",
            due_date=today - timedelta(days=1),
        )
        Task.objects.create(
            title="Due today",
            project=self.project,
            column=self.todo,
            reporter=self.ceo,
            priority="urgent",
            due_date=today,
        )
        Task.objects.create(
            title="Due soon",
            project=self.project,
            column=self.todo,
            reporter=self.ceo,
            priority="normal",
            due_date=today + timedelta(days=3),
        )
        Task.objects.create(
            title="Done task",
            project=self.project,
            column=self.done,
            reporter=self.ceo,
            priority="low",
            due_date=today,
        )

        client = authed_client(self.ceo)
        resp = client.get("/api/dashboard/", {"team_id": str(self.team.id)})
        self.assertEqual(resp.status_code, 200)

        data = (resp.data or {}).get("data") or {}
        my_tasks = data.get("my_tasks") or {}
        self.assertEqual(my_tasks.get("total"), 3)
        self.assertEqual(my_tasks.get("overdue"), 1)
        self.assertEqual(my_tasks.get("due_today"), 1)
        self.assertEqual(my_tasks.get("due_this_week"), 2)

        team_stats = data.get("team_stats") or {}
        self.assertIsNotNone(team_stats.get("most_active_member"))
        self.assertEqual((team_stats.get("most_active_member") or {}).get("full_name"), "CEO")
