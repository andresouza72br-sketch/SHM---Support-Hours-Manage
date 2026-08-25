Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  Encerrando TODAS as Instancias do SHM" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

$ports = @(8000, 5173)
foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($connections) {
        foreach ($conn in $connections) {
            $procId = $conn.OwningProcess
            if ($procId -gt 0) {
                try {
                    $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
                    $procName = if ($proc) { $proc.ProcessName } else { "Processo $procId" }
                    Write-Host "  -> Encerrando $procName (PID $procId) na porta $port..." -ForegroundColor Yellow
                    # Encerra em árvore com taskkill
                    Start-Process -FilePath "taskkill.exe" -ArgumentList "/F", "/T", "/PID", $procId -NoNewWindow -Wait -ErrorAction SilentlyContinue
                } catch {}
            }
        }
    }
}

Start-Sleep -Milliseconds 800
Write-Host ""
Write-Host "Todas as instancias foram finalizadas com sucesso!" -ForegroundColor Green
