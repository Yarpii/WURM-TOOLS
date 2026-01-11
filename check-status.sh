#!/bin/bash

echo "=== Next.js App Status Check ==="
echo ""

# Check if port 3000 is in use
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "✅ Port 3000: IN USE (app is running)"
    echo ""
    echo "Process details:"
    lsof -Pi :3000 -sTCP:LISTEN 2>/dev/null || echo "  (cannot show details)"
else
    echo "❌ Port 3000: FREE (app is NOT running)"
fi

echo ""
echo "=== Node.js processes ==="
ps aux | grep -E "[n]ode|[n]ext" | head -10 || echo "No Node.js processes found"

echo ""
echo "=== Quick health check ==="
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null | grep -q "200\|301\|302" ; then
    echo "✅ HTTP Response: App is responding"
else
    echo "❌ HTTP Response: App is not responding"
fi

echo ""
echo "=== Environment ==="
echo "NODE_ENV: ${NODE_ENV:-not set}"
echo "PORT: ${PORT:-not set (default 3000)}"
