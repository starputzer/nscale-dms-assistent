#!/bin/bash

echo "Checking which version is currently running..."

# Check if Vite dev server is running
if pgrep -f "vite" > /dev/null; then
    echo "✓ Vite development server is running"
    
    # Check which HTML file is being served
    if ps aux | grep -v grep | grep -q "index-redesigned.html"; then
        echo "→ Serving REDESIGNED version (with theme system)"
    else
        echo "→ Serving ORIGINAL version (without theme system)"
    fi
else
    echo "✗ Vite development server is not running"
fi

echo ""
echo "To start the redesigned version with theme system:"
echo "  ./start-redesigned.sh"
echo ""
echo "Then access it at:"
echo "  http://localhost:3000/index-redesigned.html"
echo ""
echo "To switch between themes:"
echo "  1. Click the settings button in the sidebar"
echo "  2. Use the theme selector to choose Light, Dark, or High Contrast"