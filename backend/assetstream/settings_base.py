"""
Base settings shared across all environments.
Do not use this file directly — import from settings_dev or settings_prod.
"""
import os
from datetime import timedelta
from pathlib import Path
from celery.schedules import crontab

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get(
    "SECRET_KEY", "django-insecure-assetstream-dev-key-change-in-production"
)

ALLOWED_HOSTS = os.environ.get("ALLOWED_HOSTS", "*").split(",")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third party
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    "django_filters",
    "drf_spectacular",
    "django_celery_beat",
    # Local apps
    "accounts",
    "originations",
    "servicing",
    "remarketing",
    # Feature apps
    "workflows",
    "payments",
    "communications",
    "ai_engine",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "assetstream.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "assetstream.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("POSTGRES_DB", "assetstream"),
        "USER": os.environ.get("POSTGRES_USER", "assetstream"),
        "PASSWORD": os.environ.get("POSTGRES_PASSWORD", "assetstream_secret"),
        "HOST": os.environ.get("DB_HOST", "db"),
        "PORT": os.environ.get("DB_PORT", "5432"),
    }
}

AUTH_USER_MODEL = "accounts.CustomUser"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# REST Framework
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_VERSIONING_CLASS": "rest_framework.versioning.AcceptHeaderVersioning",
    "DEFAULT_VERSION": "v1",
    "ALLOWED_VERSIONS": ["v1"],
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "200/hour",
        "user": "2000/hour",
    },
}

# JWT Settings
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(
        minutes=int(os.environ.get("JWT_ACCESS_TOKEN_LIFETIME_MINUTES", 60))
    ),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# CORS
CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get(
        "CORS_ALLOWED_ORIGINS", "http://localhost,http://localhost:3000"
    ).split(",")
]
CORS_ALLOW_CREDENTIALS = True

# Email (overridden per environment)
DEFAULT_FROM_EMAIL = "AssetStream <noreply@assetstream.io>"
SERVER_EMAIL = DEFAULT_FROM_EMAIL

# Celery
CELERY_BROKER_URL = os.environ.get("REDIS_URL", "redis://redis:6379/0")
CELERY_RESULT_BACKEND = os.environ.get("REDIS_URL", "redis://redis:6379/0")
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = "UTC"
CELERY_BEAT_SCHEDULER = "django_celery_beat.schedulers:DatabaseScheduler"

CELERY_BEAT_SCHEDULE = {
    "simulate-iot-ping-every-2-min": {
        "task": "servicing.tasks.simulate_iot_ping",
        "schedule": 120.0,
    },
    "generate-monthly-invoices-every-10-min": {
        "task": "servicing.tasks.generate_monthly_invoices",
        "schedule": 600.0,
    },
    "notify-expiring-leases-daily": {
        "task": "servicing.tasks.notify_expiring_leases",
        "schedule": crontab(hour=8, minute=0),
    },
    "notify-overdue-invoices-daily": {
        "task": "servicing.tasks.notify_overdue_invoices",
        "schedule": crontab(hour=9, minute=0),
    },
    # Feature 4: SLA breach check every 30 min
    "check-sla-breaches": {
        "task": "servicing.tasks.check_sla_breaches",
        "schedule": 1800.0,
    },
    # Feature 2: Dunning automation daily at 10 AM
    "run-dunning-daily": {
        "task": "payments.tasks.run_dunning",
        "schedule": crontab(hour=10, minute=0),
    },
    # AI Engine: daily portfolio scan at 6 AM
    "ai-portfolio-scan-daily": {
        "task": "ai_engine.tasks.score_portfolio_and_trigger_workflows",
        "schedule": crontab(hour=6, minute=0),
    },
    # AI Engine: anomaly scan every hour
    "ai-anomaly-scan-hourly": {
        "task": "ai_engine.tasks.run_anomaly_scan",
        "schedule": 3600.0,
    },
}

# Groq AI API
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_MODEL = os.environ.get("GROQ_MODEL", "qwen/qwen3-32b")

# Security headers (safe for all environments)
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"

# Spectacular (Swagger)
SPECTACULAR_SETTINGS = {
    "TITLE": "AssetStream API",
    "DESCRIPTION": "AI-Powered Equipment-as-a-Service Platform API",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    # Resolve enum naming collisions reported by drf-spectacular during schema generation.
    # Map the generated (collision-resolved) enum names to stable, meaningful names.
    # If you see additional warnings, add more entries here.
    "ENUM_NAME_OVERRIDES": {
        "PriorityD67Enum": "AssetPriorityEnum",
        "PriorityE88Enum": "TaskPriorityEnum",
        "Category5baEnum": "AssetCategoryEnum",
    },
    # Note: the operationId collisions (e.g. ai_maintenance_predictions_retrieve)
    # should be resolved by setting explicit operation_ids on the view or
    # viewset actions using @extend_schema(operation_id="...") where appropriate.
}
