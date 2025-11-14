#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <phase>" >&2
  echo "Available phases: lint, typecheck, build, test, coverage, e2e, pii, governance" >&2
  exit 1
fi

PHASE_NAME="$1"
shift || true

source "$SCRIPT_DIR/bootstrap-env.sh"

run_cmd() {
  ci_log "→ $*"
  "$@"
}

case "$PHASE_NAME" in
  lint)
    run_cmd npm run lint:ci
    ;;
  typecheck)
    run_cmd npm run typecheck
    ;;
  build)
    run_cmd npm run build
    ;;
  test)
    run_cmd npm run test:ci
    ;;
  integration)
    run_cmd npm run test:integration
    ;;
  coverage)
    ci_log "Running coverage suite"
    set +e
    npm run test:coverage
    status=$?
    set -e
    if [[ $status -ne 0 ]]; then
      ci_log "Primary coverage command failed (exit $status); attempting fallback"
      run_cmd npm run test -- --coverage
    fi
    ;;
  e2e)
    : "${DEV_SERVER_PORT:=4202}"
    : "${E2E_SKIP_WEBSERVER:=false}"
    : "${PLAYWRIGHT_BASE_URL:=http://localhost:${DEV_SERVER_PORT}}"
    : "${E2E_PROTECTED_PORTS:=3000,4200,4202}"
    : "${E2E_USE_REAL_API:=false}"
    if [[ "${CI_USE_PLAYWRIGHT_DOCKER:-true}" == "true" ]] && command -v docker >/dev/null 2>&1; then
      DOCKER_IMAGE="${PLAYWRIGHT_DOCKER_IMAGE:-mcr.microsoft.com/playwright:v1.56.1-jammy}"
      ci_log "Running Playwright via Docker image ${DOCKER_IMAGE}"
      run_cmd docker run --rm \
        -e CI="$CI" \
        -e NX_DAEMON="$NX_DAEMON" \
        -e NX_SKIP_NX_CACHE="$NX_SKIP_NX_CACHE" \
        -e FORCE_COLOR="$FORCE_COLOR" \
        -e DEV_SERVER_PORT="$DEV_SERVER_PORT" \
        -e PLAYWRIGHT_BASE_URL="$PLAYWRIGHT_BASE_URL" \
        -e E2E_SKIP_WEBSERVER="$E2E_SKIP_WEBSERVER" \
        -e E2E_PROTECTED_PORTS="$E2E_PROTECTED_PORTS" \
        -e E2E_USE_REAL_API="$E2E_USE_REAL_API" \
        -e PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
        -e PLAYWRIGHT_CLI_ARGS="${PLAYWRIGHT_CLI_ARGS:-}" \
        -e HOME=/tmp/playwright-home \
        -u "$(id -u):$(id -g)" \
        -v "$CI_REPO_ROOT":/work \
        -w /work \
        "$DOCKER_IMAGE" \
        bash -lc "scripts/ci/run-playwright.sh"
    else
      run_cmd npx playwright install
      run_cmd scripts/ci/run-playwright.sh
    fi
    ;;
  pii)
    run_cmd node tools/ci/pii-scan.mjs
    ;;
  governance)
    run_cmd npm run gov:inventory
    ci_log "Running governance validation"
    export GOVERNANCE_RUN_E2E=false
    export GOVERNANCE_RUN_INTEGRATION=false
    run_cmd npm run gov:validate
    ci_log "Ensuring local manifest exists"
    run_cmd test -f specs/001-audit-architecture/validation/latest-local.json
    PARITY_RUN_ID="${GITHUB_RUN_ID:-local}"
    WORKFLOW_URL="${GITHUB_SERVER_URL:-https://github.com}/${GITHUB_REPOSITORY:-local}/actions/runs/${PARITY_RUN_ID}"
    OUTPUT_FILE="specs/001-audit-architecture/validation/${PARITY_RUN_ID}-parity.json"
    run_cmd node tools/ci/governance/compare-ci-results.mjs \
      --local specs/001-audit-architecture/validation/latest-local.json \
      --remote-status success \
      --workflow-url "$WORKFLOW_URL" \
      --output "$OUTPUT_FILE"
    ;;
  *)
    echo "Unknown phase: $PHASE_NAME" >&2
    exit 1
    ;;
 esac

ci_log "Completed phase"
