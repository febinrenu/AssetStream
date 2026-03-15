from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/", include("originations.urls")),
    path("api/", include("servicing.urls")),
    path("api/remarketing/", include("remarketing.urls")),
    # New feature apps
    path("api/", include("workflows.urls")),
    path("api/", include("payments.urls")),
    path("api/", include("communications.urls")),
    path("api/", include("ai_engine.urls")),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
]
