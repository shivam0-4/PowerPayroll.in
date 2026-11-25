#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
#  GROUPON POWER – VPS Deploy Script
#  Run from /opt/groupon-power on your VPS after server-setup.sh
# ─────────────────────────────────────────────────────────────────────────────
set -e

APP_DIR="/opt/groupon-power"
COMPOSE_FILE="docker-compose.prod.yml"

cd "$APP_DIR"

# Load env
[ -f .env ] || { echo "[ERROR] .env not found. Copy .env.example and configure it."; exit 1; }
source .env

echo "=============================="
echo " GROUPON POWER – VPS Deploy"
echo "=============================="

# ── Step 1: Pull latest code (if using git) ───────────────────────────────────
if [ -d ".git" ]; then
    echo "[1/6] Pulling latest code..."
    git pull origin main
else
    echo "[1/6] Skipping git pull (not a git repo)."
fi

# ── Step 2: Build images ──────────────────────────────────────────────────────
echo "[2/6] Building Docker images..."
docker compose -f $COMPOSE_FILE build --no-cache

# ── Step 3: Issue SSL cert if not yet done ────────────────────────────────────
CERT_PATH="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
if [ ! -f "$CERT_PATH" ]; then
    echo "[3/6] No SSL cert found — issuing Let's Encrypt certificate for $DOMAIN..."

    # First start nginx on port 80 only (no SSL config yet) for ACME challenge
    cp nginx.conf deploy/nginx/nginx.ssl.conf.bak 2>/dev/null || true

    # Start services without SSL config to pass ACME challenge
    docker compose -f $COMPOSE_FILE up -d postgres redis backend

    # Run certbot
    docker compose -f $COMPOSE_FILE --profile ssl-setup run --rm certbot
    echo "[3/6] SSL certificate issued."
else
    echo "[3/6] SSL certificate already exists — skipping."
fi

# ── Step 4: Substitute domain in nginx SSL config ────────────────────────────
echo "[4/6] Configuring nginx with domain: $DOMAIN..."
sed -i "s/\${DOMAIN}/$DOMAIN/g" deploy/nginx/nginx.ssl.conf

# ── Step 5: Start all services ────────────────────────────────────────────────
echo "[5/6] Starting all services..."
docker compose -f $COMPOSE_FILE up -d

# ── Step 6: Verify health ─────────────────────────────────────────────────────
echo "[6/6] Waiting for backend health check..."
sleep 20

RETRIES=15
until curl -sf "http://localhost/api/health" > /dev/null 2>&1; do
    RETRIES=$((RETRIES - 1))
    if [ $RETRIES -eq 0 ]; then
        echo "[WARN] Health check timed out. Check: docker compose -f $COMPOSE_FILE logs backend"
        break
    fi
    echo "  still starting... ($RETRIES retries left)"
    sleep 5
done

docker compose -f $COMPOSE_FILE ps

echo ""
echo "════════════════════════════════════════════════════════"
echo "  GROUPON POWER is LIVE!"
echo ""
echo "  URL :  https://$DOMAIN"
echo "  API :  https://$DOMAIN/api/health"
echo ""
echo "  Logs:"
echo "    docker compose -f $COMPOSE_FILE logs -f backend"
echo "    docker compose -f $COMPOSE_FILE logs -f frontend"
echo "════════════════════════════════════════════════════════"
