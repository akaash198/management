from __future__ import annotations

from django.test import TestCase

from apps.messaging.models import Channel, Message
from apps.messaging.services import create_message_with_seq, get_messages_after_seq
from apps.teams.models import Team, TeamMember
from apps.users.models import User


class MessageDeliveryTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="a@example.com", full_name="A User", password="password123")
        self.team = Team.objects.create(name="Team", created_by=self.user)
        TeamMember.objects.create(team=self.team, user=self.user, role=TeamMember.ADMIN)
        # Default channels are created by messaging signals when a team is created.
        self.channel = Channel.objects.get(team=self.team, name="general")

    def test_idempotent_send_assigns_seq_and_dedupes(self):
        msg1, created1 = create_message_with_seq(
            channel_id=self.channel.id,
            sender=self.user,
            text="hello",
            client_id="c1",
            attachment_ids=[],
        )
        self.assertTrue(created1)
        self.assertEqual(int(msg1.seq), 1)

        msg1b, created1b = create_message_with_seq(
            channel_id=self.channel.id,
            sender=self.user,
            text="hello",
            client_id="c1",
            attachment_ids=[],
        )
        self.assertFalse(created1b)
        self.assertEqual(msg1b.id, msg1.id)
        self.assertEqual(int(msg1b.seq), 1)
        self.assertEqual(Message.objects.filter(channel=self.channel).count(), 1)

        msg2, created2 = create_message_with_seq(
            channel_id=self.channel.id,
            sender=self.user,
            text="second",
            client_id="c2",
            attachment_ids=[],
        )
        self.assertTrue(created2)
        self.assertEqual(int(msg2.seq), 2)

    def test_history_sync_by_last_seq(self):
        create_message_with_seq(
            channel_id=self.channel.id,
            sender=self.user,
            text="one",
            client_id="c1",
            attachment_ids=[],
        )
        create_message_with_seq(
            channel_id=self.channel.id,
            sender=self.user,
            text="two",
            client_id="c2",
            attachment_ids=[],
        )

        delta = get_messages_after_seq(self.channel.id, last_seq=1, limit=50)
        self.assertEqual(len(delta), 1)
        self.assertEqual(int(delta[0].seq), 2)
        self.assertEqual(delta[0].text, "two")

