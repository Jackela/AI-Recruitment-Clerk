#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

: "${DEV_SERVER_PORT:=4202}"
: "${PLAYWRIGHT_BASE_URL:=http://localhost:${DEV_SERVER_PORT}}"
: "${E2E_PROTECTED_PORTS:=3000,4200,4202}"
: "${E2E_USE_REAL_API:=false}"
: "${CI_MANAGED_WEB_SERVER:=true}"
: "${PLAYWRIGHT_CONFIG:=apps/ai-recruitment-frontend-e2e/playwright.config.ts}"

server_pid=""
created_assets=()

cleanup() {
  if [[ -n "$server_pid" ]]; then
    kill "$server_pid" >/dev/null 2>&1 || true
    wait "$server_pid" >/dev/null 2>&1 || true
  fi
  if [[ ${#created_assets[@]} -gt 0 ]]; then
    for asset in "${created_assets[@]}"; do
      rm -f "$asset"
    done
  fi
}

wait_for_server() {
  local retries=120
  for ((i = 1; i <= retries; i++)); do
    if curl -fs "http://127.0.0.1:${DEV_SERVER_PORT}" >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done
  echo "[ci:e2e] Web server did not become ready on port ${DEV_SERVER_PORT} within timeout" >&2
  return 1
}

trap cleanup EXIT

rm -rf "$REPO_ROOT/.nx/workspace-data" 2>/dev/null || true
mkdir -p "$REPO_ROOT/.nx/workspace-data/d"

TEST_ASSET_DIR="$REPO_ROOT/apps/ai-recruitment-frontend-e2e/src/test-data/resumes"
if [[ -d "$TEST_ASSET_DIR" ]]; then
  for asset in "$TEST_ASSET_DIR"/*.pdf; do
    target="$REPO_ROOT/$(basename "$asset")"
    if [[ ! -f "$target" ]]; then
      cp "$asset" "$target"
      created_assets+=("$target")
    fi
  done
fi

export DEV_SERVER_PORT
export PLAYWRIGHT_BASE_URL

if [[ "$CI_MANAGED_WEB_SERVER" == "true" ]]; then
  export E2E_SKIP_WEBSERVER=true
  npx nx run ai-recruitment-frontend:serve:test --port "$DEV_SERVER_PORT" --host 0.0.0.0 &
  server_pid=$!
  wait_for_server
else
  export E2E_SKIP_WEBSERVER="${E2E_SKIP_WEBSERVER:-false}"
fi

PLAYWRIGHT_EXTRA_ARGS=()
if [[ -n "${PLAYWRIGHT_CLI_ARGS:-}" ]]; then
  # shellcheck disable=SC2206
  PLAYWRIGHT_EXTRA_ARGS=($PLAYWRIGHT_CLI_ARGS)
fi

npx playwright test --config "$PLAYWRIGHT_CONFIG" "${PLAYWRIGHT_EXTRA_ARGS[@]}" "$@"
