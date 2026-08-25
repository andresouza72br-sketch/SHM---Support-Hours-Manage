@echo off
echo ===================================================
echo   Status dos Servicos SHM 2.0
echo ===================================================

echo.
echo [Porta 8000 - Backend Django]:
netstat -aon | findstr /r /c:":8000 *LISTENING"
if %errorlevel% neq 0 (
    echo   [OFFLINE] Nenhum servico ativo na porta 8000.
) else (
    echo   [ONLINE] Backend ativo e respondendo na porta 8000!
)

echo.
echo [Porta 5173 - Frontend Vite]:
netstat -aon | findstr /r /c:":5173 *LISTENING"
if %errorlevel% neq 0 (
    echo   [OFFLINE] Nenhum servico ativo na porta 5173.
) else (
    echo   [ONLINE] Frontend ativo e respondendo na porta 5173!
)

echo.
echo ===================================================
pause
