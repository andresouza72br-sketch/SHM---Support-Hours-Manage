@echo off
set ACTION=%1
if "%ACTION%"=="" set ACTION=start

if "%ACTION%"=="stop" (
    call "%~dp0stop-dev.bat"
) else if "%ACTION%"=="start" (
    call "%~dp0start-dev.bat"
) else if "%ACTION%"=="restart" (
    call "%~dp0stop-dev.bat"
    timeout /t 1 /nobreak >nul
    call "%~dp0start-dev.bat"
) else if "%ACTION%"=="status" (
    call "%~dp0status-dev.bat"
) else (
    echo Comando invalido. Use: dev [start ^| stop ^| restart ^| status]
)
