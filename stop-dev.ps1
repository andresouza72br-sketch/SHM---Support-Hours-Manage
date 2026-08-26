Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  Encerrando TODAS as Instancias do SHM 2.2" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

$killedCount = 0

# 1. Encerra PIDs gravados no arquivo de controle
$pidsFile = Join-Path $PSScriptRoot ".logs\pids.json"
if (Test-Path $pidsFile) {
    try {
        $pidsJson = Get-Content $pidsFile -Raw | ConvertFrom-Json
        $savedPids = @($pidsJson.BackendPid, $pidsJson.FrontendPid)
        foreach ($pidToKill in $savedPids) {
            if ($pidToKill -and ($pidToKill -gt 0)) {
                $proc = Get-Process -Id $pidToKill -ErrorAction SilentlyContinue
                if ($proc) {
                    Write-Host "  -> Encerrando processo gravado PID $pidToKill ($($proc.ProcessName))..." -ForegroundColor Yellow
                    Start-Process -FilePath "taskkill.exe" -ArgumentList "/F", "/T", "/PID", $pidToKill -NoNewWindow -Wait -ErrorAction SilentlyContinue
                    $killedCount++
                }
            }
        }
    } catch {}
    Remove-Item $pidsFile -Force -ErrorAction SilentlyContinue
}

# 2. Encerra qualquer processo escutando nas portas 8000 e 5173
$ports = @(8000, 5173)
foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($connections) {
        foreach ($conn in $connections) {
            $procId = $conn.OwningProcess
            if ($procId -gt 0) {
                try {
                    $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
                    $procName = if ($proc) { $proc.ProcessName } else { "PID $procId" }
                    Write-Host "  -> Encerrando $procName (PID $procId) na porta $port..." -ForegroundColor Yellow
                    Start-Process -FilePath "taskkill.exe" -ArgumentList "/F", "/T", "/PID", $procId -NoNewWindow -Wait -ErrorAction SilentlyContinue
                    $killedCount++
                } catch {}
            }
        }
    }
}

# 3. Limpeza de processos residuais do runserver e vite do projeto
try {
    $allProcesses = Get-CimInstance Win32_Process -Filter "name = 'python.exe' or name = 'powershell.exe' or name = 'node.exe'" -ErrorAction SilentlyContinue
    foreach ($p in $allProcesses) {
        if ($p.CommandLine -and (
            $p.CommandLine -like "*backend/manage.py runserver*" -or
            $p.CommandLine -like "*backend\manage.py runserver*" -or
            $p.CommandLine -like "*projeto-SHM\frontend*" -or
            $p.CommandLine -like "*projeto-SHM/frontend*"
        )) {
            Write-Host "  -> Encerrando processo residual $($p.Name) ($($p.ProcessId))..." -ForegroundColor Yellow
            Start-Process -FilePath "taskkill.exe" -ArgumentList "/F", "/T", "/PID", $p.ProcessId -NoNewWindow -Wait -ErrorAction SilentlyContinue
            $killedCount++
        }
    }
} catch {}

Start-Sleep -Milliseconds 600

Write-Host ""
Write-Host "Todas as instancias do SHM foram finalizadas com sucesso!" -ForegroundColor Green

