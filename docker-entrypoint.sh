#!/bin/sh
set -e

echo "[Docker Entrypoint] Verifying database configuration..."

if [ -z "$DATABASE_URL" ]; then
  echo "[Docker Entrypoint] FATAL: DATABASE_URL environment variable is missing."
  exit 1
fi

echo "[Docker Entrypoint] Executing Prisma database migrations (fail-fast)..."
if ! ./node_modules/.bin/prisma migrate deploy; then
  echo "[Docker Entrypoint] Migration failed or dirty state detected. Resolving 20260726163000_add_search_match_alerts_schema..."
  ./node_modules/.bin/prisma migrate resolve --rolled-back "20260726163000_add_search_match_alerts_schema" || true
  ./node_modules/.bin/prisma migrate deploy
fi

echo "[Docker Entrypoint] Database migrations successfully applied."
echo "[Docker Entrypoint] Starting QuickCompare production server..."
exec "$@"
