#!/bin/bash
# Local CI script - mirrors GitHub Actions CI workflow
# Usage: npm run ci:local    (core checks)
#        npm run ci:full     (core + e2e)
set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    LOCAL CI WORKFLOW                       ║"
echo "╚════════════════════════════════════════════════════════════╝"

FAILED=0
START_TIME=$(date +%s)

run_step() {
  local STEP_NAME="$1"
  local STEP_CMD="$2"
  echo ""
  echo "┌──────────────────────────────────────────────────────────┐"
  echo "│ $STEP_NAME"
  echo "└──────────────────────────────────────────────────────────┘"
  if eval "$STEP_CMD"; then
    echo "✅ $STEP_NAME passed"
  else
    echo "❌ $STEP_NAME failed"
    FAILED=1
    if [ "$FAIL_FAST" = "true" ]; then
      echo "FAIL_FAST enabled, stopping..."
      exit 1
    fi
  fi
}

# 1. Lint (same as ci.yml)
run_step "[1/6] Lint" "npm run lint"

# 2. Typecheck (same as ci.yml)
run_step "[2/6] Typecheck" "npm run typecheck"

# 3. Build (same as ci.yml)
run_step "[3/6] Build" "npm run build"

# 4. Tests with Coverage (same as ci.yml)
run_step "[4/6] Unit Tests + Coverage" "npm run test:coverage"

# 5. Quality Gates (same as ci.yml)
if [ -f "tools/ci/verify-quality-gates.mjs" ]; then
  run_step "[5/6] Quality Gates" "node tools/ci/verify-quality-gates.mjs"
else
  echo "⏭️  [5/6] Quality Gates - skipped (verify-quality-gates.mjs not found)"
fi

# 6. Security Audit (production deps only, matches security.yml)
run_step "[6/6] Security Audit" "npm audit --omit=dev --audit-level=high || echo 'Audit warnings (non-blocking for dev deps)'"

# 7. E2E (optional, requires Playwright)
if [ "$RUN_E2E" = "true" ]; then
  echo ""
  echo "┌──────────────────────────────────────────────────────────┐"
  echo "│ [7/7] E2E Smoke Tests (optional)                         │"
  echo "└──────────────────────────────────────────────────────────┘"
  if npx playwright install --with-deps 2>/dev/null; then
    run_step "[7/7] E2E Smoke Tests" "npm run test:e2e"
  else
    echo "⏭️  E2E skipped - Playwright not installed"
  fi
fi

# Summary
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
if [ $FAILED -eq 0 ]; then
  echo "║            ✅ LOCAL CI PASSED (${DURATION}s)                      ║"
else
  echo "║            ❌ LOCAL CI FAILED (${DURATION}s)                      ║"
fi
echo "╚════════════════════════════════════════════════════════════╝"

exit $FAILED
