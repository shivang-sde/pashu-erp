#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

usage() {
  cat <<EOF
Usage: $(basename "$0") <command> [service]
Commands:
  status    Show Docker Compose service status
  logs      Tail logs for backend/frontend or a specific service
  health    Display health check status for both services
  follow    Follow logs for backend/frontend or a specific service
EOF
  exit 1
}

cmd="${1:-status}"
service="${2:-}"

case "$cmd" in
  status)
    docker compose ps
    ;;
  logs)
    if [[ -n "$service" ]]; then
      docker compose logs --tail 100 "$service"
    else
      docker compose logs --tail 100 backend frontend
    fi
    ;;
  follow)
    if [[ -n "$service" ]]; then
      docker compose logs --tail 100 --follow "$service"
    else
      docker compose logs --tail 100 --follow backend frontend
    fi
    ;;
  health)
    echo "=== Docker Compose status ==="
    docker compose ps
    echo
    echo "=== Health check summary ==="
    docker compose ps --filter "health=unhealthy" || true
    docker compose ps --filter "health=starting" || true
    ;;
  *)
    usage
    ;;
esac
