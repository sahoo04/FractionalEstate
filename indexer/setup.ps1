# FractionalStay Indexer Setup Script (Windows)

Write-Host "🚀 FractionalStay Blockchain Indexer Setup" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js version
$nodeVersion = node -v
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error: Node.js not found. Please install Node.js 18+" -ForegroundColor Red
    exit 1
}

$versionNumber = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
if ($versionNumber -lt 18) {
    Write-Host "❌ Error: Node.js 18+ required. Current version: $nodeVersion" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green

# Navigate to indexer directory
Set-Location $PSScriptRoot
Write-Host "📂 Working directory: $(Get-Location)" -ForegroundColor Yellow
Write-Host ""

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Dependencies installed" -ForegroundColor Green
Write-Host ""

# Create .env if it doesn't exist
if (!(Test-Path .env)) {
    Write-Host "📝 Creating .env file..." -ForegroundColor Yellow
    Copy-Item .env.example .env
    
    # Try to auto-fill contract addresses from deployments.json
    $deploymentsPath = "..\contracts\deployments.json"
    if (Test-Path $deploymentsPath) {
        Write-Host "🔍 Found deployments.json, auto-filling contract addresses..." -ForegroundColor Yellow
        
        $deployments = Get-Content $deploymentsPath | ConvertFrom-Json
        
        $propertyShare = $deployments.contracts.PropertyShare1155
        $revenueSplitter = $deployments.contracts.RevenueSplitter
        $marketplace = $deployments.contracts.Marketplace
        $userRegistry = if ($deployments.contracts.UserRegistry) { $deployments.contracts.UserRegistry } else { "0x0000000000000000000000000000000000000000" }
        $zkRegistry = if ($deployments.contracts.ZKRegistry) { $deployments.contracts.ZKRegistry } else { "0x0000000000000000000000000000000000000000" }
        $identitySBT = if ($deployments.contracts.IdentitySBT) { $deployments.contracts.IdentitySBT } else { "0x0000000000000000000000000000000000000000" }
        
        $env = Get-Content .env
        $env = $env -replace 'PROPERTY_SHARE_ADDRESS=.*', "PROPERTY_SHARE_ADDRESS=$propertyShare"
        $env = $env -replace 'REVENUE_SPLITTER_ADDRESS=.*', "REVENUE_SPLITTER_ADDRESS=$revenueSplitter"
        $env = $env -replace 'MARKETPLACE_ADDRESS=.*', "MARKETPLACE_ADDRESS=$marketplace"
        $env = $env -replace 'USER_REGISTRY_ADDRESS=.*', "USER_REGISTRY_ADDRESS=$userRegistry"
        $env = $env -replace 'ZK_REGISTRY_ADDRESS=.*', "ZK_REGISTRY_ADDRESS=$zkRegistry"
        $env = $env -replace 'IDENTITY_SBT_ADDRESS=.*', "IDENTITY_SBT_ADDRESS=$identitySBT"
        $env | Set-Content .env
        
        Write-Host "✅ Contract addresses auto-filled" -ForegroundColor Green
    } else {
        Write-Host "⚠️  deployments.json not found, you'll need to fill contract addresses manually" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "⚠️  IMPORTANT: Edit .env file and add:" -ForegroundColor Yellow
    Write-Host "   - SUPABASE_URL" -ForegroundColor Cyan
    Write-Host "   - SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "   Get these from: https://supabase.com → Your Project → Settings → API" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "✅ .env file already exists" -ForegroundColor Green
}

# Build TypeScript
Write-Host "🔨 Building TypeScript..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Build successful" -ForegroundColor Green
Write-Host ""

# Run health check
Write-Host "🏥 Running health check..." -ForegroundColor Yellow
npm run health
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Health check failed. Please check your configuration." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Common issues:" -ForegroundColor Yellow
    Write-Host "  1. Supabase credentials not set in .env" -ForegroundColor Cyan
    Write-Host "  2. Database migration not run (see supabase/migrations/)" -ForegroundColor Cyan
    Write-Host "  3. RPC URL not accessible" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Make sure Supabase migration is applied:" -ForegroundColor Cyan
Write-Host "     → Run supabase/migrations/20251124000001_indexer_tables.sql" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. Start the indexer:" -ForegroundColor Cyan
Write-Host "     npm start           (production)" -ForegroundColor Gray
Write-Host "     npm run dev         (development with auto-reload)" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. Monitor sync status:" -ForegroundColor Cyan
Write-Host "     npm run health" -ForegroundColor Gray
Write-Host ""
Write-Host "Happy indexing! 🎉" -ForegroundColor Magenta
