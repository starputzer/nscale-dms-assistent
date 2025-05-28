#!/bin/bash

# Ensure admin CSS files are in the right place
echo "Copying updated admin CSS files to public directory..."
cp -v src/assets/styles/admin-consolidated.scss public/assets/styles/admin-consolidated.css
cp -v public/assets/styles/admin-sidebar.css public/assets/styles/admin-sidebar.css

# Start the server
echo "Starting server on port 3007..."
echo "Visit http://localhost:3007/admin in your browser to test the admin panel"
npm run serve -- --port 3007