from __future__ import annotations

from django.test import TestCase
from rest_framework import status
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.projects.models import Epic, Retrospective, RetroItem, Task
from apps.teams.models import Team, TeamMember
from apps.users.models import User


def authed_client(user: User) -> APIClient:
    client = APIClient()
    access = str(RefreshToken.for_user(user).access_token)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
    return client


class TestModernPM(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="test@example.com", password="password", full_name="Test User")
        self.team = Team.objects.create(name="Test Team", created_by=self.user)
        TeamMember.objects.create(team=self.team, user=self.user, role=TeamMember.ADMIN)
        self.project = self.team.projects.create(name="Test Project", created_by=self.user)
        self.column = self.project.columns.get(name="To Do")
        self.client = authed_client(self.user)

    def test_epic_crud(self):
        url = reverse("epic-list")
        data = {
            "project": self.project.id,
            "title": "New Epic",
            "status": "backlog",
            "color": "#ff0000"
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        epic_id = response.data["data"]["id"]

        task_url = reverse("task-list")
        task_data = {
            "project": self.project.id,
            "column": self.column.id,
            "title": "Task in Epic",
            "epic": epic_id,
            "priority": "normal"
        }
        response = self.client.post(task_url, task_data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(str(response.data["data"]["epic"]), str(epic_id))

        response = self.client.get(f"{url}?project_id={self.project.id}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["data"]), 1)
        self.assertEqual(response.data["data"][0]["title"], "New Epic")

    def test_retrospective_flow(self):
        retro_url = reverse("retrospective-list")
        data = {
            "team": self.team.id,
            "title": "Sprint 1 Retro",
            "date": "2026-05-14"
        }
        response = self.client.post(retro_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        retro_id = response.data["data"]["id"]

        item_url = reverse("retro-item-list")
        item_data = {
            "retrospective": retro_id,
            "item_type": "keep",
            "text": "Finished all tasks!"
        }
        response = self.client.post(item_url, item_data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        item_id = response.data["data"]["id"]

        vote_url = reverse("retro-item-vote", args=[item_id])
        response = self.client.post(vote_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["votes"], 1)
        self.assertEqual(response.data["data"]["has_voted"], True)

        response = self.client.post(vote_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["votes"], 0)
        self.assertEqual(response.data["data"]["has_voted"], False)

    def test_task_bug_resolution(self):
        url = reverse("task-list")
        data = {
            "project": self.project.id,
            "column": self.column.id,
            "title": "Critical Bug",
            "issue_type": "bug",
            "priority": "urgent"
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        task_id = response.data["data"]["id"]

        done_column = self.project.columns.get(name="Done")
        move_url = reverse("task-move", args=[task_id])
        response = self.client.post(move_url, {"column": done_column.id}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        detail_url = reverse("task-detail", args=[task_id])
        response = self.client.get(detail_url)
        self.assertIsNotNone(response.data["data"]["resolution_at"])

    def test_parent_task_touched_by_comments_and_updates(self):
        from apps.projects.models import Comment, TimeLog, TaskApproval, Attachment, SubTask, TaskActivity
        from django.utils import timezone
        import time
        from django.core.files.uploadedfile import SimpleUploadedFile

        # 1. Create a task (unresolved)
        task = Task.objects.create(
            project=self.project,
            column=self.column,
            title="Parent Task Test",
            reporter=self.user,
        )
        
        # Capture original updated_at (need to reload from DB)
        task.refresh_from_db()
        orig_updated_at = task.updated_at

        # Sleep briefly to ensure time diff
        time.sleep(0.01)

        # 2. Add a comment
        comment = Comment.objects.create(
            task=task,
            author=self.user,
            text="This is a comment"
        )
        
        # Verify updated_at is updated
        task.refresh_from_db()
        self.assertGreater(task.updated_at, orig_updated_at)
        
        # Verify TaskActivity is created
        activity = TaskActivity.objects.filter(task=task, verb="commented").first()
        self.assertIsNotNone(activity)
        self.assertEqual(activity.actor, self.user)
        self.assertEqual(activity.detail.get("comment_id"), str(comment.id))

        # Reset updated_at tracker
        orig_updated_at = task.updated_at
        time.sleep(0.01)

        # 3. Add a TimeLog
        TimeLog.objects.create(
            task=task,
            user=self.user,
            minutes=60,
        )
        task.refresh_from_db()
        self.assertGreater(task.updated_at, orig_updated_at)

        # Reset updated_at tracker
        orig_updated_at = task.updated_at
        time.sleep(0.01)

        # 4. Add a TaskApproval
        TaskApproval.objects.create(
            project=self.project,
            task=task,
            title="Approve work",
            requested_by=self.user,
        )
        task.refresh_from_db()
        self.assertGreater(task.updated_at, orig_updated_at)

        # Reset updated_at tracker
        orig_updated_at = task.updated_at
        time.sleep(0.01)

        # 5. Add an Attachment
        test_file = SimpleUploadedFile("test.txt", b"dummy content")
        Attachment.objects.create(
            task=task,
            file=test_file,
            original_filename="test.txt",
            file_size=13,
            mime_type="text/plain",
            uploaded_by=self.user,
        )
        task.refresh_from_db()
        self.assertGreater(task.updated_at, orig_updated_at)

        # Reset updated_at tracker
        orig_updated_at = task.updated_at
        time.sleep(0.01)

        # 6. Add a SubTask
        SubTask.objects.create(
            task=task,
            title="Subtask 1",
            created_by=self.user,
        )
        task.refresh_from_db()
        self.assertGreater(task.updated_at, orig_updated_at)

        # 7. Verify resolved tasks do not get touched
        task.resolution_at = timezone.now()
        task.save()
        task.refresh_from_db()
        resolved_updated_at = task.updated_at
        time.sleep(0.01)

        # Add another comment
        Comment.objects.create(
            task=task,
            author=self.user,
            text="Comment on resolved task"
        )
        task.refresh_from_db()
        self.assertEqual(task.updated_at, resolved_updated_at)