#!/usr/bin/env bash

echo "==> Running migrations..."
python manage.py migrate --noinput 2>&1 || { echo "MIGRATE FAILED"; exit 1; }

echo "==> Collecting static files..."
python manage.py collectstatic --noinput 2>&1 || { echo "COLLECTSTATIC FAILED"; exit 1; }

echo "==> Starting Gunicorn..."
exec gunicorn assetstream.wsgi:application \
  --bind 0.0.0.0:8000 \
  --workers ${WEB_CONCURRENCY:-2} \
  --timeout 300 \
  --log-level info
