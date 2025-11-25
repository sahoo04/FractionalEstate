# Deploy contract(s) and sync deployment addresses to services
# Usage: Open PowerShell in repo root and run: ./scripts/deploy-and-sync.ps1

Set-StrictMode -Version Latest

Write-Host "Starting deploy-and-sync helper..." -ForegroundColor Cyan

# Step 1: Ensure contracts deps
Push-Location .\contracts
if (!(Test-Path node_modules)) {
    Write-Host "Installing contract dependencies..."
    npm install
}

Write-Host "Compiling contracts..."
npm run compile

Write-Host "Deploying contracts (hardhat)..."
# This command expects contracts/.env to contain PRIVATE_KEY and ARBITRUM_SEPOLIA_RPC_URL
npm run deploy:property-only

# Wait a bit to ensure file writes
Start-Sleep -Seconds 2

Pop-Location

# Step 2: Sync deployments into frontend/indexer/relayer env files
Write-Host "Syncing deployments to service .env files..."
node .\scripts\sync-deployments.js

Write-Host "Done. Next steps:" -ForegroundColor Green
Write-Host "  1) Verify ./contracts/deployments.json contains the expected addresses"
Write-Host "  2) Restart services:"
Write-Host "     - cd indexer; npm run dev" 
Write-Host "     - cd frontend; npm run dev"

Write-Host "If you don't have the PRIVATE_KEY or RPC URL in contracts/.env, run: node ./scripts/setup-env.js" -ForegroundColor Yellow
