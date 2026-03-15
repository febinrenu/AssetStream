from rest_framework import serializers

from .models import ApprovalRequest


class ApprovalRequestSerializer(serializers.ModelSerializer):
    requested_by_username = serializers.CharField(source="requested_by.username", read_only=True)
    requested_by_name = serializers.SerializerMethodField()
    reviewed_by_username = serializers.CharField(source="reviewed_by.username", read_only=True)
    request_type_display = serializers.CharField(source="get_request_type_display", read_only=True)

    class Meta:
        model = ApprovalRequest
        fields = [
            "id", "request_number", "request_type", "request_type_display",
            "status", "priority",
            "requested_by", "requested_by_username", "requested_by_name",
            "reviewed_by", "reviewed_by_username",
            "resource_type", "resource_id",
            "payload", "requester_notes", "reviewer_notes",
            "created_at", "reviewed_at", "expires_at",
        ]
        read_only_fields = [
            "id", "request_number", "status",
            "reviewed_by", "reviewed_at", "created_at",
        ]

    def get_requested_by_name(self, obj):
        u = obj.requested_by
        return f"{u.first_name} {u.last_name}".strip() or u.username


class ApprovalCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApprovalRequest
        fields = [
            "request_type", "priority", "resource_type", "resource_id",
            "payload", "requester_notes",
        ]


class ApprovalReviewSerializer(serializers.Serializer):
    reviewer_notes = serializers.CharField(max_length=2000, required=False, allow_blank=True)
