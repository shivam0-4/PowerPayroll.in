@echo off
REM ─────────────────────────────────────────────────────────────────────────────
REM  GROUPON POWER – Local Development Startup (No Docker)
REM  Starts Flask backend + Vite frontend in separate windows.
REM  Usage:  dev.bat
REM ─────────────────────────────────────────────────────────────────────────────

echo [GROUPON POWER] Starting local development environment...
echo.

REM ── Find Python with Flask ────────────────────────────────────────────────────
set PYTHON_CMD=
for %%P in (C:\Python314\python.exe C:\Python313\python.exe C:\Python312\python.exe python.exe) do (
    if exist "%%P" (
        "%%P" -c "import flask" >nul 2>&1
        if !errorlevel! == 0 (
            set PYTHON_CMD=%%P
            goto :found_python
        )
    )
)
:found_python
if "%PYTHON_CMD%"=="" (
    REM Try python on PATH
    python -c "import flask" >nul 2>&1
    if %errorlevel% == 0 set PYTHON_CMD=python
)
if "%PYTHON_CMD%"=="" (
    echo [ERROR] Python with Flask not found.
    echo         Install Flask:  pip install flask flask-jwt-extended flask-sqlalchemy flask-cors python-dotenv
    pause & exit /b 1
)
echo [OK] Using Python: %PYTHON_CMD%

REM ── Start Flask backend in a new window ────────────────────────────────────
echo [1/2] Starting Flask backend on http://localhost:5000 ...
start "GROUPON POWER - Backend" cmd /k "cd /d %~dp0backend && %PYTHON_CMD% run.py"

REM ── Wait 3 seconds then start frontend ────────────────────────────────────
timeout /t 3 /nobreak >nul

REM ── Start Vite frontend in a new window ────────────────────────────────────
echo [2/2] Starting Vite frontend...
start "GROUPON POWER - Frontend" cmd /k "cd /d %~dp0frontend && pnpm run dev"

echo.
echo ─────────────────────────────────────────────────────────────────────────────
echo   Both servers are starting in separate windows.
echo.
echo   Open browser:  http://localhost:3000
echo   (If 3000 is busy, check the Vite window for the actual port)
echo.
echo   Default Login:
echo     Email    : admin@grouponpower.com
echo     Password : Admin@123
echo ─────────────────────────────────────────────────────────────────────────────
echo.
