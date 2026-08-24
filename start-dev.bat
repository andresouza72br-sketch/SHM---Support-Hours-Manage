@echo off
echo ===================================================
echo   Iniciando SHM 2.0 (Backend Django + Frontend Vite)
echo ===================================================

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