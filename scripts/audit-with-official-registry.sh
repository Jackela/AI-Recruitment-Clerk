#!/usr/bin/env bash
# Run npm audit using official npm registry
# This works around the Chinese npm mirror not supporting the audit endpoint

set -e

# Save current registry
ORIGINAL_REGISTRY=$(npm config get registry)

# Switch to official npm registry for audit
npm config set registry https://registry.npmjs.org/

# Run audit directly (not via nx to avoid infinite loop)
npm audit --omit=dev || AUDIT_EXIT_CODE=$?

# Restore original registry
npm config set registry "$ORIGINAL_REGISTRY"

# Exit with audit exit code if it failed
if [ -n "${AUDIT_EXIT_CODE+x}" ]; then
  exit "$AUDIT_EXIT_CODE"
fi
