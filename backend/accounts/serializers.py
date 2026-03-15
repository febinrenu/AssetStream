from django.contrib.auth import get_user_model
from rest_framework import serializers

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["id", "username", "email", "password", "company_name", "role"]

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data.get("email", ""),
            password=validated_data["password"],
            company_name=validated_data.get("company_name", ""),
            role=validated_data.get("role", "lessee"),
        )
        return user


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id", "username", "email", "first_name", "last_name",
            "company_name", "phone_number", "avatar_color", "role", "created_at",
        ]
        read_only_fields = ["id", "username", "role", "created_at"]

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class AuditLogSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    username = serializers.SerializerMethodField()
    action = serializers.CharField()
    resource_type = serializers.CharField()
    resource_id = serializers.IntegerField(allow_null=True)
    description = serializers.CharField()
    ip_address = serializers.IPAddressField(allow_null=True)
    user_agent = serializers.CharField()
    metadata = serializers.JSONField()
    timestamp = serializers.DateTimeField()

    def get_username(self, obj):
        return obj.user.username if obj.user else "system"
