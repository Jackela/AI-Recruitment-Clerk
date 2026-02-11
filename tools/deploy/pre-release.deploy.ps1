param(
    [string]$Environment = "local"
)

$ErrorActionPreference = 'Stop'

Write-Host "🚀 Starting pre-release deployment to $Environment..."

# Build the app-gateway
Write-Host "📦 Building app-gateway..."
npx nx build app-gateway --prod

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed"
    exit 1
}

# Build the frontend for static serving
Write-Host "📦 Building ai-recruitment-frontend..."
npx nx build ai-recruitment-frontend --configuration=production

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Frontend build failed"
    exit 1
}

Write-Host "✅ Pre-release deployment completed successfully"
