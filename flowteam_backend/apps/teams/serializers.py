from rest_framework import serializers
from .models import Team, TeamMember, TeamInvite, CustomRole
from apps.users.serializers import UserSerializer
from django.conf import settings


class CustomRoleMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomRole
        fields = ("id", "name", "slug", "level", "is_owner_role", "capabilities")


class TeamSerializer(serializers.ModelSerializer):
    avatar_url = serializers.SerializerMethodField()
    member_count = serializers.IntegerField(source="members.count", read_only=True)
    your_role = serializers.SerializerMethodField()
    your_custom_role = serializers.SerializerMethodField()
    company_id = serializers.UUIDField(source="company.id", read_only=True, allow_null=True)
    company_name = serializers.CharField(source="company.name", read_only=True, allow_null=True)

    class Meta:
        model = Team
        fields = (
            "id", "name", "slug", "avatar", "avatar_url", "plan", "ai_enabled",
            "company_id", "company_name", "member_count", "your_role",
            "your_custom_role", "created_at",
        )
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
        request = self.context.get("request")
        if not request:
            return None
        user = request.user
        if user.is_superuser:
            return "admin"
        try:
            member = obj.members.select_related("custom_role").get(user=user)
            return member.role
        except TeamMember.DoesNotExist:
            return None

    def get_your_custom_role(self, obj):
        request = self.context.get("request")
        if not request:
            return None
        user = request.user
        if user.is_superuser:
            return None
        try:
            member = obj.members.select_related("custom_role").get(user=user)
            if member.custom_role:
                return CustomRoleMinimalSerializer(member.custom_role).data
        except TeamMember.DoesNotExist:
            pass
        return None


class TeamMemberSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    custom_role = CustomRoleMinimalSerializer(read_only=True)

    class Meta:
        model = TeamMember
        fields = ("id", "user", "role", "custom_role", "permissions_json", "joined_at")
        read_only_fields = ("id", "user", "custom_role", "joined_at")


class TeamInviteSerializer(serializers.ModelSerializer):
    invite_link = serializers.SerializerMethodField()
    custom_role = CustomRoleMinimalSerializer(read_only=True)

    class Meta:
        model = TeamInvite
        fields = ("id", "email", "role", "custom_role", "created_at", "is_accepted", "invite_link")
        read_only_fields = ("id", "created_at", "is_accepted")

    def get_invite_link(self, obj: TeamInvite) -> str:
        base = (getattr(settings, "FRONTEND_BASE_URL", "") or "").rstrip("/")
        if not base:
            base = "http://localhost:3000"
        return f"{base}/accept-invite/{obj.id}"


class TeamInvitePreviewSerializer(serializers.ModelSerializer):
    team = serializers.SerializerMethodField()
    invited_by = UserSerializer(read_only=True)
    custom_role = CustomRoleMinimalSerializer(read_only=True)

    class Meta:
        model = TeamInvite
        fields = ("id", "email", "role", "custom_role", "created_at", "team", "invited_by", "is_accepted")
        read_only_fields = fields

    def get_team(self, obj: TeamInvite) -> dict:
        return {"id": str(obj.team_id), "name": obj.team.name}
