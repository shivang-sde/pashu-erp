#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

usage() {
  cat <<EOF
Usage: $(basename "$0") <command>
Commands:
  build     Build backend and frontend containers
  start     Start services in detached mode
  stop      Stop all running services
  restart   Restart services cleanly
  cleanup   Remove containers, networks, and unused images
  status    Show current docker compose status
EOF
  exit 1
}

case "${1:-}" in
  build)
    docker compose build --pull --no-cache
    ;;
  start)
    docker compose up -d --remove-orphans
    ;;
  stop)
    docker compose down
    ;;
  restart)
    docker compose down
    docker compose up -d --remove-orphans
    ;;
  cleanup)
    docker compose down --volumes --remove-orphans
    docker image prune -f
    docker system prune -f --volumes
    ;;
  status)
    docker compose ps
    ;;
  *)
    usage
    ;;
esac
