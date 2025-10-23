param(
  [Parameter(Mandatory=$false)][string]$FeatureDir = "specs/001-functional-acceptance",
  [Parameter(Mandatory=$false)][string]$RunId,
  [Parameter(Mandatory=$false)][string]$RunFile
)

$ErrorActionPreference = 'Stop'

function Resolve-FeatureDir([string]$dir) {
  try { return (Resolve-Path -LiteralPath $dir).Path } catch { throw "Feature directory not found: $dir" }
}

function Load-RunJson {
  param([string]$feature, [string]$runId, [string]$runFile)
  $runsDir = Join-Path $feature 'runs'
  if ([string]::IsNullOrWhiteSpace($runFile)) {
    if ([string]::IsNullOrWhiteSpace($runId)) { throw "Provide -RunId or -RunFile" }
    $runFile = Join-Path $runsDir ("$runId.json")
  }
  $resolved = (Resolve-Path -LiteralPath $runFile).Path
  $json = Get-Content -LiteralPath $resolved -Raw | ConvertFrom-Json
  if (-not $json.id -and $runId) { $json | Add-Member -NotePropertyName id -NotePropertyValue $runId }
  return @{ File=$resolved; Data=$json }
}

function Get-ChecklistSummary {
  param([string]$feature)
  $checkDir = Join-Path $feature 'checklists'
  $acc = Join-Path $checkDir 'acceptance.md'
  $p1 = Join-Path $checkDir 'p1-journeys.md'
  $p2 = Join-Path $checkDir 'p2-features.md'
  $req = Join-Path $checkDir 'requirements.md'
  function Cnt([string]$p){
    if (-not (Test-Path -LiteralPath $p)) { return @{T=0;C=0;I=0} }
    $lines = Get-Content -LiteralPath $p
    $t = ($lines | Select-String -Pattern '^\s*\- \[( |x|X)\]' -AllMatches).Count
    $c = ($lines | Select-String -Pattern '^\s*\- \[(x|X)\]' -AllMatches).Count
    $i = ($lines | Select-String -Pattern '^\s*\- \[ \]' -AllMatches).Count
    return @{T=$t;C=$c;I=$i}
  }
  return [pscustomobject]@{
    Acceptance = (Cnt $acc); P1 = (Cnt $p1); P2 = (Cnt $p2); Requirements = (Cnt $req)
  }
}

function Get-CatalogCoverage {
  param([string]$feature)
  $catalog = Join-Path $feature 'acceptance-catalog.md'
  $p1 = Join-Path $feature 'checklists/p1-journeys.md'
  $p2 = Join-Path $feature 'checklists/p2-features.md'
  $ids = @()
  if (Test-Path -LiteralPath $catalog) {
    $matches = Select-String -LiteralPath $catalog -Pattern 'CASE-(?:P1J|P2F)-\d{3}' -AllMatches
    foreach ($m in $matches) { foreach ($g in $m.Matches) { $ids += $g.Value } }
    $ids = $ids | Sort-Object -Unique
  }
  $p1Total = ($ids | Where-Object { $_ -like 'CASE-P1J-*' }).Count
  $p2Total = ($ids | Where-Object { $_ -like 'CASE-P2F-*' }).Count
  $p1Hits = 0; $p2Hits = 0
  if (Test-Path -LiteralPath $p1) { foreach($id in ($ids | Where-Object { $_ -like 'CASE-P1J-*' })) { if (Select-String -LiteralPath $p1 -Pattern $id -SimpleMatch -Quiet) { $p1Hits++ } } }
  if (Test-Path -LiteralPath $p2) { foreach($id in ($ids | Where-Object { $_ -like 'CASE-P2F-*' })) { if (Select-String -LiteralPath $p2 -Pattern $id -SimpleMatch -Quiet) { $p2Hits++ } } }
  return [pscustomobject]@{ IDs=$ids; P1Hits=$p1Hits; P1Total=$p1Total; P2Hits=$p2Hits; P2Total=$p2Total }
}

$feature = Resolve-FeatureDir $FeatureDir
$run = Load-RunJson -feature $feature -runId $RunId -runFile $RunFile
$summary = Get-ChecklistSummary -feature $feature
$coverage = Get-CatalogCoverage -feature $feature

$reportsDir = Join-Path $feature 'reports'
New-Item -ItemType Directory -Path $reportsDir -Force | Out-Null
$outfile = Join-Path $reportsDir ("signoff-{0}.md" -f $run.Data.id)

