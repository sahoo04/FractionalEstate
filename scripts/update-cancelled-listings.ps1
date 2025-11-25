# Update database for cancelled listings via API
# Usage: .\scripts\update-cancelled-listings.ps1
# Make sure frontend server is running on localhost:3000

$listings = @(1, 2)
$baseUrl = "http://localhost:3000"

Write-Host "🔄 Updating database for cancelled listings via API..." -ForegroundColor Cyan
Write-Host "Make sure frontend server is running on $baseUrl`n" -ForegroundColor Yellow

foreach ($listingId in $listings) {
    try {
        $body = @{
            listingId = $listingId
        } | ConvertTo-Json

        $response = Invoke-WebRequest -Uri "$baseUrl/api/marketplace/cancel" `
            -Method POST `
            -Headers @{ "Content-Type" = "application/json" } `
            -Body $body `
            -ErrorAction Stop

        $result = $response.Content | ConvertFrom-Json
        if ($result.success) {
            Write-Host "✅ Listing $listingId updated successfully" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Listing $listingId update returned: $($result.error)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "❌ Failed to update listing $listingId : $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response) {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "   Response: $responseBody" -ForegroundColor Red
        }
    }
}

Write-Host "`n✅ Done!" -ForegroundColor Green

