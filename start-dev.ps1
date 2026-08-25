param(
    [switch]$Visible = $false
)

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  Iniciando SHM 2.1 (Backend Django + Frontend Vite)" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

# 1. Limpeza preventiva
Write-Host "[1/3] Limpando processos anteriores nas portas 8000 e 5173..." -ForegroundColor Yellow
& "$PSScriptRoot\stop-dev.ps1" | Out-Null
Start-Sleep -Milliseconds 800

$pyExe = Join-Path $PSScriptRoot ".venv\Scripts\python.exe"
if (-not (Test-Path $pyExe)) {
    $pyExe = "python.exe"
}

$frontendDir = Join-Path $PSScriptRoot "frontend"

if ($Visible) {
    Write-Host "[2/3] Iniciando Backend Django na porta 8000 (Janela aberta)..." -ForegroundColor Cyan
    $backendProc = Start-Process -FilePath "cmd.exe" -ArgumentList "/k cd /d `"$PSScriptRoot`" && `"$pyExe`" backend\manage.py runserver 0.0.0.0:8000" -PassThru

    Write-Host "[3/3] Iniciando Frontend React na porta 5173 (Janela aberta)..." -ForegroundColor Cyan
    $frontendProc = Start-Process -FilePath "cmd.exe" -ArgumentList "/k cd /d `"$frontendDir`" && npm run dev" -PassThru
} else {
    $backendLog = Join-Path $PSScriptRoot ".logs\backend.log"
    $backendErrLog = Join-Path $PSScriptRoot ".logs\backend.err.log"
    $frontendLog = Join-Path $PSScriptRoot ".logs\frontend.log"
    $frontendErrLog = Join-Path $PSScriptRoot ".logs\frontend.err.log"
    $logDir = Join-Path $PSScriptRoot ".logs"
    if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }

    Write-Host "[2/3] Iniciando Backend Django na porta 8000 (Segundo plano)..." -ForegroundColor Cyan
    $backendProc = Start-Process -FilePath $pyExe -ArgumentList "backend\manage.py runserver 0.0.0.0:8000" -WorkingDirectory $PSScriptRoot -RedirectStandardOutput $backendLog -RedirectStandardError $backendErrLog -WindowStyle Hidden -PassThru

    Write-Host "[3/3] Iniciando Frontend React na porta 5173 (Segundo plano)..." -ForegroundColor Cyan
    $frontendProc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run dev" -WorkingDirectory $frontendDir -RedirectStandardOutput $frontendLog -RedirectStandardError $frontendErrLog -WindowStyle Hidden -PassThru

    $pidsFile = Join-Path $PSScriptRoot ".logs\pids.json"
    @{
        BackendPid = $backendProc.Id
        FrontendPid = $frontendProc.Id
    } | ConvertTo-Json | Set-Content -Path $pidsFile -Encoding UTF8
}

Start-Sleep -Seconds 4

# Verificacao de escuta
$port8000 = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
$port5173 = Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue

Write-Host ""
if ($Visible) {
    Write-Host "Ambiente SHM 2.1 iniciado em janelas dedicadas!" -ForegroundColor Green
} else {
    Write-Host "Ambiente SHM 2.1 iniciado em SEGUNDO PLANO (sem janelas extras)!" -ForegroundColor Green
}

if ($port8000) {
    Write-Host "  -> Backend API: http://localhost:8000/api/docs/ (ONLINE - PID $($port8000[0].OwningProcess))" -ForegroundColor Green
} else {
    Write-Host "  -> Backend API: Inicializando... (execute '.\dev.ps1 status' para checar)" -ForegroundColor Yellow
}

if ($port5173) {
    Write-Host "  -> Frontend:    http://localhost:5173 (ONLINE - PID $($port5173[0].OwningProcess))" -ForegroundColor Green
} else {
    Write-Host "  -> Frontend:    Inicializando... (execute '.\dev.ps1 status' para checar)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Dicas uteis:" -ForegroundColor Gray
Write-Host "  * Para ver status: .\dev.ps1 status" -ForegroundColor Gray
Write-Host "  * Para encerrar:   .\dev.ps1 stop" -ForegroundColor Gray