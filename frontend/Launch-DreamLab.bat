@echo off
setlocal

title DreamLab

set "SCRIPT_DIR=%~dp0"
set "NODE_CMD=node"
if exist "%ProgramFiles%\nodejs\node.exe" set "NODE_CMD=%ProgramFiles%\nodejs\node.exe"
if exist "%ProgramFiles(x86)%\nodejs\node.exe" set "NODE_CMD=%ProgramFiles(x86)%\nodejs\node.exe"

cd /d "%SCRIPT_DIR%"

set "NEXT_DIST_DIR=.next-build"

"%NODE_CMD%" "%SCRIPT_DIR%scripts\bootstrap-runtime.mjs"
if errorlevel 1 goto :fail

title DreamLab
"%NODE_CMD%" "%SCRIPT_DIR%node_modules\next\dist\bin\next" start
goto :end

:fail
echo.
echo [DreamLab] Startup failed.
pause

:end
endlocal
