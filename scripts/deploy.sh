#!/usr/bin/env bash
# Update aplikasi di VPS: ambil kode terbaru, install, migrasi DB, build, restart.
# Dipanggil otomatis oleh GitHub Actions, atau manual: bash scripts/deploy.sh
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BRANCH="${BRANCH:-main}"
cd "$APP_DIR"

echo "==> Ambil kode terbaru ($BRANCH)"
git fetch origin "$BRANCH"
git reset --hard "origin/$BRANCH"

echo "==> Install dependency"
npm ci --no-audit --no-fund

echo "==> Migrasi database"
npx prisma migrate deploy

echo "==> Build"
npm run build

echo "==> Restart aplikasi"
if pm2 describe crm > /dev/null 2>&1; then
  pm2 reload crm --update-env
else
  pm2 start ecosystem.config.cjs
fi
pm2 save

echo "==> Selesai"
