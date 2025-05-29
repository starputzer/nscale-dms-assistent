#!/bin/bash

echo "Starting production server..."

# Kill any existing servers
pkill -f "python.*server.py" 2>/dev/null
pkill -f "serve.*dist" 2>/dev/null
pkill -f "http-server.*dist" 2>/dev/null

# Start the backend server
echo "Starting backend server on port 8080..."
cd /opt/nscale-assist/app
NODE_ENV=production python api/server.py > server-prod.log 2>&1 &

# Wait for backend to start
sleep 3

# Serve the production build
echo "Serving production build on port 3000..."
npx serve dist -l 3000 -s > serve-prod.log 2>&1 &

echo "Production servers started!"
echo "Backend: http://localhost:8080"
echo "Frontend: http://localhost:3000"
echo ""
echo "Logs:"
echo "  Backend: tail -f server-prod.log"
echo "  Frontend: tail -f serve-prod.log"