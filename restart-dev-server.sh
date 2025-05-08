#!/bin/bash

# Skript zum Neustarten des Vite-Entwicklungsservers

echo "Stoppe laufende Vite-Prozesse..."
pkill -f "vite" || echo "Keine Vite-Prozesse gefunden"

echo "Stoppe laufende Python-Server-Prozesse..."
pkill -f "python -m api.server" || echo "Keine Python-Server-Prozesse gefunden"

echo "Warte 2 Sekunden..."
sleep 2

# Starte Vite in einem neuen Terminal
echo "Starte Vite-Entwicklungsserver im Hintergrund..."
cd /opt/nscale-assist/app
npx vite serve &

echo "Warte 3 Sekunden, bis Vite gestartet ist..."
sleep 3

echo "Starte Python-API-Server im Hintergrund..."
python -m api.server &

echo "Warte 2 Sekunden, bis API-Server gestartet ist..."
sleep 2

echo "========================================"
echo "Server sollten jetzt laufen. Zugriff über:"
echo "- Frontend: http://localhost:3000/"
echo "- API: http://localhost:5000/api/"
echo "- Frontend über API-Route: http://localhost:5000/frontend/"
echo "========================================"
echo "Drücke CTRL+C, um die Server zu beenden"

# Warte bis der Benutzer CTRL+C drückt
wait