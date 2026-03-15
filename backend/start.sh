#!/usr/bin/env bash

echo "==> Running migrations..."
python manage.py migrate --noinput 2>&1 || { echo "MIGRATE FAILED"; exit 1; }

echo "==> Collecting static files..."
python manage.py collectstatic --noinput 2>&1 || { echo "COLLECTSTATIC FAILED"; exit 1; }

echo "==> Seeding demo data in background..."
(python manage.py seed_demo_data 2>&1 || echo "Seed skipped or already complete.") &

echo "==> Starting Gunicorn..."
exec gunicorn assetstream.wsgi:application \
  --bind 0.0.0.0:8000 \
  --workers 4 \
  --timeout 120 \
  --log-level info
