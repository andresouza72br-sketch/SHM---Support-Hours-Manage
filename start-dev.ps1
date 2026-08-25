Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  Iniciando SHM 2.0 (Backend Django + Frontend Vite)" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

Write-Host "Verificando e encerrando instancias anteriores do SHM (Portas 8000 e 5173)..." -ForegroundColor Yellow
$connections = Get-NetTCPConnection -LocalPort 8000, 5173 -State Listen -ErrorAction SilentlyContinue
if ($connections) {
    foreach ($conn in $connections) {
        $procId = $conn.OwningProcess
        if ($procId -gt 0) {
            try {
                $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
                if ($proc) {
                    Write-Host "  -> Encerrando processo $procId ($($proc.ProcessName)) na porta $($conn.LocalPort)..." -ForegroundColor DarkYellow
                    Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
                }
            } catch {}
        }
    }
    Start-Sleep -Milliseconds 600
}

Write-Host "Iniciando Backend Django e Frontend React..." -ForegroundColor Cyan
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot'; .\.venv\Scripts\python.exe backend/manage.py runserver 0.0.0.0:8000"
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot/frontend'; bun run dev"

Write-Host ""
Write-Host "Ambiente iniciado com sucesso!" -ForegroundColor Green
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Yellow
Write-Host "API Swagger: http://localhost:8000/api/docs/" -ForegroundColor Yellow