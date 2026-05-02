from __future__ import annotations

from unittest.mock import patch

from django.test import TestCase
from apps.integrations.models import OutboxEvent, SlackWebhook
from apps.integrations.tasks import process_outbox
from apps.teams.models import Team, TeamMember
from apps.users.models import User


class OutboxSlackTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="slack@example.com", full_name="Slack", password="password123")
        self.team = Team.objects.create(name="Team", created_by=self.user)
        TeamMember.objects.create(team=self.team, user=self.user, role=TeamMember.ADMIN)

    @patch("apps.integrations.tasks.requests.post")
    def test_process_outbox_sends_to_slack(self, post):
        SlackWebhook.objects.create(team=self.team, name="Default", webhook_url="https://example.com/hook", created_by=self.user)
        OutboxEvent.objects.create(team=self.team, event_type="message.new", payload={"text": "hi"})

        post.return_value.raise_for_status.return_value = None
        result = process_outbox(batch_size=10)
        self.assertEqual(result["sent"], 1)
        self.assertEqual(OutboxEvent.objects.filter(status=OutboxEvent.STATUS_SENT).count(), 1)

