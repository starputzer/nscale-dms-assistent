#!/bin/bash

echo "Stopping all servers..."

# Kill Python server
pkill -f "python api/server.py" || true

# Kill npm/node processes
pkill -f "npm exec serve" || true

# Wait a moment
sleep 2

echo "Starting backend server..."
cd /opt/nscale-assist/app
source ../venv/bin/activate
python api/server.py &

# Wait for backend to start
sleep 3

echo "Starting frontend server..."
npm run dev &

echo ""
echo "All servers restarted!"
echo ""
echo "Backend running on: http://localhost:8080"
echo "Frontend running on: http://localhost:5173"
echo ""
echo "Open http://localhost:5173 in your browser"