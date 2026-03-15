"""
Environment dispatcher.
Set DJANGO_ENV=production in your production environment.
Defaults to development.
"""
import os

_env = os.environ.get("DJANGO_ENV", "development").lower()

if _env == "production":
    from assetstream.settings_prod import *  # noqa: F401, F403
else:
    from assetstream.settings_dev import *  # noqa: F401, F403
