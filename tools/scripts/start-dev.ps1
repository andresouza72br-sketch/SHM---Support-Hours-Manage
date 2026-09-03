param(
    [switch]$Visible = $false
)

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  Iniciando SHM 2.3 (Backend Django + Frontend Vite)" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

# 1. Limpeza preventiva
Write-Host "[1/3] Limpando processos anteriores nas portas 8001 e 5173..." -ForegroundColor Yellow
& "$PSScriptRoot\stop-dev.ps1" | Out-Null
Start-Sleep -Milliseconds 800

$rootDir = (Get-Item $PSScriptRoot).Parent.Parent.FullName

$pyExe = Join-Path $rootDir ".venv\Scripts\python.exe"
if (-not (Test-Path $pyExe)) {
    $pyExe = "python.exe"
}

$frontendDir = Join-Path $rootDir "frontend"

if ($Visible) {
    Write-Host "[2/4] Iniciando Backend Django na porta 8001 (Janela aberta)..." -ForegroundColor Cyan
    $backendProc = Start-Process -FilePath "cmd.exe" -ArgumentList "/k cd /d `"$rootDir`" && `"$pyExe`" backend\manage.py runserver 0.0.0.0:8001" -PassThru

    Write-Host "[3/4] Iniciando Frontend React na porta 5173 (Janela aberta)..." -ForegroundColor Cyan
    $frontendProc = Start-Process -FilePath "cmd.exe" -ArgumentList "/k cd /d `"$frontendDir`" && npm run dev" -PassThru

    Write-Host "[4/4] Iniciando Servidor de E-mail Local na porta 8025 (Janela aberta)..." -ForegroundColor Cyan
    $mailProc = Start-Process -FilePath "cmd.exe" -ArgumentList "/k cd /d `"$rootDir`" && `"$pyExe`" tools\mail-server\dev_mail_server.py" -PassThru
} else {
    $backendLog = Join-Path $rootDir ".logs\backend.log"
    $backendErrLog = Join-Path $rootDir ".logs\backend.err.log"
    $frontendLog = Join-Path $rootDir ".logs\frontend.log"
    $frontendErrLog = Join-Path $rootDir ".logs\frontend.err.log"
    $mailLog = Join-Path $rootDir ".logs\mail.log"
    $mailErrLog = Join-Path $rootDir ".logs\mail.err.log"
    $logDir = Join-Path $rootDir ".logs"
    if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }

    Write-Host "[2/4] Iniciando Backend Django na porta 8001 (Segundo plano)..." -ForegroundColor Cyan
    $bCmd = "cmd.exe /c `"`"$pyExe`" backend\manage.py runserver 0.0.0.0:8001 > `"$backendLog`" 2> `"$backendErrLog`"`""
    $bResult = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{
        CommandLine = $bCmd
        CurrentDirectory = $rootDir
    }

    Write-Host "[3/4] Iniciando Frontend React na porta 5173 (Segundo plano)..." -ForegroundColor Cyan
    $fCmd = "cmd.exe /c `"npm run dev > `"$frontendLog`" 2> `"$frontendErrLog`"`""
    $fResult = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{
        CommandLine = $fCmd
        CurrentDirectory = $frontendDir
    }

    Write-Host "[4/4] Iniciando Servidor SMTP Local (Porta 1025 / Web 8025)..." -ForegroundColor Cyan
    $mCmd = "cmd.exe /c `"`"$pyExe`" tools\mail-server\dev_mail_server.py > `"$mailLog`" 2> `"$mailErrLog`"`""
    $mResult = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{
        CommandLine = $mCmd
        CurrentDirectory = $rootDir
    }

    $pidsFile = Join-Path $rootDir ".logs\pids.json"
    @{
        BackendPid = $bResult.ProcessId
        FrontendPid = $fResult.ProcessId
        MailPid = $mResult.ProcessId
    } | ConvertTo-Json | Set-Content -Path $pidsFile -Encoding UTF8
}

Start-Sleep -Seconds 4

# Verificacao de escuta
$port8001 = Get-NetTCPConnection -LocalPort 8001 -State Listen -ErrorAction SilentlyContinue
$port5173 = Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue
$port8025 = Get-NetTCPConnection -LocalPort 8025 -State Listen -ErrorAction SilentlyContinue

Write-Host ""
if ($Visible) {
    Write-Host "Ambiente SHM 2.3 iniciado em janelas dedicadas!" -ForegroundColor Green
} else {
    Write-Host "Ambiente SHM 2.3 iniciado em SEGUNDO PLANO (sem janelas extras)!" -ForegroundColor Green
}

if ($port8001) {
    Write-Host "  -> Backend API:  http://localhost:8001/api/docs/ (ONLINE - PID $($port8001[0].OwningProcess))" -ForegroundColor Green
} else {
    Write-Host "  -> Backend API:  Inicializando... (execute '.\dev.ps1 status' para checar)" -ForegroundColor Yellow
}

if ($port8025) {
    Write-Host "  -> Mail Web UI:  http://localhost:8025/ (ONLINE - SMTP 1025)" -ForegroundColor Green
} else {
    Write-Host "  -> Mail Web UI:  Inicializando... (execute '.\dev.ps1 status' para checar)" -ForegroundColor Yellow
}

if ($port5173) {
    Write-Host "  -> Frontend:    http://localhost:5173 (ONLINE - PID $($port5173[0].OwningProcess))" -ForegroundColor Green
    $tailscaleIp = $env:TAILSCALE_IP
    if (-not $tailscaleIp -and (Test-Path "$rootDir\.env")) {
        $envLines = Get-Content "$rootDir\.env" -ErrorAction SilentlyContinue
        foreach ($line in $envLines) {
            if ($line -match '^\s*TAILSCALE_IP\s*=\s*(.+)$') {
                $tailscaleIp = $matches[1].Trim().Trim('"').Trim("'")
                break
            }
        }
    }
    if ($tailscaleIp) {
        Write-Host "  -> Tailscale:   http://${tailscaleIp}:5173" -ForegroundColor Cyan
    }
} else {
    Write-Host "  -> Frontend:    Inicializando... (execute '.\dev.ps1 status' para checar)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Dicas uteis:" -ForegroundColor Gray
Write-Host "  * Para ver status: .\dev.ps1 status" -ForegroundColor Gray
Write-Host "  * Para encerrar:   .\dev.ps1 stop" -ForegroundColor Gray