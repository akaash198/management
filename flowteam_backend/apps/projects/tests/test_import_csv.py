from __future__ import annotations

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.projects.models import Column, Project, Task
from apps.teams.models import Team, TeamMember
from apps.users.models import User


def authed_client(user: User) -> APIClient:
    client = APIClient()
    access = str(RefreshToken.for_user(user).access_token)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
    return client


class CsvImportTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="ceo@example.com", full_name="CEO", password="password123")
        self.team = Team.objects.create(name="Acme", created_by=self.user, plan="free")
        TeamMember.objects.create(team=self.team, user=self.user, role=TeamMember.CEO)
        self.project = Project.objects.create(team=self.team, name="P", description="", created_by=self.user)
        # Default columns are created by signals

    def test_import_csv_creates_tasks(self):
        csv_bytes = (
            "title,description,column,priority,issue_type,due_date\n"
            "Task One,Desc,To Do,high,task,2026-05-01\n"
            "Task Two,,To Do,normal,bug,\n"
        ).encode("utf-8")
        upload = SimpleUploadedFile("tasks.csv", csv_bytes, content_type="text/csv")

        client = authed_client(self.user)
        resp = client.post(f"/api/projects/{self.project.id}/import/csv/", {"file": upload}, format="multipart")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual((resp.data or {}).get("data", {}).get("created"), 2)
        self.assertEqual(Task.objects.filter(project=self.project).count(), 2)

