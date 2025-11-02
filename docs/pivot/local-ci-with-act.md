# Run GitHub Workflows Locally with `act`

## Install
- macOS/Linux: `brew install act` or `curl -s https://raw.githubusercontent.com/nektos/act/master/install.sh | bash`
- Windows: `scoop install act` or download from releases

## Runner image mapping
- We provide `.actrc` with a default mapping:
  - `-P ubuntu-latest=ghcr.io/catthehacker/ubuntu:act-latest`

## Secrets & env
- Create a local secrets file (not checked in): `.act.secrets`
  - Example contents:
    - `OPS_API_KEY=local-dev-key`
    - `SCORING_ENGINE_URL=http://localhost:3000`
    - `SCORING_ENGINE_URL_ALT=http://localhost:3001`
- Pass via `--secret-file .act.secrets` or set environment variables in your shell.

## Common commands
- Base CI: `npm run act:ci`
- Affected CI: `npm run act:ci-affected`
- Pre-release CD (cloud parity): `npm run act:cd:pre` (requires latest act; otherwise use local variant below)
- Production CD (cloud parity): `npm run act:cd:prod` (requires latest act; otherwise use local variant below)
- Local CD variant (act-friendly): `npm run act:cd:local`
- Nightly E2E (on-demand): `npm run act:e2e-nightly`
- Migration rehearsal: `npm run act:migration-rehearsal`

These scripts run the workflows with appropriate event payloads from `.github/workflows/events/*.json`.

## Tips
- Use `-j <job>` to run a specific job, e.g., `act -W .github/workflows/ci.yml -j test_coverage`
- Add `-v` for verbose logs.
- Actions that rely on cloud services may need mocks or local alternatives.

## Upgrading `act` and replacing the executable in PATH

To keep local runs aligned with GitHub Actions schema and features, use the latest `act`:

- Windows (winget): `winget upgrade --id nektos.act --accept-source-agreements --accept-package-agreements`
- macOS (brew): `brew upgrade act`
- Manual (all platforms):
  1. Download the latest release from https://github.com/nektos/act/releases
  2. Extract the binary and replace the existing `act` in your PATH
     - Windows (typical winget path): `%LOCALAPPDATA%\Microsoft\WinGet\Packages\nektos.act_Microsoft.Winget.Source_8wekyb3d8bbwe\act.exe`
     - macOS/Linux (e.g., `/usr/local/bin/act` or `${HOME}/bin/act`)

We also provide a helper script template at `tools/act/upgrade-act.ps1` that downloads a specified version and prints next-step instructions. Review before use.
