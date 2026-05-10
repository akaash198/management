from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Company, CompanyMember

User = get_user_model()


class CompanyCEOSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email", "full_name")


class CompanySerializer(serializers.ModelSerializer):
    ceo = CompanyCEOSerializer(read_only=True)
    ceo_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source="ceo", write_only=True, required=False, allow_null=True
    )
    team_count = serializers.IntegerField(source="teams.count", read_only=True)
    member_count = serializers.IntegerField(source="members.count", read_only=True)

    class Meta:
        model = Company
        fields = ("id", "name", "slug", "ceo", "ceo_id", "team_count", "member_count", "created_at")
        read_only_fields = ("id", "slug", "created_at")


class CompanyDetailSerializer(CompanySerializer):
    """Used for retrieve — includes teams list."""
    from apps.teams.serializers import TeamSerializer

    teams = serializers.SerializerMethodField()

    class Meta(CompanySerializer.Meta):
        fields = CompanySerializer.Meta.fields + ("teams",)

    def get_teams(self, obj):
        from apps.teams.serializers import TeamSerializer
        request = self.context.get("request")
        return TeamSerializer(obj.teams.all(), many=True, context={"request": request}).data


class CompanyMemberSerializer(serializers.ModelSerializer):
    user = CompanyCEOSerializer(read_only=True)

    class Meta:
        model = CompanyMember
        fields = ("id", "user", "joined_at")
