#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
git -C "$REPO_ROOT" config core.hooksPath .githooks
echo "Installed git hooks: $REPO_ROOT/.githooks"
