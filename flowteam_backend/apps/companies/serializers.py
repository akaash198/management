from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Company, CompanyMember, CompanyInvite, CompanyOnboardingInvite

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
    """Used for retrieve — includes teams list, members, and settings."""
    teams = serializers.SerializerMethodField()
    settings_json = serializers.JSONField(read_only=True)
    pending_invites_count = serializers.SerializerMethodField()
    your_role = serializers.SerializerMethodField()

    class Meta(CompanySerializer.Meta):
        fields = CompanySerializer.Meta.fields + ("teams", "settings_json", "pending_invites_count", "your_role")

    def get_teams(self, obj):
        from apps.teams.serializers import TeamSerializer
        request = self.context.get("request")
        return TeamSerializer(obj.teams.all(), many=True, context={"request": request}).data

    def get_pending_invites_count(self, obj):
        return obj.invites.filter(status="pending").count()

    def get_your_role(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return None
        if request.user.is_superuser:
            return "superuser"
        from .rbac import get_user_company_role
        return get_user_company_role(company_id=str(obj.id), user=request.user)


class CompanyMemberSerializer(serializers.ModelSerializer):
    user = CompanyCEOSerializer(read_only=True)

    class Meta:
        model = CompanyMember
        fields = ("id", "user", "role", "joined_at")
        read_only_fields = ("id", "joined_at")


class CompanyInviteSerializer(serializers.ModelSerializer):
    invited_by = CompanyCEOSerializer(read_only=True)
    invite_link = serializers.SerializerMethodField()

    class Meta:
        model = CompanyInvite
        fields = ("id", "email", "role", "status", "invited_by", "invite_link", "created_at", "expires_at", "accepted_at")
        read_only_fields = ("id", "status", "invited_by", "invite_link", "created_at", "expires_at", "accepted_at")

    def get_invite_link(self, obj):
        from django.conf import settings as django_settings
        base = (getattr(django_settings, "FRONTEND_BASE_URL", "") or "http://localhost:3000").rstrip("/")
        return f"{base}/company-invite/{obj.token}"


class CompanyInviteCreateSerializer(serializers.Serializer):
    email = serializers.EmailField()
    role = serializers.ChoiceField(
        choices=[c[0] for c in CompanyMember.ROLE_CHOICES],
        default=CompanyMember.MEMBER,
    )


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


class CompanyCapabilitiesSerializer(serializers.Serializer):
    role = serializers.CharField(allow_null=True)
    can_manage_company = serializers.BooleanField()
    can_invite_members = serializers.BooleanField()
    can_change_roles = serializers.BooleanField()
    can_remove_members = serializers.BooleanField()
    can_create_teams = serializers.BooleanField()
    can_view_members = serializers.BooleanField()
    assignable_invite_roles = serializers.ListField(child=serializers.CharField())
