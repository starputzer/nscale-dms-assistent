#!/bin/bash

# Simple development startup script
# Usage: ./start-dev.sh

echo "==================================="
echo "Starting nscale-assist development"
echo "==================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check if port is in use
check_port() {
    if lsof -i :$1 >/dev/null 2>&1; then
        echo -e "${RED}⚠️  Port $1 is already in use${NC}"
        lsof -i :$1 | grep LISTEN
        return 1
    fi
    return 0
}

# Check ports
echo -e "\n📍 Checking ports..."
PORT_8000_FREE=true
PORT_5173_FREE=true

if ! check_port 8000; then
    PORT_8000_FREE=false
fi

if ! check_port 5173; then
    PORT_5173_FREE=false
fi

# Kill existing servers if requested
if [ "$1" == "--kill" ]; then
    echo -e "\n🛑 Stopping existing servers..."
    pkill -f "uvicorn.*server:app" 2>/dev/null
    pkill -f "vite" 2>/dev/null
    sleep 2
    PORT_8000_FREE=true
    PORT_5173_FREE=true
fi

# Start Python backend
if [ "$PORT_8000_FREE" = true ]; then
    echo -e "\n🐍 Starting Python backend on port 8000..."
    cd /opt/nscale-assist/app
    python api/server.py > server.log 2>&1 &
    PYTHON_PID=$!
    echo "Python backend PID: $PYTHON_PID"
    
    # Wait for backend to be ready
    echo -n "Waiting for backend to start..."
    for i in {1..30}; do
        if curl -s http://localhost:8000/api/ping >/dev/null 2>&1; then
            echo -e " ${GREEN}✅ Ready!${NC}"
            break
        fi
        echo -n "."
        sleep 1
    done
else
    echo -e "${RED}❌ Cannot start Python backend - port 8000 is in use${NC}"
fi

# Start Vite frontend
if [ "$PORT_5173_FREE" = true ]; then
    echo -e "\n⚡ Starting Vite frontend on port 5173..."
    cd /opt/nscale-assist/app
    npm run dev > vite.log 2>&1 &
    VITE_PID=$!
    echo "Vite frontend PID: $VITE_PID"
    
    # Wait for frontend to be ready
    echo -n "Waiting for frontend to start..."
    for i in {1..30}; do
        if curl -s http://localhost:5173 >/dev/null 2>&1; then
            echo -e " ${GREEN}✅ Ready!${NC}"
            break
        fi
        echo -n "."
        sleep 1
    done
else
    echo -e "${RED}❌ Cannot start Vite frontend - port 5173 is in use${NC}"
fi

# Summary
echo -e "\n==================================="
echo -e "${GREEN}✨ Development servers status:${NC}"
echo -e "==================================="
echo -e "🐍 Backend:  http://localhost:8000/api"
echo -e "⚡ Frontend: http://localhost:5173"
echo -e "\n📋 Logs:"
echo -e "   Backend:  tail -f server.log"
echo -e "   Frontend: tail -f vite.log"
echo -e "\n🛑 To stop all servers:"
echo -e "   ./start-dev.sh --kill"
echo -e "==================================="