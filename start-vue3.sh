#!/bin/bash

# Startskript für die Vue 3 Anwendung
# Führt npm run dev aus, um den Vite-Entwicklungsserver zu starten

echo "Starte Vue 3 Anwendung mit Vite..."
echo "Datum: $(date)"
echo "Verzeichnis: $(pwd)"

# Sicherstellen, dass die Pfade korrekt sind
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Setze die richtigen Umgebungsvariablen
export NODE_ENV=development
export VITE_API_URL=/api
export VITE_APP_VERSION=1.0.0

# Starte den Vite-Entwicklungsserver
echo "Starting Vite development server..."
npx vite

# Exitstatus prüfen
if [ $? -ne 0 ]; then
  echo "Fehler beim Starten des Vite-Servers!"
  exit 1
fi