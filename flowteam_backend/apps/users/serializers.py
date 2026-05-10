from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    avatar_url = serializers.SerializerMethodField()
    timezone = serializers.CharField(source="timezone_pref", required=False)
    is_email_verified = serializers.SerializerMethodField()
    two_factor_enabled = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "full_name",
            "timezone",
            "avatar",
            "avatar_url",
            "is_email_verified",
            "two_factor_enabled",
            "is_staff",
            "is_superuser",
        )
        read_only_fields = ("id", "email")
        extra_kwargs = {"avatar": {"write_only": True}}

    def get_avatar_url(self, obj):
        if obj.avatar:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.avatar.url)
            return obj.avatar.url
        return None

    def get_is_email_verified(self, obj):
        return bool(getattr(obj, "email_verified_at", None))


class AdminUserSerializer(serializers.ModelSerializer):
    timezone = serializers.CharField(source="timezone_pref", required=False)

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "full_name",
            "timezone",
            "is_active",
            "is_staff",
            "is_superuser",
            "date_joined",
        )
        read_only_fields = ("id", "date_joined")


class AdminUserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    timezone = serializers.CharField(source="timezone_pref", required=False)

    class Meta:
        model = User
        fields = ("email", "full_name", "timezone", "password", "is_active", "is_staff", "is_superuser")

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User.objects.create_user(password=password, **validated_data)
        return user


class AdminUserUpdateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6, required=False, allow_blank=False)
    timezone = serializers.CharField(source="timezone_pref", required=False)

    class Meta:
        model = User
        fields = ("full_name", "timezone", "password", "is_active", "is_staff", "is_superuser")

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        instance = super().update(instance, validated_data)
        if password:
            instance.set_password(password)
            instance.save(update_fields=["password"])
        return instance

class RegisterSerializer(serializers.ModelSerializer):
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ("email", "full_name", "password", "password_confirm")
        extra_kwargs = {"password": {"write_only": True}}

    def validate(self, data):
        if data["password"] != data["password_confirm"]:
            raise serializers.ValidationError("Passwords do not match.")
        return data

    def create(self, validated_data):
        validated_data.pop("password_confirm")
        user = User.objects.create_user(**validated_data)
        return user
