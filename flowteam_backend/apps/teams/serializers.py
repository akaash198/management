from rest_framework import serializers
from .models import Team, TeamMember, TeamInvite
from apps.users.serializers import UserSerializer
from django.conf import settings

class TeamSerializer(serializers.ModelSerializer):
    avatar_url = serializers.SerializerMethodField()
    member_count = serializers.IntegerField(source="members.count", read_only=True)
    your_role = serializers.SerializerMethodField()

    class Meta:
        model = Team
        fields = ("id", "name", "slug", "avatar", "avatar_url", "plan", "ai_enabled", "member_count", "your_role", "created_at")
        read_only_fields = ("id", "slug", "created_at")
        extra_kwargs = {"avatar": {"write_only": True}}

    def get_avatar_url(self, obj):
        if obj.avatar:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.avatar.url)
            return obj.avatar.url
        return None

    def get_your_role(self, obj):
        user = self.context.get("request").user
        if user.is_superuser:
            return "admin"
        try:
            member = obj.members.get(user=user)
            return member.role
        except TeamMember.DoesNotExist:
            return None

class TeamMemberSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = TeamMember
        fields = ("id", "user", "role", "joined_at")

class TeamInviteSerializer(serializers.ModelSerializer):
    invite_link = serializers.SerializerMethodField()

    class Meta:
        model = TeamInvite
        fields = ("id", "email", "role", "created_at", "is_accepted", "invite_link")
        read_only_fields = ("id", "created_at", "is_accepted")

    def get_invite_link(self, obj: TeamInvite) -> str:
        base = (getattr(settings, "FRONTEND_BASE_URL", "") or "").rstrip("/")
        if not base:
            # Best effort fallback for local/dev.
            base = "http://localhost:3000"
        return f"{base}/accept-invite/{obj.id}"
