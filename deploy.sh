#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
#  GROUPON POWER – One-Command Linux/Mac Deploy Script
#  Usage:  chmod +x deploy.sh && ./deploy.sh
# ─────────────────────────────────────────────────────────────────────────────
set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

echo -e "${CYAN}"
echo "  ██████╗ ██████╗  ██████╗ ██╗   ██╗██████╗  ██████╗ ███╗   ██╗"
echo "  ██╔════╝ ██╔══██╗██╔═══██╗██║   ██║██╔══██╗██╔═══██╗████╗  ██║"
echo "  ██║  ███╗██████╔╝██║   ██║██║   ██║██████╔╝██║   ██║██╔██╗ ██║"
echo "  ██║   ██║██╔══██╗██║   ██║██║   ██║██╔═══╝ ██║   ██║██║╚██╗██║"
echo "  ╚██████╔╝██║  ██║╚██████╔╝╚██████╔╝██║     ╚██████╔╝██║ ╚████║"
echo "   ╚═════╝ ╚═╝  ╚═╝ ╚═════╝  ╚═════╝ ╚═╝      ╚═════╝ ╚═╝  ╚═══╝"
echo "                   POWER Payroll ERP – Production Deploy"
echo -e "${NC}"

# ── Pre-flight checks ─────────────────────────────────────────────────────────
command -v docker >/dev/null 2>&1 || {
    echo -e "${RED}[ERROR] Docker not found. Install from https://docs.docker.com/get-docker/${NC}"
    exit 1
}

docker info >/dev/null 2>&1 || {
    echo -e "${RED}[ERROR] Docker daemon not running. Start Docker first.${NC}"
    exit 1
}

# ── Env file check ────────────────────────────────────────────────────────────
if [ ! -f .env ]; then
    echo -e "${YELLOW}[SETUP] .env not found — copying from .env.example ...${NC}"
    cp .env.example .env
    echo -e "${RED}"
    echo "[ACTION REQUIRED] Edit .env and set:"
    echo "  SECRET_KEY, JWT_SECRET_KEY, POSTGRES_PASSWORD"
    echo "Then run this script again."
    echo -e "${NC}"
    exit 1
fi

echo -e "${GREEN}[OK] .env found.${NC}"

# ── Optional: check for placeholder secrets ────────────────────────────────────
if grep -q "CHANGE_ME" .env; then
    echo -e "${RED}[WARNING] .env still contains placeholder values (CHANGE_ME).${NC}"
    read -rp "         Continue anyway? (y/N): " confirm
    [[ "$confirm" =~ ^[Yy]$ ]] || exit 1
fi

# ── Build + Start ─────────────────────────────────────────────────────────────
echo -e "\n${CYAN}[1/3] Pulling base images...${NC}"
docker compose pull postgres redis

echo -e "\n${CYAN}[2/3] Building application images...${NC}"
docker compose build --no-cache

echo -e "\n${CYAN}[3/3] Starting all services...${NC}"
docker compose up -d

# ── Wait for health ───────────────────────────────────────────────────────────
echo ""
echo "Waiting for services to become healthy (up to 60s)..."
sleep 15

RETRIES=10
until docker inspect --format='{{.State.Health.Status}}' groupon_backend 2>/dev/null | grep -q "healthy"; do
    RETRIES=$((RETRIES - 1))
    if [ $RETRIES -eq 0 ]; then
        echo -e "${YELLOW}[WARN] Backend health check timed out. Check logs: docker compose logs backend${NC}"
        break
    fi
    echo "  still starting... ($RETRIES retries left)"
    sleep 6
done

docker compose ps

echo -e "${GREEN}"
echo "─────────────────────────────────────────────────────────────────────────────"
echo "  GROUPON POWER is running!"
echo ""
echo "  App URL  :  http://localhost"
echo "  API URL  :  http://localhost/api"
echo "  Health   :  http://localhost/api/health"
echo ""
echo "  Default Login:"
echo "    Email    : admin@grouponpower.com"
echo "    Password : Admin@123"
echo ""
echo "  Useful commands:"
echo "    docker compose logs -f backend    # live backend logs"
echo "    docker compose logs -f frontend   # nginx logs"
echo "    docker compose down               # stop everything"
echo "    docker compose down -v            # stop + wipe DB data"
echo "─────────────────────────────────────────────────────────────────────────────"
echo -e "${NC}"
