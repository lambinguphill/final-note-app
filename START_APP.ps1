# Fixed startup script
Write-Host "Starting Note Keeper App..." -ForegroundColor Green

$projectPath = Get-Location
$pythonPath = "C:\Users\admin\AppData\Local\Programs\Python\Python311\python.exe"

# Create virtual environment
Write-Host "Setting up Python environment..." -ForegroundColor Yellow
Set-Location "$projectPath\backend"
if (!(Test-Path "venv")) {
    & $pythonPath -m venv venv
}
& .\venv\Scripts\Activate.ps1

# Install dependencies
Write-Host "Installing Python packages..." -ForegroundColor Yellow
python -m pip install --upgrade pip
pip install -r requirements.txt

# Start PostgreSQL
Write-Host "Starting PostgreSQL database..." -ForegroundColor Yellow
Set-Location "$projectPath\docker"
docker-compose down 2>$null
docker-compose up -d

# Wait for database
Write-Host "Waiting for database to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 8

# Start backend
Write-Host "Starting backend server..." -ForegroundColor Yellow
Set-Location "$projectPath\backend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectPath\backend'; .\venv\Scripts\activate; python main.py"

# Start frontend (FIXED PATH)
Write-Host "Starting frontend server..." -ForegroundColor Yellow
Set-Location "$projectPath\frontend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectPath\frontend'; python -m http.server 3000"

Start-Sleep -Seconds 5

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   APPLICATION STARTED!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Yellow
Write-Host "Backend: http://localhost:8000" -ForegroundColor Yellow
Write-Host "API Docs: http://localhost:8000/docs" -ForegroundColor Yellow
Write-Host ""
Write-Host "Test Account:" -ForegroundColor Cyan
Write-Host "Email: test@test.com" -ForegroundColor White
Write-Host "Password: test123" -ForegroundColor White
Write-Host ""

# Open browser
Start-Process "http://localhost:3000"
