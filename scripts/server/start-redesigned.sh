#!/bin/bash

echo "Starting Digitale Akte Assistent (Redesigned Version)..."

# Navigate to app directory
cd "$(dirname "$0")" || exit

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Start the development server
echo "Starting development server on http://localhost:3000/index-redesigned.html"
npx vite --host 0.0.0.0 --port 3000

# Open browser (optional)
echo "Open http://localhost:3000/index-redesigned.html in your browser"