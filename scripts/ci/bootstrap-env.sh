#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

: "${CI:=true}"
: "${NX_DAEMON:=false}"
: "${NX_SKIP_NX_CACHE:=true}"
: "${FORCE_COLOR:=0}"

export CI
export NX_DAEMON
export NX_SKIP_NX_CACHE
export FORCE_COLOR

if [[ -f "$REPO_ROOT/.nvmrc" ]]; then
  REQUIRED_NODE="$(tr -d ' \t\r\n' < "$REPO_ROOT/.nvmrc")"
  if command -v node >/dev/null 2>&1; then
    CURRENT_NODE="$(node -v | sed 's/^v//')"
    if [[ "$CURRENT_NODE" != "$REQUIRED_NODE" ]]; then
      echo "[ci-bootstrap] ⚠️  Node version $CURRENT_NODE detected, but .nvmrc requires $REQUIRED_NODE." >&2
    fi
  else
    echo "[ci-bootstrap] ⚠️  Node is not installed; install version $REQUIRED_NODE from .nvmrc." >&2
  fi
fi

export PATH="$REPO_ROOT/node_modules/.bin:$PATH"
export CI_REPO_ROOT="$REPO_ROOT"

ci_log() {
  local msg="$1"
  local phase="${PHASE_NAME:-bootstrap}"
  echo "[ci:${phase}] $msg"
}
