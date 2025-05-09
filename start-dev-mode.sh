#!/bin/bash

# nscale DMS Assistant - Development Mode Starter Script
# This script starts the application in development mode with all debugging tools enabled

echo "Starting nscale DMS Assistant in Development Mode..."

# 1. Ensure feature toggles are properly set in localStorage
if [ -d "$HOME/.config/chromium" ]; then
  echo "Setting up development environment in local storage..."
  # This is a placeholder - in reality, you would need to use a tool like sqlite3
  # to modify the localStorage in the browser's storage database
fi

# 2. Create symlinks to our development files
echo "Creating symbolic links for development files..."
ln -sf frontend/index-dev.html index.html 2>/dev/null

# 3. Set environment variables for development
export NODE_ENV=development
export VITE_DEV_MODE=true

# 4. Start the development server with debugging enabled
echo "Starting Vite development server..."
npm run dev

# If the server exits, restore the original index.html
echo "Restoring original configuration..."
if [ -f "frontend/index.html" ]; then
  ln -sf frontend/index.html index.html 2>/dev/null
fi

echo "Development server stopped."