#!/bin/sh
set -e

echo "[Docker Entrypoint] Verifying database configuration..."

if [ -z "$DATABASE_URL" ]; then
  echo "[Docker Entrypoint] FATAL: DATABASE_URL environment variable is missing."
  exit 1
fi

echo "[Docker Entrypoint] Executing Prisma database migrations (fail-fast)..."
./node_modules/.bin/prisma migrate deploy || npx prisma migrate deploy

echo "[Docker Entrypoint] Database migrations successfully applied."
echo "[Docker Entrypoint] Starting QuickCompare production server..."
exec "$@"
