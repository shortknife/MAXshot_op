#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${PROJECT_ROOT}/.env.local"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing env file: ${ENV_FILE}" >&2
  exit 1
fi

if [[ $# -eq 0 ]]; then
  echo "Usage: ./scripts/run-with-local-env.sh <command> [args...]" >&2
  exit 1
fi

set -a
source "${ENV_FILE}"
set +a

exec "$@"
