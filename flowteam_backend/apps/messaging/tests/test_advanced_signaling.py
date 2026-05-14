import json
import uuid
from channels.testing import WebsocketCommunicator
from django.test import TransactionTestCase
from django.contrib.auth import get_user_model
from apps.messaging.consumers import ChatConsumer
from apps.messaging.models import Channel, Call, CallParticipant
from apps.teams.models import Team, TeamMember

User = get_user_model()

class AdvancedSignalingTests(TransactionTestCase):
    def setUp(self):
        self.user1 = User.objects.create_user(email="u1@test.com", password="password", full_name="User One")
        self.user2 = User.objects.create_user(email="u2@test.com", password="password", full_name="User Two")
        self.user3 = User.objects.create_user(email="u3@test.com", password="password", full_name="User Three")
        
        self.team = Team.objects.create(name="Test Team", slug="test-team", created_by=self.user1)
        TeamMember.objects.create(team=self.team, user=self.user1, role="admin")
        TeamMember.objects.create(team=self.team, user=self.user2, role="member")
        TeamMember.objects.create(team=self.team, user=self.user3, role="member")
        
        self.channel = Channel.objects.create(team=self.team, name="test", display_name="Test Channel")

    async def test_group_call_signaling(self):
        """Test that signaling works in a 3-person group call."""
        comm1 = WebsocketCommunicator(ChatConsumer.as_asgi(), f"/ws/chat/{self.channel.id}/")
        comm1.scope["user"] = self.user1
        comm1.scope["url_route"] = {"kwargs": {"channel_id": str(self.channel.id)}}
        connected1, _ = await comm1.connect()
        self.assertTrue(connected1)
        await comm1.receive_json_from() # history
        await comm1.receive_json_from() # history.cursor

        comm2 = WebsocketCommunicator(ChatConsumer.as_asgi(), f"/ws/chat/{self.channel.id}/")
        comm2.scope["user"] = self.user2
        comm2.scope["url_route"] = {"kwargs": {"channel_id": str(self.channel.id)}}
        connected2, _ = await comm2.connect()
        self.assertTrue(connected2)
        await comm2.receive_json_from() # history
        await comm2.receive_json_from() # history.cursor

        comm3 = WebsocketCommunicator(ChatConsumer.as_asgi(), f"/ws/chat/{self.channel.id}/")
        comm3.scope["user"] = self.user3
        comm3.scope["url_route"] = {"kwargs": {"channel_id": str(self.channel.id)}}
        connected3, _ = await comm3.connect()
        self.assertTrue(connected3)
        await comm3.receive_json_from() # history
        await comm3.receive_json_from() # history.cursor

        # User 1 starts call
        await comm1.send_json_to({"type": "call.start", "data": {"call_type": "video"}})
        
        # User 1 receives their own call.started
        resp1_start = await comm1.receive_json_from()
        self.assertEqual(resp1_start["type"], "call.started")
        
        # User 2 and 3 should receive call.started
        resp2 = await comm2.receive_json_from()
        self.assertEqual(resp2["type"], "call.started")
        call_id = resp2["data"]["id"]

        resp3 = await comm3.receive_json_from()
        self.assertEqual(resp3["type"], "call.started")

        # User 2 joins
        await comm2.send_json_to({"type": "call.join", "data": {"call_id": call_id}})
        
        # User 1 and 3 should receive call.participant_joined
        resp1_join = await comm1.receive_json_from()
        self.assertEqual(resp1_join["type"], "call.participant_joined")
        self.assertEqual(resp1_join["data"]["user_id"], str(self.user2.id))

        resp3_join = await comm3.receive_json_from()
        self.assertEqual(resp3_join["type"], "call.participant_joined")

        # User 1 sends Screen Share Signal (simulated as call.signal)
        signal_data = {"type": "offer", "sdp": "v=0... (screen share)"}
        await comm1.send_json_to({
            "type": "call.signal",
            "data": {
                "call_id": call_id,
                "target_user_id": str(self.user2.id),
                "signal_type": "offer",
                "signal_data": signal_data
            }
        })

        # User 2 should receive the screen share offer
        resp2_sig = await comm2.receive_json_from()
        # User 2 might receive their own participant_joined
        if resp2_sig["type"] == "call.participant_joined":
            resp2_sig = await comm2.receive_json_from()
            
        self.assertEqual(resp2_sig["type"], "call.signal")
        self.assertEqual(resp2_sig["data"]["signal_data"]["sdp"], "v=0... (screen share)")
        self.assertEqual(resp2_sig["data"]["from_user_id"], str(self.user1.id))

        await comm1.disconnect()
        await comm2.disconnect()
        await comm3.disconnect()

    async def test_screen_share_metadata_event(self):
        """
        Test a 'call.screen_share' event that broadcasts 
        the screen sharing status to all participants.
        """
        comm1 = WebsocketCommunicator(ChatConsumer.as_asgi(), f"/ws/chat/{self.channel.id}/")
        comm1.scope["user"] = self.user1
        comm1.scope["url_route"] = {"kwargs": {"channel_id": str(self.channel.id)}}
        await comm1.connect()
        await comm1.receive_json_from()
        await comm1.receive_json_from()

        comm2 = WebsocketCommunicator(ChatConsumer.as_asgi(), f"/ws/chat/{self.channel.id}/")
        comm2.scope["user"] = self.user2
        comm2.scope["url_route"] = {"kwargs": {"channel_id": str(self.channel.id)}}
        await comm2.connect()
        await comm2.receive_json_from()
        await comm2.receive_json_from()

        # Start call
        await comm1.send_json_to({"type": "call.start", "data": {"call_type": "video"}})
        await comm1.receive_json_from() # own started
        
        resp2_start = await comm2.receive_json_from()
        call_id = resp2_start["data"]["id"]

        # Simulate start screen share
        await comm1.send_json_to({
            "type": "call.screen_share",
            "data": {
                "call_id": call_id,
                "is_sharing": True
            }
        })

        # User 1 receives their own broadcast
        resp1_screen = await comm1.receive_json_from()
        self.assertEqual(resp1_screen["type"], "call.screen_share")

        # Check if User 2 receives the status update
        resp2_screen = await comm2.receive_json_from()
        self.assertEqual(resp2_screen["type"], "call.screen_share")
        self.assertTrue(resp2_screen["data"]["is_sharing"])
        self.assertEqual(resp2_screen["data"]["user_id"], str(self.user1.id))

        await comm1.disconnect()
        await comm2.disconnect()
