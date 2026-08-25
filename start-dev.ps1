Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  Iniciando SHM 2.0 (Backend Django + Frontend Vite)" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

Write-Host "[1/3] Limpando processos anteriores nas portas 8000 e 5173..." -ForegroundColor Yellow
& "$PSScriptRoot\stop-dev.ps1" | Out-Null
Start-Sleep -Seconds 1

Write-Host "[2/3] Iniciando Backend Django na porta 8000..." -ForegroundColor Cyan
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot'; .\.venv\Scripts\python.exe backend/manage.py runserver 0.0.0.0:8000"

Write-Host "[3/3] Iniciando Frontend React na porta 5173..." -ForegroundColor Cyan
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot/frontend'; bun run dev"

Write-Host ""
Write-Host "Ambiente iniciado com sucesso!" -ForegroundColor Green
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Yellow
Write-Host "API Swagger: http://localhost:8000/api/docs/" -ForegroundColor Yellow