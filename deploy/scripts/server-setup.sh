#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
#  GROUPON POWER – VPS Server Setup Script
#  Run this ONCE on a fresh Ubuntu 22.04 / 24.04 VPS to install all deps.
#
#  Usage (as root or with sudo):
#    curl -fsSL https://raw.githubusercontent.com/YOUR_ORG/labour/main/deploy/scripts/server-setup.sh | bash
#  Or upload and run:
#    scp deploy/scripts/server-setup.sh root@YOUR_IP:/root/
#    ssh root@YOUR_IP "bash /root/server-setup.sh"
# ─────────────────────────────────────────────────────────────────────────────
set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

info()  { echo -e "${CYAN}[INFO]${NC} $1"; }
ok()    { echo -e "${GREEN}[OK]${NC}   $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

[[ $EUID -ne 0 ]] && error "Run this script as root (sudo bash server-setup.sh)"

info "=================================================="
info "  GROUPON POWER – VPS Setup (Ubuntu 22.04/24.04)"
info "=================================================="

# ── 1. System update ──────────────────────────────────────────────────────────
info "Updating system packages..."
apt-get update -qq && apt-get upgrade -y -qq
ok "System updated."

# ── 2. Install essentials ─────────────────────────────────────────────────────
info "Installing required tools..."
apt-get install -y -qq \
    curl wget git unzip ufw fail2ban \
    ca-certificates gnupg lsb-release \
    apt-transport-https software-properties-common
ok "Tools installed."

# ── 3. Docker ─────────────────────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
    info "Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    ok "Docker installed: $(docker --version)"
else
    ok "Docker already installed: $(docker --version)"
fi

# ── 4. Docker Compose (v2 plugin) ─────────────────────────────────────────────
if ! docker compose version &>/dev/null; then
    info "Installing Docker Compose plugin..."
    apt-get install -y docker-compose-plugin
    ok "Docker Compose installed."
else
    ok "Docker Compose already installed: $(docker compose version --short)"
fi

# ── 5. Create app user (non-root) ─────────────────────────────────────────────
if ! id "groupon" &>/dev/null; then
    info "Creating app user 'groupon'..."
    useradd -m -s /bin/bash groupon
    usermod -aG docker groupon
    ok "User 'groupon' created and added to docker group."
else
    ok "User 'groupon' already exists."
    usermod -aG docker groupon
fi

# ── 6. App directory ──────────────────────────────────────────────────────────
APP_DIR="/opt/groupon-power"
info "Creating app directory at $APP_DIR..."
mkdir -p "$APP_DIR"
chown groupon:groupon "$APP_DIR"
ok "App directory ready."

# ── 7. UFW Firewall ───────────────────────────────────────────────────────────
info "Configuring firewall (UFW)..."
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ok "Firewall configured (SSH + HTTP + HTTPS allowed)."

# ── 8. Fail2Ban (brute-force protection) ─────────────────────────────────────
info "Enabling Fail2Ban..."
systemctl enable fail2ban
systemctl start fail2ban
ok "Fail2Ban active."

# ── 9. Automatic security updates ─────────────────────────────────────────────
info "Enabling unattended security upgrades..."
apt-get install -y -qq unattended-upgrades
echo 'Unattended-Upgrade::Automatic-Reboot "false";' \
    > /etc/apt/apt.conf.d/51unattended-reboot
systemctl enable unattended-upgrades
ok "Auto security updates enabled."

# ── 10. Swap (if < 2GB RAM) ───────────────────────────────────────────────────
TOTAL_RAM=$(grep MemTotal /proc/meminfo | awk '{print $2}')
if [ "$TOTAL_RAM" -lt 2097152 ] && [ ! -f /swapfile ]; then
    info "Low RAM detected — creating 2GB swap..."
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    ok "2GB swap created."
fi

# ── 11. Cron: auto-renew SSL certs ───────────────────────────────────────────
info "Setting up Certbot SSL auto-renewal cron (runs twice daily)..."
(crontab -l 2>/dev/null; echo "0 3,15 * * * cd $APP_DIR && docker compose -f docker-compose.prod.yml run --rm certbot renew --quiet && docker compose -f docker-compose.prod.yml exec frontend nginx -s reload") | crontab -
ok "SSL renewal cron added."

# ── 12. Cron: daily DB backup ─────────────────────────────────────────────────
info "Setting up daily database backup cron..."
mkdir -p /opt/backups/groupon-power
(crontab -l 2>/dev/null; echo "0 2 * * * $APP_DIR/deploy/scripts/backup.sh >> /var/log/groupon-backup.log 2>&1") | crontab -
ok "Daily backup cron added (runs at 02:00)."

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Server setup complete!${NC}"
echo ""
echo -e "  Next steps:"
echo -e "  1. Upload your app:  ${CYAN}scp -r . groupon@YOUR_IP:$APP_DIR/${NC}"
echo -e "  2. SSH in:           ${CYAN}ssh groupon@YOUR_IP${NC}"
echo -e "  3. Configure .env:   ${CYAN}cd $APP_DIR && cp .env.example .env && nano .env${NC}"
echo -e "  4. Deploy:           ${CYAN}bash $APP_DIR/deploy/scripts/deploy-vps.sh${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
