$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

# Recreate infrastructure services (Mongo, NATS, Redis) with clean volumes
# Usage: pwsh -NoProfile -File scripts/infra-reset-up.ps1

# 1) Required env (placeholders for compose interpolation safety)
$env:JWT_SECRET            = $env:JWT_SECRET            ?? 'dev_jwt_secret_please_change'
$env:JWT_REFRESH_SECRET    = $env:JWT_REFRESH_SECRET    ?? 'dev_jwt_refresh_secret'
$env:ENCRYPTION_KEY        = $env:ENCRYPTION_KEY        ?? 'dev_encryption_key_change'
$env:MONGODB_ROOT_PASSWORD = $env:MONGODB_ROOT_PASSWORD ?? '551086'

Write-Host "🔧 Resetting infrastructure containers and volumes..."
docker compose down -v --remove-orphans | Out-Null

# Remove named volumes to ensure a clean state
$volumes = @('ai-recruitment-mongodb-data','ai-recruitment-nats-data','ai-recruitment-nats-logs')
foreach ($v in $volumes) { try { docker volume rm $v | Out-Null } catch { } }

Write-Host "🚀 Bringing up MongoDB, NATS and Redis..."
docker compose up -d mongodb nats redis | Out-Null

# 2) Health checks (TCP)
function Wait-PortReady {
  param([int]$Port, [int]$TimeoutSec = 180)
  $deadline = [DateTime]::UtcNow.AddSeconds($TimeoutSec)
  do {
    $ok = (Test-NetConnection -ComputerName 127.0.0.1 -Port $Port -InformationLevel Quiet -WarningAction SilentlyContinue)
    if ($ok) { return $true }
    Start-Sleep -Seconds 2
  } while([DateTime]::UtcNow -lt $deadline)
  return $false
}

$okMongo = Wait-PortReady -Port 27018 -TimeoutSec 240
$okNats  = Wait-PortReady -Port 4222  -TimeoutSec 240
$okRedis = Wait-PortReady -Port 6379  -TimeoutSec 240

Write-Host ("READY mongo={0} nats={1} redis={2}" -f $okMongo,$okNats,$okRedis)
if (-not ($okMongo -and $okNats -and $okRedis)) {
  Write-Host '❌ Infra not ready. Current compose status:'
  docker compose ps | Out-Host
  Write-Host "[TASK_DONE]"; Write-Host ''; Write-Host ''
  exit 1
}

# 3) Verify Mongo authentication (admin DB)
Write-Host '🔐 Verifying Mongo admin authentication...'
# Retry auth ping because root user may be created a few seconds after port is open
$authOk = $false
for($i=0; $i -lt 30; $i++){
  try {
    $res = docker exec ai-recruitment-mongodb mongosh --port 27017 admin -u admin -p $env:MONGODB_ROOT_PASSWORD --quiet --eval "db.runCommand({ ping: 1 }).ok" 2>$null
    if ($res -match '^1') { $authOk = $true; break }
  } catch {}
  Start-Sleep -Seconds 3
}
if(-not $authOk){
  Write-Host '❌ Mongo authentication ping failed after retries.'
  try { docker logs --tail 80 ai-recruitment-mongodb | Out-Host } catch {}
  Write-Host "[TASK_DONE]"; Write-Host ''; Write-Host ''
  exit 1
}

# 4) Show brief NATS log tail
Write-Host '📝 NATS recent logs:'
try { docker compose logs --no-color --tail 20 nats | Out-Host } catch {}

Write-Host '✅ Infrastructure is up and healthy.'
Write-Host "[TASK_DONE]"; Write-Host ''; Write-Host ''


