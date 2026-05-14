import pytest
from rest_framework import status
from django.urls import reverse
from rest_framework.test import APIClient
from apps.projects.models import Epic, Retrospective, RetroItem, Task
from apps.teams.models import Team, TeamMember
from apps.users.models import User

@pytest.mark.django_db
class TestModernPM:
    @pytest.fixture
    def api_client(self):
        return APIClient()

    @pytest.fixture
    def setup_data(self, api_client):
        self.user = User.objects.create_user(email="test@example.com", password="password", full_name="Test User")
        self.team = Team.objects.create(name="Test Team", created_by=self.user)
        TeamMember.objects.create(team=self.team, user=self.user, role=TeamMember.ADMIN)
        self.project = self.team.projects.create(name="Test Project", created_by=self.user)
        self.column = self.project.columns.get(name="To Do")
        api_client.force_authenticate(user=self.user)
        return self.user, self.team, self.project

    def test_epic_crud(self, api_client, setup_data):
        user, team, project = setup_data
        
        # Create Epic
        url = reverse("epic-list")
        data = {
            "project": project.id,
            "title": "New Epic",
            "status": "backlog",
            "color": "#ff0000"
        }
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_201_CREATED
        epic_id = response.data["data"]["id"]
        
        # Link Task to Epic
        task_url = reverse("task-list")
        task_data = {
            "project": project.id,
            "column": self.column.id,
            "title": "Task in Epic",
            "epic": epic_id,
            "priority": "normal"
        }
        response = api_client.post(task_url, task_data)
        assert response.status_code == status.HTTP_201_CREATED
        # Use str() for comparison to handle UUID/string mismatch
        assert str(response.data["data"]["epic"]) == str(epic_id)
        
        # List Epics with project filter
        response = api_client.get(f"{url}?project_id={project.id}")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["data"]) == 1
        assert response.data["data"][0]["title"] == "New Epic"

    def test_retrospective_flow(self, api_client, setup_data):
        user, team, project = setup_data
        
        # Create Retrospective
        retro_url = reverse("retrospective-list")
        data = {
            "team": team.id,
            "title": "Sprint 1 Retro",
            "date": "2026-05-14"
        }
        response = api_client.post(retro_url, data)
        assert response.status_code == status.HTTP_201_CREATED
        retro_id = response.data["data"]["id"]
        
        # Add Retro Item
        item_url = reverse("retro-item-list")
        item_data = {
            "retrospective": retro_id,
            "item_type": "keep",
            "text": "Finished all tasks!"
        }
        response = api_client.post(item_url, item_data)
        assert response.status_code == status.HTTP_201_CREATED
        item_id = response.data["data"]["id"]
        
        # Vote on Item
        vote_url = reverse("retro-item-vote", args=[item_id])
        response = api_client.post(vote_url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["data"]["votes"] == 1
        assert response.data["data"]["has_voted"] is True
        
        # Vote again to unvote
        response = api_client.post(vote_url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["data"]["votes"] == 0
        assert response.data["data"]["has_voted"] is False

    def test_task_bug_resolution(self, api_client, setup_data):
        user, team, project = setup_data
        
        # Create Bug Task
        url = reverse("task-list")
        data = {
            "project": project.id,
            "column": self.column.id,
            "title": "Critical Bug",
            "issue_type": "bug",
            "priority": "urgent"
        }
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_201_CREATED
        task_id = response.data["data"]["id"]
        
        # Resolve Bug (Move to done column)
        done_column = project.columns.get(name="Done")
        move_url = reverse("task-move", args=[task_id])
        response = api_client.post(move_url, {"column": done_column.id})
        assert response.status_code == status.HTTP_200_OK
        
        # Verify resolution_at is set
        detail_url = reverse("task-detail", args=[task_id])
        response = api_client.get(detail_url)
        assert response.data["data"]["resolution_at"] is not None
