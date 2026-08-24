Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  Iniciando SHM 2.0 (Backend Django + Frontend Vite)" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot'; .\.venv\Scripts\python.exe backend/manage.py runserver 0.0.0.0:8000"
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot/frontend'; bun run dev"

Write-Host ""
Write-Host "Ambiente iniciado com sucesso!" -ForegroundColor Green
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Yellow
Write-Host "API Swagger: http://localhost:8000/api/docs/" -ForegroundColor Yellow