function StatusLabel($m){ if ($m.I -eq 0 -and $m.T -gt 0) { 'PASS' } elseif ($m.T -eq 0) { 'N/A' } else { 'FAIL' } }

$lines = @()
$lines += "# Joint Sign-off Report — $($run.Data.id)"
$lines += ""
$lines += "Feature: $feature"
$lines += "Run ID: $($run.Data.id)"
$lines += ("Date (UTC): {0}" -f ($run.Data.date ?? (Get-Date).ToString('s')+'Z'))
$lines += ("Environment: {0}" -f ($run.Data.environment ?? 'pre-release'))
$lines += ("Executor: {0}" -f ($run.Data.executor ?? '<TBD>'))
$lines += ("Dataset: {0}" -f ($run.Data.dataset ?? '<TBD>'))
$lines += ""
$lines += "## Checklists Summary"
$lines += ""
$lines += "| Checklist | Total | Completed | Incomplete | Status |"
$lines += "|-----------|-------|-----------|------------|--------|"
$lines += ("| acceptance.md | {0} | {1} | {2} | {3} |" -f $summary.Acceptance.T,$summary.Acceptance.C,$summary.Acceptance.I,(StatusLabel $summary.Acceptance))
$lines += ("| p1-journeys.md | {0} | {1} | {2} | {3} |" -f $summary.P1.T,$summary.P1.C,$summary.P1.I,(StatusLabel $summary.P1))
$lines += ("| p2-features.md | {0} | {1} | {2} | {3} |" -f $summary.P2.T,$summary.P2.C,$summary.P2.I,(StatusLabel $summary.P2))
$lines += ("| requirements.md | {0} | {1} | {2} | {3} |" -f $summary.Requirements.T,$summary.Requirements.C,$summary.Requirements.I,(StatusLabel $summary.Requirements))
$lines += ""
$lines += "## Catalog ↔ Checklist Coverage"
$lines += ""
$lines += ("- Catalog IDs detected: {0}" -f $coverage.IDs.Count)
$lines += ("- P1 journeys present in checklist: {0}/{1}" -f $coverage.P1Hits,$coverage.P1Total)
$lines += ("- P2 features present in checklist: {0}/{1}" -f $coverage.P2Hits,$coverage.P2Total)
$lines += ""
$lines += "## Reported Case Results (from run file)"

$caseCounts = @{ Pass=0; Fail=0; Blocked=0 }
if ($run.Data.cases) {
  foreach ($c in ($run.Data.cases | Sort-Object caseId)) {
    $lines += ("- {0} → {1}" -f $c.caseId, ($c.result ?? '<result>'))
    if ($c.evidence) { foreach ($e in $c.evidence) { $lines += ("  - Evidence: {0}" -f $e) } }
    if ($c.result -and $caseCounts.ContainsKey($c.result)) { $caseCounts[$c.result]++ }
  }
} else {
  $lines += "- No cases recorded in run file."
}

$lines += ""
$lines += "## Sign-off Gates"
$lines += ""
$lines += "- SC-001 (P1 Journeys): 100% of P1 journeys must be accepted."
$lines += "- SC-002 (P2 Features): ≥95% of P2 features accepted; failures documented with defects linked."
$lines += "- SC-003 (Usability Time): Time-to-completion captured per case with timestamps."
$lines += "- SC-004 (Reopen Rate): Reopen rate method documented in reports and metrics section."
$lines += ""
$lines += "Evidence conventions: specs/001-functional-acceptance/evidence-guidelines.md"
$lines += "Defect process: specs/001-functional-acceptance/defect-process.md"
$lines += "Result states: specs/001-functional-acceptance/result-states.md"
$lines += ""
$lines += "## Decision"
$lines += ""
$lines += "- Product Owner: [ ] Approve  [ ] Reject  [ ] Blocked"
$lines += "- QA Lead:       [ ] Approve  [ ] Reject  [ ] Blocked"
$lines += ""
$lines += "If rejected/blocked, list blocking issues and linked defects:"
$lines += "- "
$lines += ""
$lines += "## Signatures"
$lines += ""
$lines += "- Product Owner: ____________________  Date: __________"
$lines += "- QA Lead:       ____________________  Date: __________"

$lines -join "`n" | Set-Content -LiteralPath $outfile -Encoding UTF8

Write-Host "Generated: $outfile"

