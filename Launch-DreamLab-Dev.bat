@echo off
setlocal

title DreamLab Dev

set "ROOT_DIR=%~dp0"
cd /d "%ROOT_DIR%"

set "POWERSHELL_CMD=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
if not exist "%POWERSHELL_CMD%" set "POWERSHELL_CMD=powershell.exe"

echo ========================================================
echo   DreamLab Dev Launcher
echo   Workspace: %ROOT_DIR%
echo ========================================================
echo.

"%POWERSHELL_CMD%" -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%ROOT_DIR%start-dev.ps1"

echo.
echo [DreamLab] Dev launcher exited.
pause

endlocal
