@echo off
REM ============================================================
REM  Prism - one-click launcher for Windows
REM  Creates .env and installs dependencies on first run,
REM  then starts the editor (5173) + API (9998).
REM ============================================================
setlocal
cd /d "%~dp0"

where node >nul 2>nul || (echo [Prism] Node.js is required - get it from https://nodejs.org then run this again. & pause & exit /b 1)

if not exist ".env" copy /y ".env.example" ".env" >nul

if not exist "node_modules" (echo [Prism] Installing dependencies, this can take a minute... & call npm install || (echo [Prism] npm install failed. & pause & exit /b 1))

echo.
echo [Prism] Starting...   Editor: http://localhost:5173    API: http://localhost:9998
echo [Prism] A browser tab will open shortly. Press Ctrl+C in this window to stop.
echo.

start "Prism" /min cmd /c "timeout /t 6 /nobreak >nul && start http://localhost:5173"

call npm run dev
