#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

PHASE_NAME="orchestrator"
source "$SCRIPT_DIR/bootstrap-env.sh"

if [[ $# -gt 0 ]]; then
  PHASES=("$@")
else
  PHASES=(lint typecheck build coverage e2e pii governance)
fi

ci_log "Running phases: ${PHASES[*]}"

for phase in "${PHASES[@]}"; do
  PHASE_NAME="$phase"
  ci_log "=== $phase start ==="
  "$SCRIPT_DIR/run-phase.sh" "$phase"
  ci_log "=== $phase complete ==="
done
