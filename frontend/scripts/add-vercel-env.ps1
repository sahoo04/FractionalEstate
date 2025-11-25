# Add environment variables to Vercel from .env.local
# Usage: .\scripts\add-vercel-env.ps1

$envPath = Join-Path $PSScriptRoot "..\.env.local"

if (-not (Test-Path $envPath)) {
    Write-Host "❌ .env.local file not found!" -ForegroundColor Red
    exit 1
}

Write-Host "📋 Reading environment variables from .env.local...`n" -ForegroundColor Cyan

$envVars = @{}
Get-Content $envPath | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
        $parts = $line.Split("=", 2)
        if ($parts.Length -eq 2) {
            $key = $parts[0].Trim()
            $value = $parts[1].Trim()
            if ($key -and $value) {
                $envVars[$key] = $value
            }
        }
    }
}

Write-Host "Found $($envVars.Count) environment variables`n" -ForegroundColor Green

$environments = @("production", "preview", "development")

foreach ($key in $envVars.Keys) {
    Write-Host "Adding $key..." -ForegroundColor Yellow
    $value = $envVars[$key]
    
    foreach ($env in $environments) {
        $value | vercel env add $key $env 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✓ Added to $env" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️  $env : Already exists or error" -ForegroundColor Yellow
        }
    }
    Write-Host ""
}

Write-Host "✅ Done! All environment variables added." -ForegroundColor Green
Write-Host "💡 Run: vercel --prod to deploy" -ForegroundColor Cyan
