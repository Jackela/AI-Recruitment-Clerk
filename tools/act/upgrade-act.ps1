param(
  [string]$Version = 'v0.2.82',
  [string]$InstallPath = "$env:USERPROFILE\bin"
)
$ErrorActionPreference = 'Stop'

$asset = "https://github.com/nektos/act/releases/download/$Version/act_Windows_x86_64.zip"
$zip = Join-Path $env:TEMP "act_$Version.zip"
$exe = Join-Path $InstallPath 'act.exe'

Write-Host "Downloading act $Version from $asset" -ForegroundColor Cyan
Invoke-WebRequest -Uri $asset -OutFile $zip

Write-Host "Extracting to $InstallPath" -ForegroundColor Cyan
if (!(Test-Path $InstallPath)) { New-Item -ItemType Directory -Path $InstallPath | Out-Null }
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::ExtractToDirectory($zip, $InstallPath, $true)

Write-Host "act installed at $exe" -ForegroundColor Green
Write-Host "Ensure $InstallPath is in your PATH. Current PATH includes:"
$env:PATH -split ';' | ForEach-Object { Write-Host " - $_" }