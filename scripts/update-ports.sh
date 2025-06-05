#!/bin/bash

# Port Standardization Script
# Standardizes all port configurations to:
# - Python backend: 8000
# - Vite frontend: 5173

echo "Port Standardization Script"
echo "=========================="
echo ""
echo "This script ensures all configuration files use standardized ports:"
echo "- Python backend: 8000 (changed from 8080)"
echo "- Vite frontend: 5173 (changed from 3000)"
echo ""

# Function to check current configuration
check_config() {
    echo "Current Configuration:"
    echo "---------------------"
    
    # Check Python config
    echo -n "Python backend port (config.py): "
    grep "PORT = int(os.getenv('PORT'," /opt/nscale-assist/app/modules/core/config.py | grep -o "[0-9]\+"
    
    # Check .env files
    echo -n "Frontend .env VITE_API_URL: "
    grep "VITE_API_URL=" /opt/nscale-assist/app/.env | cut -d'=' -f2
    
    echo -n "Frontend .env VITE_PORT: "
    grep "VITE_PORT=" /opt/nscale-assist/app/.env | cut -d'=' -f2
    
    if [ -f /opt/nscale-assist/app/.env.development ]; then
        echo -n "Frontend .env.development VITE_API_URL: "
        grep "VITE_API_URL=" /opt/nscale-assist/app/.env.development | cut -d'=' -f2
        
        echo -n "Frontend .env.development VITE_PORT: "
        grep "VITE_PORT=" /opt/nscale-assist/app/.env.development | cut -d'=' -f2
    fi
    
    # Check vite.config.ts
    echo -n "Vite config server port default: "
    grep 'parseInt(env.VITE_PORT' /opt/nscale-assist/app/vite.config.ts | grep -o '"[0-9]\+"' | tr -d '"'
    
    # Check docker-compose
    echo -n "Docker-compose backend port: "
    grep -A1 "backend:" /opt/nscale-assist/app/docker-compose.yml | grep "8000:8000" > /dev/null && echo "8000" || echo "Not 8000"
    
    echo ""
}

# Function to verify services
verify_services() {
    echo "Service Status:"
    echo "--------------"
    
    # Check if Python backend is running
    if lsof -i :8000 > /dev/null 2>&1; then
        echo "✓ Python backend is running on port 8000"
    else
        echo "✗ Python backend is NOT running on port 8000"
    fi
    
    # Check if Vite is running
    if lsof -i :5173 > /dev/null 2>&1; then
        echo "✓ Vite dev server is running on port 5173"
    else
        echo "✗ Vite dev server is NOT running on port 5173"
    fi
    
    # Check for old ports
    if lsof -i :8080 > /dev/null 2>&1; then
        echo "⚠️  WARNING: Something is still running on old port 8080"
        lsof -i :8080 | head -5
    fi
    
    if lsof -i :3000 > /dev/null 2>&1; then
        echo "⚠️  WARNING: Something is still running on old port 3000"
        lsof -i :3000 | head -5
    fi
    
    echo ""
}

# Function to start services with new ports
start_services() {
    echo "Starting Services:"
    echo "-----------------"
    
    # Kill any old services
    echo "Stopping any services on old ports..."
    lsof -ti :8080 | xargs -r kill -9 2>/dev/null
    lsof -ti :3000 | xargs -r kill -9 2>/dev/null
    
    # Start backend
    echo "Starting Python backend on port 8000..."
    cd /opt/nscale-assist/app
    export PORT=8000
    python -m api.server &
    BACKEND_PID=$!
    echo "Backend started with PID: $BACKEND_PID"
    
    # Start frontend
    echo "Starting Vite dev server on port 5173..."
    export VITE_PORT=5173
    npm run dev &
    FRONTEND_PID=$!
    echo "Frontend started with PID: $FRONTEND_PID"
    
    echo ""
    echo "Services started!"
    echo "Backend: http://localhost:8000"
    echo "Frontend: http://localhost:5173"
    echo ""
    echo "To stop services: kill $BACKEND_PID $FRONTEND_PID"
}

# Main menu
echo "Options:"
echo "1. Check current configuration"
echo "2. Verify running services"
echo "3. Start services with new ports"
echo "4. All of the above"
echo ""
read -p "Choose an option (1-4): " choice

case $choice in
    1) check_config ;;
    2) verify_services ;;
    3) start_services ;;
    4) 
        check_config
        verify_services
        read -p "Start services? (y/n): " start_choice
        if [ "$start_choice" = "y" ]; then
            start_services
        fi
        ;;
    *) echo "Invalid choice" ;;
esac