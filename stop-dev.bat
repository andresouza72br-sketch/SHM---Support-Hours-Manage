@echo off
echo ===================================================
echo   Encerrando TODAS as Instancias do SHM
echo ===================================================

echo [1/2] Encerrando processos na porta 8000 (Backend Django)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do (
    taskkill /F /T /PID %%a >nul 2>&1
)

echo [2/2] Encerrando processos na porta 5173 (Frontend Vite)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173" ^| findstr "LISTENING"') do (
    taskkill /F /T /PID %%a >nul 2>&1
)

powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 8000,5173 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" >nul 2>&1

echo.
echo ===================================================
echo   Todos os servicos SHM foram finalizados!
echo ===================================================
