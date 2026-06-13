#!/bin/bash
# ============================================================
# DocBridge Deploy Script — Run on VM1
# Deploys/updates the application code
# ============================================================

set -euo pipefail

APP_DIR="/opt/docbridge"
BACKUP_DIR="/opt/docbridge-backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "============================================"
echo "  DocBridge Deployment — ${TIMESTAMP}"
echo "============================================"

# Create backup
echo "[1/5] Creating backup..."
mkdir -p "${BACKUP_DIR}"
if [ -d "${APP_DIR}/gateway" ]; then
    tar czf "${BACKUP_DIR}/backup_${TIMESTAMP}.tar.gz" \
        --exclude='node_modules' \
        --exclude='logs' \
        --exclude='.env' \
        -C "${APP_DIR}" .
    echo "Backup created: ${BACKUP_DIR}/backup_${TIMESTAMP}.tar.gz"
fi

# Install dependencies for all services
echo "[2/5] Installing dependencies..."
cd "${APP_DIR}"

# Gateway
echo "  → Gateway..."
cd "${APP_DIR}/gateway" && npm install --production

# Services
for svc in auth-service consultation-service prescription-service reminder-service labreport-service symptom-service ai-companion-service health-summary-service family-service; do
    echo "  → ${svc}..."
    cd "${APP_DIR}/services/${svc}" && npm install --production
done

# Frontend build
echo "[3/5] Building frontend..."
cd "${APP_DIR}/frontend"
npm install
npm run build

# Run database migrations
echo "[4/5] Running database migrations..."
cd "${APP_DIR}/database"
npx sequelize-cli db:migrate --env production || echo "⚠ Migrations may need manual review"

# Restart PM2
echo "[5/5] Restarting services with PM2..."
cd "${APP_DIR}"
pm2 restart ecosystem.config.js || pm2 start ecosystem.config.js
pm2 save

echo ""
echo "============================================"
echo "  Deployment Complete!"
echo "  Time: $(date)"
echo "  Status: pm2 status"
echo "  Logs: pm2 logs"
echo "============================================"
