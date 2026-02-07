#!/bin/sh
set -e

echo "==> Running Prisma database migrations..."
./node_modules/.bin/prisma migrate deploy --config prisma.config.ts

echo "==> Migrations complete. Starting application..."
exec node .output/server/index.mjs
