from __future__ import annotations

from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.messaging.models import Channel, ChannelMember
from apps.teams.models import Team, TeamMember
from apps.users.models import User


def authed_client(user: User) -> APIClient:
    client = APIClient()
    access = str(RefreshToken.for_user(user).access_token)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
    return client


class UploadsApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="uploader@example.com",
            full_name="Uploader User",
            password="password123",
        )
        self.team = Team.objects.create(name="UploadTeam", created_by=self.user)
        TeamMember.objects.create(team=self.team, user=self.user, role=TeamMember.CEO)
        self.channel = Channel.objects.get(team=self.team, name="general")
        ChannelMember.objects.get_or_create(channel=self.channel, user=self.user)

    def test_upload_image_succeeds(self):
        client = authed_client(self.user)
        image_file = SimpleUploadedFile(
            "avatar.png", b"\x89PNG\r\n\x1a\nfake-image-content", content_type="image/png"
        )
        resp = client.post(
            f"/api/messaging/channels/{self.channel.id}/uploads/",
            {"files": [image_file]},
            format="multipart",
        )
        self.assertEqual(resp.status_code, 201)
        data = resp.data.get("data")
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["filename"], "avatar.png")
        self.assertEqual(data[0]["content_type"], "image/png")

    def test_upload_audio_succeeds(self):
        client = authed_client(self.user)
        audio_file = SimpleUploadedFile(
            "voice-note.webm", b"\x1a\x45\xdf\xa3fake-audio-content", content_type="audio/webm"
        )
        resp = client.post(
            f"/api/messaging/channels/{self.channel.id}/uploads/",
            {"files": [audio_file]},
            format="multipart",
        )
        self.assertEqual(resp.status_code, 201)
        data = resp.data.get("data")
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["filename"], "voice-note.webm")
        self.assertEqual(data[0]["content_type"], "audio/webm")

    def test_upload_video_succeeds(self):
        client = authed_client(self.user)
        video_file = SimpleUploadedFile(
            "screen-share.mp4", b"\x00\x00\x00\x14ftypfake-video-content", content_type="video/mp4"
        )
        resp = client.post(
            f"/api/messaging/channels/{self.channel.id}/uploads/",
            {"files": [video_file]},
            format="multipart",
        )
        self.assertEqual(resp.status_code, 201)
        data = resp.data.get("data")
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["filename"], "screen-share.mp4")
        self.assertEqual(data[0]["content_type"], "video/mp4")

    def test_upload_unsupported_type_fails(self):
        client = authed_client(self.user)
        zip_file = SimpleUploadedFile(
            "archive.zip", b"fake-zip-content", content_type="application/zip"
        )
        resp = client.post(
            f"/api/messaging/channels/{self.channel.id}/uploads/",
            {"files": [zip_file]},
            format="multipart",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertFalse(resp.data.get("success"))
        self.assertIn("Unsupported file type", resp.data.get("error"))
