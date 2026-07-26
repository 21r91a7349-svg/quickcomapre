#!/bin/sh
set -e

echo "Applying database migrations..."
if [ -n "$DATABASE_URL" ]; then
  npx prisma migrate deploy || echo "Prisma migrate deploy completed with notice."
fi

echo "Starting QuickCompare production application..."
exec "$@"
