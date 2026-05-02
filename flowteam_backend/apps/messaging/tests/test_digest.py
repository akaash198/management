from __future__ import annotations

from django.core import mail
from django.test import TestCase
from django.test.utils import override_settings

from apps.messaging.models import Notification, NotificationPreference
from apps.messaging.tasks import send_daily_digest
from apps.teams.models import Team, TeamMember
from apps.users.models import User


class DigestEmailTests(TestCase):
    @override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
    def test_send_daily_digest_emails_and_marks_sent(self):
        user = User.objects.create_user(email="digest@example.com", full_name="Digest", password="password123")
        team = Team.objects.create(name="Team", created_by=user)
        TeamMember.objects.create(team=team, user=user, role=TeamMember.ADMIN)
        NotificationPreference.objects.create(user=user, email_enabled=True)

        n1 = Notification.objects.create(
            recipient=user,
            type="task_due",
            title="Task due",
            body="Task A is due",
            reference_type="task",
            reference_id=team.id,
        )
        n2 = Notification.objects.create(
            recipient=user,
            type="task_assigned",
            title="Task assigned",
            body="Task B assigned",
            reference_type="task",
            reference_id=team.id,
        )

        send_daily_digest()

        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("digest@example.com", mail.outbox[0].to)

        n1.refresh_from_db()
        n2.refresh_from_db()
        self.assertTrue(n1.digest_sent)
        self.assertTrue(n2.digest_sent)

