@echo off
echo ===================================================
echo   Iniciando SHM 2.0 (Backend Django + Frontend Vite)
echo ===================================================

echo Encerrando instancias anteriores do SHM (Portas 8000 e 5173)...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 8000,5173 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" >nul 2>&1

echo Iniciando Backend Django na porta 8000...
start "SHM 2.0 - Backend Django (Porta 8000)" cmd /k "cd /d %~dp0 && .venv\Scripts\activate && python backend\manage.py runserver 0.0.0.0:8000"

echo Iniciando Frontend React na porta 5173...
start "SHM 2.0 - Frontend React (Porta 5173)" cmd /k "cd /d %~dp0\frontend && bun run dev"

echo.
echo ===================================================
echo   Ambiente iniciado com sucesso!
echo   Frontend: http://localhost:5173
echo   API Swagger: http://localhost:8000/api/docs/
echo ===================================================