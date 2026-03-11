#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────
# First-time SSL setup for maytokyo.com
# Run this ON YOUR SERVER after docker compose is running.
#
# Usage:
#   chmod +x scripts/init-ssl.sh
#   bash scripts/init-ssl.sh
# ──────────────────────────────────────────────────────────
set -euo pipefail

DOMAINS="-d maytokyo.com -d www.maytokyo.com -d app.maytokyo.com"
EMAIL="amir.amon23@gmail.com"
PROJECT_ROOT=$(cd -- "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)

echo "==> Step 1: Starting nginx with HTTP-only config for cert verification..."
# Swap in the HTTP-only config so nginx can start without certs
cp "$PROJECT_ROOT/nginx/default.conf" "$PROJECT_ROOT/nginx/default.conf.bak"
cp "$PROJECT_ROOT/nginx/http-only.conf" "$PROJECT_ROOT/nginx/default.conf"
docker compose up -d nginx

echo "==> Step 2: Requesting certificate from Let's Encrypt..."
docker compose run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  $DOMAINS \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email

echo "==> Step 3: Restoring full HTTPS nginx config..."
cp "$PROJECT_ROOT/nginx/default.conf.bak" "$PROJECT_ROOT/nginx/default.conf"
rm "$PROJECT_ROOT/nginx/default.conf.bak"

echo "==> Step 4: Reloading nginx with SSL..."
docker compose exec nginx nginx -s reload

echo ""
echo "==> Done! Your site is now live at:"
echo "    https://maytokyo.com"
echo "    https://www.maytokyo.com"
echo "    https://app.maytokyo.com"
echo ""
echo "To renew certificates later, run:"
echo "    docker compose run --rm certbot renew && docker compose exec nginx nginx -s reload"
