param(
    [Parameter(Position=0)]
    [ValidateSet("start", "stop", "restart", "status")]
    [string]$Action = "start"
)

switch ($Action) {
    "stop" {
        & "$PSScriptRoot\stop-dev.ps1"
    }
    "start" {
        & "$PSScriptRoot\start-dev.ps1"
    }
    "restart" {
        Write-Host "Reiniciando ambiente SHM..." -ForegroundColor Cyan
        & "$PSScriptRoot\stop-dev.ps1"
        Start-Sleep -Seconds 1
        & "$PSScriptRoot\start-dev.ps1"
    }
    "status" {
        $port8000 = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
        $port5173 = Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue

        Write-Host "=========================================" -ForegroundColor Cyan
        Write-Host "       Status dos Servicos SHM           " -ForegroundColor Cyan
        Write-Host "=========================================" -ForegroundColor Cyan
        
        if ($port8000) {
            Write-Host " [ONLINE]  Backend Django  -> http://localhost:8000 (PID: $($port8000[0].OwningProcess))" -ForegroundColor Green
        } else {
            Write-Host " [OFFLINE] Backend Django  -> Porta 8000 livre" -ForegroundColor Red
        }

        if ($port5173) {
            Write-Host " [ONLINE]  Frontend Vite   -> http://localhost:5173 (PID: $($port5173[0].OwningProcess))" -ForegroundColor Green
        } else {
            Write-Host " [OFFLINE] Frontend Vite   -> Porta 5173 livre" -ForegroundColor Red
        }
        Write-Host "=========================================" -ForegroundColor Cyan
    }
}
