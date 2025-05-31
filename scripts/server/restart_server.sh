#!/bin/bash
# Script to restart the server

echo "Stopping existing server process..."
pkill -f "python.*api/server.py" || echo "No server process found"

echo "Waiting for the server to stop..."
sleep 2

echo "Starting the server..."
cd /opt/nscale-assist/worktrees/admin-improvements
nohup python api/server.py > server.log 2>&1 &

echo "Server restarted! Check server.log for details."
echo "Process ID: $(pgrep -f 'python.*api/server.py')"