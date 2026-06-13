#!/bin/bash
# ============================================================
# DocBridge VM2 Setup Script (Database Server)
# Run as root on Ubuntu 22.04 LTS
# ============================================================

set -euo pipefail

echo "============================================"
echo "  DocBridge VM2 Setup — Database Server"
echo "============================================"

# Variables — CHANGE THESE
DB_NAME="docbridge_db"
DB_USER="docbridge_user"
DB_PASSWORD="DocBridge@2024Secure"
VM1_IP="${1:-10.0.0.4}"   # Pass VM1 IP as first argument

# Update system
echo "[1/6] Updating system packages..."
apt-get update && apt-get upgrade -y

# Install PostgreSQL 15
echo "[2/6] Installing PostgreSQL 15..."
apt-get install -y gnupg2 wget
echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list
wget -qO- https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
apt-get update
apt-get install -y postgresql-15

# Configure PostgreSQL to listen on all interfaces
echo "[3/6] Configuring PostgreSQL..."
PG_CONF="/etc/postgresql/15/main/postgresql.conf"
PG_HBA="/etc/postgresql/15/main/pg_hba.conf"

sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/" "${PG_CONF}"
sed -i "s/max_connections = 100/max_connections = 200/" "${PG_CONF}"

# Allow VM1 to connect
echo "# DocBridge VM1 access" >> "${PG_HBA}"
echo "host    ${DB_NAME}    ${DB_USER}    ${VM1_IP}/32    scram-sha-256" >> "${PG_HBA}"

# Restart PostgreSQL
systemctl restart postgresql
systemctl enable postgresql

# Create database and user
echo "[4/6] Creating database and user..."
sudo -u postgres psql <<SQL
CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';
CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
\\c ${DB_NAME}
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
SQL

echo "Database '${DB_NAME}' created with user '${DB_USER}'"

# Apply schema
echo "[5/6] Checking for schema file..."
if [ -f "/tmp/schema.sql" ]; then
    sudo -u postgres psql -d "${DB_NAME}" -f /tmp/schema.sql
    echo "Schema applied successfully!"
else
    echo "No schema.sql found at /tmp/schema.sql — apply manually later."
fi

# Configure firewall
echo "[6/6] Configuring firewall..."
apt-get install -y ufw
ufw allow ssh
ufw allow from "${VM1_IP}" to any port 5432
ufw --force enable

echo ""
echo "============================================"
echo "  VM2 Setup Complete!"
echo ""
echo "  Database: ${DB_NAME}"
echo "  User:     ${DB_USER}"
echo "  Port:     5432"
echo ""
echo "  Allowed VM1 IP: ${VM1_IP}"
echo ""
echo "  Next steps:"
echo "  1. Copy schema.sql to /tmp/ and run step 5"
echo "  2. Update VM1 .env files with DB_HOST=<this-vm-ip>"
echo "  3. Test: psql -h <this-vm-ip> -U ${DB_USER} -d ${DB_NAME}"
echo "============================================"
