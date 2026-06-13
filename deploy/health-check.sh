#!/bin/bash
# ============================================================
# DocBridge Health Check Script
# Checks all services are running
# ============================================================

GATEWAY_URL="${GATEWAY_URL:-http://localhost:3000}"
SERVICES=(
  "auth-service:3001"
  "consultation-service:3002"
  "prescription-service:3003"
  "reminder-service:3004"
  "labreport-service:3005"
  "symptom-service:3006"
  "ai-companion-service:3007"
  "health-summary-service:3008"
  "family-service:3009"
)

echo "============================================"
echo "  DocBridge Health Check"
echo "  $(date)"
echo "============================================"
echo ""

# Check gateway
echo -n "API Gateway (3000): "
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "${GATEWAY_URL}/health" 2>/dev/null || echo "000")
if [ "${RESPONSE}" == "200" ]; then
    echo "✅ Healthy"
else
    echo "❌ Down (HTTP ${RESPONSE})"
fi

# Check each service
for SVC in "${SERVICES[@]}"; do
    NAME="${SVC%%:*}"
    PORT="${SVC##*:}"
    echo -n "${NAME} (${PORT}): "
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PORT}/health" 2>/dev/null || echo "000")
    if [ "${RESPONSE}" == "200" ]; then
        echo "✅ Healthy"
    else
        echo "❌ Down (HTTP ${RESPONSE})"
    fi
done

echo ""

# PM2 status
echo "PM2 Process Status:"
pm2 jlist 2>/dev/null | python3 -c "
import sys, json
try:
    procs = json.load(sys.stdin)
    for p in procs:
        status = p.get('pm2_env', {}).get('status', 'unknown')
        name = p.get('name', 'unknown')
        cpu = p.get('monit', {}).get('cpu', 0)
        mem = round(p.get('monit', {}).get('memory', 0) / 1024 / 1024, 1)
        icon = '✅' if status == 'online' else '❌'
        print(f'  {icon} {name}: {status} (CPU: {cpu}%, MEM: {mem}MB)')
except:
    print('  Could not parse PM2 status')
" 2>/dev/null || pm2 status

echo ""
echo "============================================"
