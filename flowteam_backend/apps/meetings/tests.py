import uuid
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from apps.users.models import User
from apps.teams.models import Team, TeamMember
from apps.meetings.models import Meeting
from apps.messaging.models import Channel

class MeetingAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="test@example.com",
            password="password",
            full_name="Test User"
        )
        self.client.force_authenticate(user=self.user)
        
        self.team = Team.objects.create(name="Test Team", slug="test-team", created_by=self.user)
        TeamMember.objects.create(team=self.team, user=self.user, role="admin")
        
    def test_create_instant_meeting(self):
        """Test creating an instant meeting (starts now)."""
        url = reverse("team-meetings", kwargs={"team_id": self.team.id})
        data = {
            "title": "Instant Sync",
            "team": str(self.team.id),
            "call_type": "video",
            "starts_at": timezone.now().isoformat(),
            "duration_minutes": 30,
            "attendees": [str(self.user.id)]
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["data"]["title"], "Instant Sync")
        self.assertTrue(response.data["data"]["channel_id"]) # Should have a channel created

    def test_list_team_meetings(self):
        """Test listing meetings for a specific team."""
        # Create a meeting first
        Meeting.objects.create(
            title="Standup",
            team=self.team,
            starts_at=timezone.now(),
            duration_minutes=15,
            created_by=self.user,
            channel=Channel.objects.create(team=self.team, name="standup", display_name="Standup", created_by=self.user)
        )
        
        url = reverse("team-meetings", kwargs={"team_id": self.team.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["data"]), 1)
        self.assertEqual(response.data["data"][0]["title"], "Standup")

    def test_cancel_meeting(self):
        """Test cancelling a scheduled meeting."""
        meeting = Meeting.objects.create(
            title="Planning",
            team=self.team,
            starts_at=timezone.now() + timezone.timedelta(days=1),
            duration_minutes=60,
            created_by=self.user,
            channel=Channel.objects.create(team=self.team, name="planning", display_name="Planning", created_by=self.user),
            status="scheduled"
        )
        
        url = reverse("meeting-detail", kwargs={"meeting_id": meeting.id})
        response = self.client.patch(url, {"status": "cancelled"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        meeting.refresh_from_db()
        self.assertEqual(meeting.status, "cancelled")
