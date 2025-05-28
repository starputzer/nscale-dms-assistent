#!/bin/bash

# Ensure admin CSS files are in the right place
echo "Copying updated admin CSS files to public directory..."
mkdir -p public/assets/styles
cp -v public/assets/styles/admin-sidebar.css public/assets/styles/admin-sidebar.css
cp -v public/assets/styles/admin-overrides.css public/assets/styles/admin-overrides.css

# Create log directory for server output
mkdir -p logs

# Start the server
echo "Starting server on port 3011..."
echo "Visit http://localhost:3011/admin in your browser to test the admin panel text fix"
echo "Server logs will be saved to logs/admin-test-server.log"

# Run the server and log output
npm run serve -- --port 3011 2>&1 | tee logs/admin-test-server.log