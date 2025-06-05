#!/bin/bash
# Start script for unified endpoint structure

echo "🚀 Starting nscale-assist with unified endpoints..."

# Change to app directory
cd "$(dirname "$0")"

# Check if unified server exists
if [ ! -f "api/server_unified.py" ]; then
    echo "❌ Error: api/server_unified.py not found!"
    exit 1
fi

# Check if unified vite config exists
if [ ! -f "vite.config.unified.js" ]; then
    echo "❌ Error: vite.config.unified.js not found!"
    exit 1
fi

# Backup current configs
echo "📦 Backing up current configurations..."
cp vite.config.js vite.config.js.backup-$(date +%Y%m%d-%H%M%S) 2>/dev/null
cp api/server.py api/server.py.backup-$(date +%Y%m%d-%H%M%S) 2>/dev/null

# Use unified configs
echo "🔧 Switching to unified configurations..."
cp vite.config.unified.js vite.config.js

# Start backend server
echo "🖥️  Starting backend server..."
cd api
python server_unified.py &
BACKEND_PID=$!
cd ..

# Wait for backend to start
echo "⏳ Waiting for backend to start..."
for i in {1..30}; do
    if curl -s http://localhost:8000/api/v1/health > /dev/null; then
        echo "✅ Backend is ready!"
        break
    fi
    sleep 1
done

# Start frontend dev server
echo "🎨 Starting frontend dev server..."
npm run dev &
FRONTEND_PID=$!

echo "✅ Services started!"
echo "   Backend PID: $BACKEND_PID"
echo "   Frontend PID: $FRONTEND_PID"
echo ""
echo "📝 Access points:"
echo "   Frontend: http://localhost:5173"
echo "   Backend API: http://localhost:8000"
echo "   API Docs: http://localhost:8000/api/docs"
echo ""
echo "Press Ctrl+C to stop all services..."

# Function to cleanup on exit
cleanup() {
    echo "\n🛑 Stopping services..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "✅ Services stopped"
    exit 0
}

# Set trap to cleanup on Ctrl+C
trap cleanup INT

# Keep script running
wait