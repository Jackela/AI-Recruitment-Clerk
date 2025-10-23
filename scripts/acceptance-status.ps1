param(
  [string]$FeatureDir = "specs/001-functional-acceptance",
  [string]$OutName = ""
)

function Get-ChecklistStatus {
  param([string]$ChecklistPath)
  if (-not (Test-Path -LiteralPath $ChecklistPath)) {
    return @{ Total = 0; Completed = 0; Incomplete = 0 }
  }
  $lines = Get-Content -LiteralPath $ChecklistPath -ErrorAction SilentlyContinue
  $total = ($lines | Select-String -Pattern '^\s*\- \[( |x|X)\]' -AllMatches).Count
  $completed = ($lines | Select-String -Pattern '^\s*\- \[(x|X)\]' -AllMatches).Count
  $incomplete = ($lines | Select-String -Pattern '^\s*\- \[ \]' -AllMatches).Count
  return @{ Total = $total; Completed = $completed; Incomplete = $incomplete }
}

try {
  $feature = (Resolve-Path -LiteralPath $FeatureDir).Path
} catch {
  Write-Error "Feature directory not found: $FeatureDir"
  exit 1
}

$checkDir = Join-Path $feature 'checklists'
$catalog = Join-Path $feature 'acceptance-catalog.md'
$p1 = Join-Path $checkDir 'p1-journeys.md'
$p2 = Join-Path $checkDir 'p2-features.md'
$acc = Join-Path $checkDir 'acceptance.md'
$req = Join-Path $checkDir 'requirements.md'

$accS = Get-ChecklistStatus -ChecklistPath $acc
$p1S = Get-ChecklistStatus -ChecklistPath $p1
$p2S = Get-ChecklistStatus -ChecklistPath $p2
$reqS = Get-ChecklistStatus -ChecklistPath $req

# Catalog ↔ checklist coverage
$ids = @()
if (Test-Path -LiteralPath $catalog) {
  $matches = Select-String -LiteralPath $catalog -Pattern 'CASE-(?:P1J|P2F)-\d{3}' -AllMatches
  foreach ($m in $matches) { foreach ($g in $m.Matches) { $ids += $g.Value } }
  $ids = $ids | Sort-Object -Unique
}
$presentP1 = @{}
$presentP2 = @{}
foreach ($id in $ids) {
  $presentP1[$id] = if (Test-Path -LiteralPath $p1) { [bool](Select-String -LiteralPath $p1 -Pattern $id -SimpleMatch -Quiet) } else { $false }
  $presentP2[$id] = if (Test-Path -LiteralPath $p2) { [bool](Select-String -LiteralPath $p2 -Pattern $id -SimpleMatch -Quiet) } else { $false }
}

$p1Hits = ($presentP1.GetEnumerator() | Where-Object { $_.Value -and $_.Key -like 'CASE-P1J-*' }).Count
$p2Hits = ($presentP2.GetEnumerator() | Where-Object { $_.Value -and $_.Key -like 'CASE-P2F-*' }).Count
$p1Total = ($ids | Where-Object { $_ -like 'CASE-P1J-*' }).Count
$p2Total = ($ids | Where-Object { $_ -like 'CASE-P2F-*' }).Count

$dateTag = Get-Date -Format 'yyyyMMdd'
if ([string]::IsNullOrWhiteSpace($OutName)) { $OutName = "acceptance-status-$dateTag.md" }
$reportsDir = Join-Path $feature 'reports'
New-Item -ItemType Directory -Path $reportsDir -Force | Out-Null
$outFile = Join-Path $reportsDir $OutName

$content = @()
$content += "# Acceptance Status Summary — $(Get-Date -Format 'yyyy-MM-dd')"
$content += ""
$content += "Feature: $(Resolve-Path $feature)"
$content += ""
$content += "## Checklists"
$content += ""
$content += "| Checklist | Total | Completed | Incomplete | Status |"
$content += "|-----------|-------|-----------|------------|--------|"
$content += ("| acceptance.md | {0} | {1} | {2} | {3} |" -f $accS.Total,$accS.Completed,$accS.Incomplete,($(if($accS.Incomplete -eq 0 -and $accS.Total -gt 0){'PASS'} elseif($accS.Total -eq 0){'N/A'} else {'FAIL'})))
$content += ("| p1-journeys.md | {0} | {1} | {2} | {3} |" -f $p1S.Total,$p1S.Completed,$p1S.Incomplete,($(if($p1S.Incomplete -eq 0 -and $p1S.Total -gt 0){'PASS'} elseif($p1S.Total -eq 0){'N/A'} else {'FAIL'})))
$content += ("| p2-features.md | {0} | {1} | {2} | {3} |" -f $p2S.Total,$p2S.Completed,$p2S.Incomplete,($(if($p2S.Incomplete -eq 0 -and $p2S.Total -gt 0){'PASS'} elseif($p2S.Total -eq 0){'N/A'} else {'FAIL'})))
$content += ("| requirements.md | {0} | {1} | {2} | {3} |" -f $reqS.Total,$reqS.Completed,$reqS.Incomplete,($(if($reqS.Incomplete -eq 0 -and $reqS.Total -gt 0){'PASS'} elseif($reqS.Total -eq 0){'N/A'} else {'FAIL'})))
$content += ""
$content += "## Catalog ↔ Checklist Coverage"
$content += ""
$content += ("- Catalog Case IDs detected: {0}" -f $ids.Count)
$content += ("- P1 Journey IDs present in p1-journeys.md: {0}/{1}" -f $p1Hits,$p1Total)
$content += ("- P2 Feature IDs present in p2-features.md: {0}/{1}" -f $p2Hits,$p2Total)

$content -join "`n" | Set-Content -LiteralPath $outFile -Encoding UTF8

Write-Host "Wrote status to: $outFile"
Write-Host ("Catalog IDs: {0} | P1: {1}/{2} | P2: {3}/{4}" -f $ids.Count,$p1Hits,$p1Total,$p2Hits,$p2Total)

