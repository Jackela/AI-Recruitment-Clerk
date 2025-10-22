#\!/usr/bin/env bash
# Self-cleaning runner for Claude Code operations
# Kills entire child process tree when parent exits

set -euo pipefail

# Kill the entire child process tree on exit
trap 'pkill -P $$ 2>/dev/null || kill 0 2>/dev/null || true' EXIT

export CI=1
export UV_THREADPOOL_SIZE=${UV_THREADPOOL_SIZE:-8}
export CI_NO_COLOR=1
export npm_config_loglevel=error

"$@"
