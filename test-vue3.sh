#!/bin/bash

# Test-Skript für die Vue 3 Migration
# Startet einen Vite-Entwicklungsserver und öffnet die Anwendung im Browser

echo "=== nscale DMS Assistant - Vue 3 Test ==="
echo "Starte Vite-Entwicklungsserver..."

# Ins App-Verzeichnis wechseln
cd /opt/nscale-assist/app

# Vite-Server starten
npm run dev -- --port 3000 --open

# Falls der Befehl nicht existiert, alternativer Versuch
if [ $? -ne 0 ]; then
  echo "Alternativer Start-Versuch mit npx..."
  npx vite --port 3000 --open
fi

echo "Server wird beendet..."