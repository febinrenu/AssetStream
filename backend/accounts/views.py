from django.contrib.auth import get_user_model
from django.conf import settings
from django.core.management import call_command
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import RegisterSerializer, UserSerializer


class UserListView(generics.ListAPIView):
    """Admin/analyst: list all users (for dropdowns, copilot, etc.)."""
    serializer_class = UserSerializer

    def get_queryset(self):
        User = get_user_model()
        qs = User.objects.all().order_by("username")
        role = self.request.query_params.get("role")
        if role:
            qs = qs.filter(role=role)
        return qs

    def get_permissions(self):
        user = self.request.user
        if user.is_authenticated and user.role in ("admin", "analyst"):
            return [permissions.IsAuthenticated()]
        return [permissions.IsAdminUser()]


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            UserSerializer(user).data,
            status=status.HTTP_201_CREATED,
        )


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class SeedView(APIView):
    """One-time seed endpoint. Protected by SECRET_KEY token."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        import threading
        token = request.query_params.get("token", "")
        if token != settings.SECRET_KEY:
            return Response({"error": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

        def run():
            try:
                call_command("seed_demo_data")
            except Exception:
                pass

        threading.Thread(target=run, daemon=False).start()
        return Response({"status": "Seeding started. Check Supabase in 3 minutes."})
