Write-Host "Stopping all services..." -ForegroundColor Yellow

# Stop Docker
docker-compose -f docker\docker-compose.yml down

# Kill Python processes
Get-Process | Where-Object {$_.ProcessName -eq "python"} | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host "All services stopped." -ForegroundColor Green
