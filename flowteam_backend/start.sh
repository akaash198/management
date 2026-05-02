#!/bin/bash
set -euo pipefail

USE_SQLITE="${USE_SQLITE:-}"
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"

if [[ "${USE_SQLITE}" != "True" && "${USE_SQLITE}" != "true" ]]; then
  echo "Waiting for postgres at ${DB_HOST}:${DB_PORT}..."
  while ! nc -z "${DB_HOST}" "${DB_PORT}"; do
    sleep 1
  done
  echo "PostgreSQL started"
fi

if [[ "${RUN_MIGRATIONS:-1}" == "1" ]]; then
  python manage.py migrate --noinput
fi

# Seeding is optional; default off to avoid repeated writes on every container start.
if [[ "${RUN_SEED_MESSAGING:-0}" == "1" ]]; then
  python manage.py seed_messaging || true
fi

PORT="${PORT:-8000}"
USE_UVICORN="${USE_UVICORN:-0}"
UVICORN_WORKERS="${UVICORN_WORKERS:-2}"
UVICORN_KEEPALIVE="${UVICORN_KEEPALIVE:-75}"

if [[ "${USE_UVICORN}" == "1" ]]; then
  echo "Starting ASGI server via uvicorn on 0.0.0.0:${PORT} (workers=${UVICORN_WORKERS})"
  uvicorn config.asgi:application --host 0.0.0.0 --port "${PORT}" --workers "${UVICORN_WORKERS}" --proxy-headers --timeout-keep-alive "${UVICORN_KEEPALIVE}"
else
  echo "Starting ASGI server via daphne on 0.0.0.0:${PORT}"
  daphne -b 0.0.0.0 -p "${PORT}" config.asgi:application
fi
