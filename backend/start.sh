#!/usr/bin/env bash

echo "==> Python version: $(python --version 2>&1)"
echo "==> Django check..."
python -c "
import os, sys
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'assetstream.settings')
import django
django.setup()
print('Django OK — settings module:', os.environ.get('DJANGO_SETTINGS_MODULE'))
" 2>&1 || { echo "DJANGO SETUP FAILED"; exit 1; }

echo "==> Running migrations..."
python manage.py migrate --noinput 2>&1 || { echo "MIGRATE FAILED"; exit 1; }

echo "==> Collecting static files..."
python manage.py collectstatic --noinput 2>&1 || { echo "COLLECTSTATIC FAILED"; exit 1; }

echo "==> Seeding demo data..."
python manage.py seed_demo_data 2>&1 || echo "Seed skipped or already complete."

echo "==> Starting Gunicorn..."
exec gunicorn assetstream.wsgi:application \
  --bind 0.0.0.0:8000 \
  --workers 4 \
  --timeout 120 \
  --log-level info
