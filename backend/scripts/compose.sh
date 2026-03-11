#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd -- "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$ROOT"

COMPOSE_FILE="docker-compose.backend.yaml"

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
    docker compose -f "$COMPOSE_FILE" up -d
    ;;
  build)
    docker compose -f "$COMPOSE_FILE" build server
    ;;
  rebuild)
    docker compose -f "$COMPOSE_FILE" build server && docker compose -f "$COMPOSE_FILE" up -d server
    ;;
  restart)
    docker compose -f "$COMPOSE_FILE" restart server
    ;;
  down)
    docker compose -f "$COMPOSE_FILE" down
    ;;
  ps)
    docker compose -f "$COMPOSE_FILE" ps
    ;;
  logs)
    docker compose -f "$COMPOSE_FILE" logs -f server
    ;;
  migrate)
    docker compose -f "$COMPOSE_FILE" exec server alembic upgrade head
    ;;
  revision)
    msg=${1:-"auto"}
    docker compose -f "$COMPOSE_FILE" exec server alembic revision --autogenerate -m "$msg"
    ;;
  help|*)
    usage
    ;;
esac
