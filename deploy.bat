@echo off
REM ─────────────────────────────────────────────────────────────────────────────
REM  GROUPON POWER – One-Command Windows Deploy Script
REM  Usage:  deploy.bat
REM ─────────────────────────────────────────────────────────────────────────────

echo.
echo  ██████╗ ██████╗  ██████╗ ██╗   ██╗██████╗  ██████╗ ███╗   ██╗
echo  ██╔════╝ ██╔══██╗██╔═══██╗██║   ██║██╔══██╗██╔═══██╗████╗  ██║
echo  ██║  ███╗██████╔╝██║   ██║██║   ██║██████╔╝██║   ██║██╔██╗ ██║
echo  ██║   ██║██╔══██╗██║   ██║██║   ██║██╔═══╝ ██║   ██║██║╚██╗██║
echo  ╚██████╔╝██║  ██║╚██████╔╝╚██████╔╝██║     ╚██████╔╝██║ ╚████║
echo   ╚═════╝ ╚═╝  ╚═╝ ╚═════╝  ╚═════╝ ╚═╝      ╚═════╝ ╚═╝  ╚═══╝
echo                        POWER Payroll ERP – Production Deploy
echo.

REM ── Pre-flight checks ────────────────────────────────────────────────────────
where docker >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not installed or not in PATH.
    echo         Download from: https://www.docker.com/products/docker-desktop
    pause & exit /b 1
)

docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker daemon is not running. Start Docker Desktop first.
    pause & exit /b 1
)

REM ── Env file check ────────────────────────────────────────────────────────────
if not exist .env (
    echo [SETUP] .env not found — copying from .env.example ...
    copy .env.example .env >nul
    echo.
    echo [ACTION REQUIRED] Open .env and set your SECRET_KEY, JWT_SECRET_KEY,
    echo                   and POSTGRES_PASSWORD before running again.
    echo.
    pause & exit /b 1
)

echo [OK] .env found.

REM ── Build and start ───────────────────────────────────────────────────────────
echo.
echo [1/3] Pulling base images...
docker compose pull postgres redis

echo.
echo [2/3] Building application images (this may take 2-5 min on first run)...
docker compose build --no-cache

echo.
echo [3/3] Starting all services...
docker compose up -d

REM ── Wait for health ───────────────────────────────────────────────────────────
echo.
echo Waiting for services to become healthy...
timeout /t 15 /nobreak >nul

docker compose ps

echo.
echo ─────────────────────────────────────────────────────────────────────────────
echo   GROUPON POWER is running!
echo.
echo   App URL  :  http://localhost
echo   API URL  :  http://localhost/api
echo   API Docs :  http://localhost/api/health
echo.
echo   Default Login:
echo     Email    : admin@grouponpower.com
echo     Password : Admin@123
echo.
echo   Useful commands:
echo     docker compose logs -f backend    (backend logs)
echo     docker compose logs -f frontend   (nginx logs)
echo     docker compose down               (stop everything)
echo     docker compose down -v            (stop + delete DB data)
echo ─────────────────────────────────────────────────────────────────────────────
echo.
pause
