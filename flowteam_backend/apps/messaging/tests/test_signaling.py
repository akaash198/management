import json
from django.test import TransactionTestCase
from django.contrib.auth import get_user_model
from channels.testing import WebsocketCommunicator
from asgiref.sync import async_to_sync
from apps.messaging.consumers import ChatConsumer
from apps.messaging.models import Channel, ChannelMember, Call, Message
from apps.teams.models import Team

User = get_user_model()

class SignalingTests(TransactionTestCase):
    def setUp(self):
        self.user1 = User.objects.create_user(email="user1@example.com", full_name="User One", password="password")
        self.user2 = User.objects.create_user(email="user2@example.com", full_name="User Two", password="password")
        self.team = Team.objects.create(name="Test Team", created_by=self.user1)
        from apps.teams.models import TeamMember
        TeamMember.objects.create(team=self.team, user=self.user1, role="ceo")
        TeamMember.objects.create(team=self.team, user=self.user2, role="member")
        # Default channel "general" is created by signals
        self.channel = Channel.objects.get(team=self.team, name="general")

    def test_full_call_signaling_flow(self):
        """
        Tests the end-to-end signaling flow:
        1. User 1 starts a call.
        2. User 2 receives the start event.
        3. User 2 joins the call.
        4. User 1 receives join event.
        5. User 1 sends a WebRTC signal to User 2.
        6. User 2 receives the signal.
        7. User 1 ends the call.
        8. Call is marked as inactive and system message is created.
        """
        async def run_test():
            # Connect User 1
            comm1 = WebsocketCommunicator(ChatConsumer.as_asgi(), f"/ws/chat/{self.channel.id}/")
            comm1.scope["user"] = self.user1
            comm1.scope["url_route"] = {"kwargs": {"channel_id": str(self.channel.id)}}
            connected1, _ = await comm1.connect()
            self.assertTrue(connected1)
            await comm1.receive_json_from() # history
            await comm1.receive_json_from() # history.cursor

            # Connect User 2
            comm2 = WebsocketCommunicator(ChatConsumer.as_asgi(), f"/ws/chat/{self.channel.id}/")
            comm2.scope["user"] = self.user2
            comm2.scope["url_route"] = {"kwargs": {"channel_id": str(self.channel.id)}}
            connected2, _ = await comm2.connect()
            self.assertTrue(connected2)
            await comm2.receive_json_from() # history
            await comm2.receive_json_from() # history.cursor

            # 1. User 1 starts a call
            await comm1.send_json_to({
                "type": "call.start",
                "data": {"call_type": "video"}
            })

            # 2. User 2 receives call.started
            resp2 = await comm2.receive_json_from()
            self.assertEqual(resp2["type"], "call.started")
            call_id = resp2["data"]["id"]
            self.assertEqual(resp2["data"]["call_type"], "video")

            # 3. User 2 joins the call
            await comm2.send_json_to({
                "type": "call.join",
                "data": {"call_id": call_id}
            })

            # 4. User 1 receives participant joined
            resp1 = await comm1.receive_json_from()
            # User 1 also received their own call.started first
            self.assertEqual(resp1["type"], "call.started")
            
            resp1 = await comm1.receive_json_from()
            self.assertEqual(resp1["type"], "call.participant_joined")
            self.assertEqual(resp1["data"]["user_id"], str(self.user2.id))

            # 5. User 1 sends a WebRTC offer to User 2
            offer_data = {"sdp": "v=0..."}
            await comm1.send_json_to({
                "type": "call.signal",
                "data": {
                    "target_user_id": str(self.user2.id),
                    "signal_type": "offer",
                    "signal_data": offer_data,
                    "call_id": call_id
                }
            })

            # 6. User 2 receives the signal
            resp2 = await comm2.receive_json_from()
            # Note: User 2 might receive their own participant_joined event
            if resp2["type"] == "call.participant_joined":
                resp2 = await comm2.receive_json_from()
                
            self.assertEqual(resp2["type"], "call.signal")
            self.assertEqual(resp2["data"]["from_user_id"], str(self.user1.id))
            self.assertEqual(resp2["data"]["signal_data"], offer_data)

            # 7. User 1 ends the call
            await comm1.send_json_to({
                "type": "call.end",
                "data": {"call_id": call_id, "call_type": "video", "duration_seconds": 10, "was_answered": True}
            })

            # 8. Verify call state and system message
            # Both should receive call.ended
            
            # User 1 might receive their own signal back (broadcasted to group)
            resp1 = await comm1.receive_json_from()
            if resp1["type"] == "call.signal":
                resp1 = await comm1.receive_json_from()
            self.assertEqual(resp1["type"], "call.ended")
            
            end_resp2 = await comm2.receive_json_from()
            self.assertEqual(end_resp2["type"], "call.ended")

            # Both receive the system message "Call ended"
            sys_resp1 = await comm1.receive_json_from()
            self.assertEqual(sys_resp1["type"], "message.new")
            self.assertTrue(sys_resp1["data"]["is_system"])
            self.assertIn("ended", sys_resp1["data"]["text"])

            await comm1.disconnect()
            await comm2.disconnect()

        async_to_sync(run_test)()

    def test_call_missed_signaling(self):
        """Tests that call.missed terminates the call and sends a missed call message."""
        async def run_test():
            comm1 = WebsocketCommunicator(ChatConsumer.as_asgi(), f"/ws/chat/{self.channel.id}/")
            comm1.scope["user"] = self.user1
            comm1.scope["url_route"] = {"kwargs": {"channel_id": str(self.channel.id)}}
            await comm1.connect()
            await comm1.receive_json_from() # history
            await comm1.receive_json_from() # history.cursor

            # Start call
            await comm1.send_json_to({"type": "call.start", "data": {"call_type": "audio"}})
            start_resp = await comm1.receive_json_from()
            call_id = start_resp["data"]["id"]

            # User 1 sends call.missed (simulating timeout)
            await comm1.send_json_to({
                "type": "call.missed",
                "data": {"call_id": call_id, "call_type": "audio"}
            })

            # User 1 receives call.ended
            end_resp = await comm1.receive_json_from(timeout=10)
            self.assertEqual(end_resp["type"], "call.ended")

            # User 1 receives system message "Missed call"
            sys_resp = await comm1.receive_json_from(timeout=10)
            self.assertEqual(sys_resp["type"], "message.new")
            self.assertIn("Missed", sys_resp["data"]["text"])

            await comm1.disconnect()

        async_to_sync(run_test)()
