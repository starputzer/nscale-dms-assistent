#!/bin/bash

# Logdatei für Vite-Server
LOGFILE="vite_server_3003.log"

# Aktuelles Verzeichnis
cd "$(dirname "$0")"

# Alte Logdatei löschen
rm -f "$LOGFILE"

echo "Starte Vite Entwicklungsserver auf Port 3003..."
echo "Logdatei: $LOGFILE"

# Vite Entwicklungsserver starten
npx vite --port 3003 --host 0.0.0.0 > "$LOGFILE" 2>&1 &

# PID speichern
PID=$!
echo "Server gestartet mit PID: $PID"
echo "Server läuft auf http://localhost:3003"
echo "Admin Panel ist unter http://localhost:3003/admin/dashboard erreichbar"
echo ""
echo "Logs anzeigen mit: tail -f $LOGFILE"
echo "Server stoppen mit: kill $PID"