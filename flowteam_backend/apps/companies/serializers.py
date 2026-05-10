from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Company, CompanyMember, CompanyOnboardingInvite

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
    logo_url = serializers.SerializerMethodField()

    class Meta:
        model = Company
        fields = (
            "id", "name", "slug", "ceo", "ceo_id",
            "website", "industry", "size", "country",
            "logo", "logo_url",
            "email_domain", "email_domain_verified",
            "onboarding_status", "onboarding_completed_at",
            "notes",
            "team_count", "member_count",
            "created_at", "updated_at",
        )
        read_only_fields = ("id", "slug", "email_domain_verified", "onboarding_completed_at", "created_at", "updated_at")
        extra_kwargs = {"logo": {"write_only": True}}

    def get_logo_url(self, obj):
        if obj.logo:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.logo.url)
            return obj.logo.url
        return None


class CompanyDetailSerializer(CompanySerializer):
    """Used for retrieve — includes teams list and settings."""
    teams = serializers.SerializerMethodField()
    settings_json = serializers.JSONField(read_only=True)
    pending_invites_count = serializers.SerializerMethodField()

    class Meta(CompanySerializer.Meta):
        fields = CompanySerializer.Meta.fields + ("teams", "settings_json", "pending_invites_count")

    def get_teams(self, obj):
        from apps.teams.serializers import TeamSerializer
        request = self.context.get("request")
        return TeamSerializer(obj.teams.all(), many=True, context={"request": request}).data

    def get_pending_invites_count(self, obj):
        return obj.onboarding_invites.filter(status="pending").count()


class CompanyMemberSerializer(serializers.ModelSerializer):
    user = CompanyCEOSerializer(read_only=True)

    class Meta:
        model = CompanyMember
        fields = ("id", "user", "joined_at")


class CompanyOnboardingInviteSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanyOnboardingInvite
        fields = ("id", "email", "role", "status", "sent_at", "accepted_at")
        read_only_fields = ("id", "status", "sent_at", "accepted_at")


class CompanyOnboardingSerializer(serializers.Serializer):
    """
    Wizard step payload. Each step is partial — only the fields for that step are required.
    step 1: company_details
    step 2: ceo_assignment
    step 3: teams_setup
    step 4: email_domain
    step 5: review (marks active)
    """
    step = serializers.ChoiceField(choices=[
        "company_details", "ceo_assignment", "teams_setup", "email_domain", "review"
    ])

    # Step 1 — Company Details
    name = serializers.CharField(max_length=255, required=False)
    website = serializers.URLField(required=False, allow_blank=True)
    industry = serializers.ChoiceField(
        choices=[c[0] for c in Company.INDUSTRY_CHOICES], required=False, allow_blank=True
    )
    size = serializers.ChoiceField(
        choices=[c[0] for c in Company.SIZE_CHOICES], required=False, allow_blank=True
    )
    country = serializers.CharField(max_length=100, required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)

    # Step 2 — CEO Assignment
    ceo_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), required=False, allow_null=True
    )
    invite_ceo_email = serializers.EmailField(required=False, allow_blank=True)

    # Step 3 — Teams Setup (list of team names / existing team IDs)
    team_names = serializers.ListField(
        child=serializers.CharField(max_length=255), required=False, default=list
    )
    team_ids = serializers.ListField(
        child=serializers.UUIDField(), required=False, default=list
    )

    # Step 4 — Email Domain
    email_domain = serializers.CharField(max_length=255, required=False, allow_blank=True)

    # Step 5 — Review / finalize (no extra payload needed)


class CompanySettingsSerializer(serializers.ModelSerializer):
    """Patch-friendly serializer for the settings_json blob."""
    settings_json = serializers.JSONField()

    class Meta:
        model = Company
        fields = ("settings_json",)
