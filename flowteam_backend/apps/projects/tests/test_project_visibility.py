from __future__ import annotations

from django.test import TestCase
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


class ProjectVisibilityTests(TestCase):
    def setUp(self):
        self.ceo = User.objects.create_user(email="ceo@example.com", full_name="CEO", password="password123")
        self.member = User.objects.create_user(email="mem@example.com", full_name="Member", password="password123")
        self.team = Team.objects.create(name="Acme", created_by=self.ceo, plan="free")
        TeamMember.objects.create(team=self.team, user=self.ceo, role=TeamMember.CEO)
        TeamMember.objects.create(team=self.team, user=self.member, role=TeamMember.MEMBER)

        self.project = Project.objects.create(team=self.team, name="Website Redesign", created_by=self.ceo)

        # Default columns are created by signals
        self.todo = self.project.columns.get(name="To Do")

        Task.objects.create(
            title="Task A",
            project=self.project,
            column=self.todo,
            reporter=self.ceo,
            assignee=self.member,
            priority="normal",
        )

    def test_team_member_can_retrieve_project_board(self):
        client = authed_client(self.member)
        resp = client.get(f"/api/projects/{self.project.id}/")
        self.assertEqual(resp.status_code, 200)
        data = (resp.data or {}).get("data") or {}
        self.assertEqual(data.get("id"), str(self.project.id))

    def test_team_member_can_list_tasks_for_project(self):
        client = authed_client(self.member)
        resp = client.get("/api/tasks/", {"project_id": str(self.project.id)})
        self.assertEqual(resp.status_code, 200)
        items = (resp.data or {}).get("data") or []
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0].get("title"), "Task A")

