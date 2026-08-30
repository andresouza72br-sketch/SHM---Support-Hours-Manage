param(
    [Parameter(Position=0)]
    [ValidateSet("start", "stop", "restart", "status", "logs", "reset-db")]
    [string]$Action = "start",

    [Parameter(Position=1)]
    [string]$Target = "backend",

    [switch]$Visible = $false
)

switch ($Action) {
    "reset-db" {
        & "$PSScriptRoot\tools\database\reset_db.ps1"
    }
    "stop" {
        & "$PSScriptRoot\stop-dev.ps1"
    }
    "start" {
        & "$PSScriptRoot\start-dev.ps1" -Visible:$Visible
    }
    "restart" {
        Write-Host "Reiniciando ambiente SHM 2.3..." -ForegroundColor Cyan
        & "$PSScriptRoot\stop-dev.ps1"
        Start-Sleep -Seconds 1
        & "$PSScriptRoot\start-dev.ps1" -Visible:$Visible
    }
    "status" {
        $port8000 = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
        $port5173 = Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue

        Write-Host "===================================================" -ForegroundColor Cyan
        Write-Host "           Status dos Servicos SHM 2.3             " -ForegroundColor Cyan
        Write-Host "===================================================" -ForegroundColor Cyan
        
        if ($port8000) {
            $pid8000 = $port8000[0].OwningProcess
            Write-Host " [ONLINE]  Backend Django  -> http://localhost:8000 (PID: $pid8000)" -ForegroundColor Green
            try {
                $statusRes = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/v1/status/" -TimeoutSec 2 -ErrorAction SilentlyContinue
                if ($statusRes) {
                    Write-Host "           Health / Versao: $($statusRes.service) - $($statusRes.release)" -ForegroundColor DarkGreen
                }
            } catch {}
        } else {
            Write-Host " [OFFLINE] Backend Django  -> Porta 8000 livre" -ForegroundColor Red
        }

        if ($port5173) {
            $pid5173 = $port5173[0].OwningProcess
            Write-Host " [ONLINE]  Frontend Vite   -> http://localhost:5173 (PID: $pid5173)" -ForegroundColor Green
            
            $tailscaleIp = $env:TAILSCALE_IP
            if (-not $tailscaleIp -and (Test-Path "$PSScriptRoot\.env")) {
                $envLines = Get-Content "$PSScriptRoot\.env" -ErrorAction SilentlyContinue
                foreach ($line in $envLines) {
                    if ($line -match '^\s*TAILSCALE_IP\s*=\s*(.+)$') {
                        $tailscaleIp = $matches[1].Trim().Trim('"').Trim("'")
                        break
                    }
                }
            }
            if ($tailscaleIp) {
                Write-Host "           Tailscale IP    -> http://${tailscaleIp}:5173" -ForegroundColor Cyan
            }
        } else {
            Write-Host " [OFFLINE] Frontend Vite   -> Porta 5173 livre" -ForegroundColor Red
        }

        $logDir = Join-Path $PSScriptRoot ".logs"
        if (Test-Path $logDir) {
            $bLog = Join-Path $logDir "backend.log"
            $fLog = Join-Path $logDir "frontend.log"
            Write-Host "---------------------------------------------------" -ForegroundColor Gray
            if (Test-Path $bLog) {
                $bItem = Get-Item $bLog
                $bKb = [math]::Round($bItem.Length / 1024, 1)
                Write-Host " Log Backend:  .logs\backend.log ($bKb KB)" -ForegroundColor Gray
            }
            if (Test-Path $fLog) {
                $fItem = Get-Item $fLog
                $fKb = [math]::Round($fItem.Length / 1024, 1)
                Write-Host " Log Frontend: .logs\frontend.log ($fKb KB)" -ForegroundColor Gray
            }
        }

        Write-Host "===================================================" -ForegroundColor Cyan
    }
    "logs" {
        $logDir = Join-Path $PSScriptRoot ".logs"
        $file = if ($Target -like "*front*") { Join-Path $logDir "frontend.log" } else { Join-Path $logDir "backend.log" }
        if (Test-Path $file) {
            Write-Host "Exibindo ultimas linhas de $file (Ctrl+C para sair)..." -ForegroundColor Cyan
            Get-Content -Path $file -Tail 30 -Wait
        } else {
            Write-Host "Nenhum arquivo de log encontrado em $file." -ForegroundColor Yellow
        }
    }
}

