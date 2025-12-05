# Design: Align CI And Local Parity

## Overview
Create a trio of bash helpers that every environment invokes:
1. `bootstrap-env.sh` – centralizes exports, version checks, and shared logging helpers.
2. `run-phase.sh` – dispatches to an existing npm script per CI gate and adds any pre/post hooks.
3. `run-all.sh` – sequences phases serially for local use while exposing per-phase wrappers for GitHub Actions.

## Key Decisions
- **Bash-first implementation**: Keeps dependencies minimal and runnable inside GitHub-hosted runners, dev shells, and Docker images. Node-based wrappers were rejected to avoid extra bootstrap cost.
- **Phase dispatch table**: `run-phase.sh` will use a `case` statement to keep the logic explicit (KISS) and under version control.
- **Shared env**: Scripts will source `.nvmrc` (warning if mismatch), export `CI=true`, `NX_DAEMON=false`, `NX_SKIP_NX_CACHE=true`, and allow workflow-provided overrides.
- **Playwright + governance hooks**: Phase runner injects `npx playwright install` before the e2e phase and ensures governance artifacts are written to `specs/001-audit-architecture/validation/` so CI comparisons remain valid.

## Considered Alternatives
- **Single Node CLI**: Would allow richer UX, but adds build/setup complexity and does not run natively inside minimal CI shells without transpilation.
- **Act-only workflow**: Relying solely on `act` to mirror CI is heavier (docker privileged access) and fails the "simple script" goal.

## Impact & Risks
- GitHub Actions logs change but job boundaries remain identical; monitoring dashboards must tolerate new output.
- Developers must rebase to pick up new npm scripts; communication via README + changelog mitigates friction.
- Any new CI gate must go through `run-phase.sh`; this is intentional to prevent drift but requires discipline.

