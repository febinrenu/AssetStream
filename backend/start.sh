#!/usr/bin/env bash
set -e

echo "==> Running migrations..."
python manage.py migrate --noinput

echo "==> Collecting static files..."
python manage.py collectstatic --noinput

echo "==> Seeding demo data (skips if already exists)..."
python manage.py seed_demo_data || echo "Seed skipped or already complete."

echo "==> Starting Gunicorn..."
exec gunicorn assetstream.wsgi:application \
  --bind 0.0.0.0:8000 \
  --workers 4 \
  --timeout 120 \
  --log-level info
