#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd -- "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$ROOT"

usage() {
  cat <<'EOF'
Usage: scripts/compose.sh <command> [args]

Commands:
  up               Start all services in background
  build            Build backend image
  rebuild          Rebuild backend image and restart server
  restart          Restart server container
  down             Stop and remove containers (keeps volumes)
  ps               Show container status
  logs             Tail server logs
  migrate          Run alembic upgrade head
  revision <msg>   Create alembic revision with message
  help             Show this help
EOF
}

cmd=${1:-help}
shift || true

case "$cmd" in
  up)
    docker compose up -d
    ;;
  build)
    docker compose build server
    ;;
  rebuild)
    docker compose build server && docker compose up -d server
    ;;
  restart)
    docker compose restart server
    ;;
  down)
    docker compose down
    ;;
  ps)
    docker compose ps
    ;;
  logs)
    docker compose logs -f server
    ;;
  migrate)
    docker compose exec server alembic upgrade head
    ;;
  revision)
    msg=${1:-"auto"}
    docker compose exec server alembic revision --autogenerate -m "$msg"
    ;;
  help|*)
    usage
    ;;
esac
