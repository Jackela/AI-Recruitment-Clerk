$ErrorActionPreference = 'Stop'

# Run the definitive Playwright UAT against live servers
# Usage: pwsh -NoProfile -File scripts/run-uat.ps1

$env:E2E_USE_REAL_API   = 'true'
$env:E2E_SKIP_WEBSERVER = 'true'
$env:PLAYWRIGHT_BASE_URL = 'http://localhost:4202'

npx --yes playwright test -c apps/ai-recruitment-frontend-e2e/playwright.config.ts apps/ai-recruitment-frontend-e2e/src/pdf-real-file-uat.spec.ts --reporter=list

if ($LASTEXITCODE -eq 0) {
  Write-Host 'UAT_RESULT=PASS'
} else {
  Write-Host 'UAT_RESULT=FAIL'
}

Write-Host "[TASK_DONE]"; Write-Host ''; Write-Host ''


