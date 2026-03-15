"""Development settings — never use in production."""
from assetstream.settings_base import *  # noqa: F401, F403

DEBUG = True

# Print emails to the console during development
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# Loosen CORS for local tooling
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

# Django Debug Toolbar (install separately if needed)
INTERNAL_IPS = ["127.0.0.1"]
