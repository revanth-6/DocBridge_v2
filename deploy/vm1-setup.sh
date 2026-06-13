#!/bin/bash
# ============================================================
# DocBridge VM1 Setup Script (Application Server)
# Run as root on Ubuntu 22.04 LTS
# ============================================================

set -euo pipefail

echo "============================================"
echo "  DocBridge VM1 Setup — Application Server"
echo "============================================"

# Variables
APP_USER="docbridge"
APP_DIR="/opt/docbridge"
NODE_VERSION="20"

# Update system
echo "[1/8] Updating system packages..."
apt-get update && apt-get upgrade -y

# Install Node.js 20
echo "[2/8] Installing Node.js ${NODE_VERSION}..."
curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
apt-get install -y nodejs build-essential

# Verify
node --version
npm --version

# Install PM2
echo "[3/8] Installing PM2..."
npm install -g pm2

# Create application user
echo "[4/8] Creating application user..."
if ! id "${APP_USER}" &>/dev/null; then
    useradd -m -s /bin/bash "${APP_USER}"
    echo "User ${APP_USER} created."
else
    echo "User ${APP_USER} already exists."
fi

# Create application directory
echo "[5/8] Setting up application directory..."
mkdir -p "${APP_DIR}"
chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}"

# Install Nginx
echo "[6/8] Installing Nginx..."
apt-get install -y nginx
systemctl enable nginx

# Configure Nginx
echo "[7/8] Configuring Nginx reverse proxy..."
cat > /etc/nginx/sites-available/docbridge <<'NGINX_CONF'
upstream gateway {
    server 127.0.0.1:3000;
}

upstream frontend {
    server 127.0.0.1:5173;
}

server {
    listen 80;
    server_name _;

    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # API Gateway
    location /api/ {
        proxy_pass http://gateway;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Gateway health
    location /health {
        proxy_pass http://gateway;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
NGINX_CONF

ln -sf /etc/nginx/sites-available/docbridge /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

# Configure firewall
echo "[8/8] Configuring firewall..."
apt-get install -y ufw
ufw allow ssh
ufw allow 80
ufw allow 443
ufw --force enable

echo ""
echo "============================================"
echo "  VM1 Setup Complete!"
echo ""
echo "  Next steps:"
echo "  1. Copy application code to ${APP_DIR}"
echo "  2. Set up .env files for each service"
echo "  3. Run: cd ${APP_DIR} && npm run install:all"
echo "  4. Run: pm2 start ecosystem.config.js"
echo "  5. Run: pm2 save && pm2 startup"
echo "============================================"
