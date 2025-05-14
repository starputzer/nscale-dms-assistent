#!/bin/bash

# Logdatei für Vite-Server
LOGFILE="vite_server_3001.log"

# Aktuelles Verzeichnis
cd "$(dirname "$0")"

# Alte Logdatei löschen
rm -f "$LOGFILE"

echo "Starte Vite Entwicklungsserver auf Port 3001..."
echo "Logdatei: $LOGFILE"

# Vite Entwicklungsserver starten
npx vite --port 3001 --host 0.0.0.0 > "$LOGFILE" 2>&1 &

# PID speichern
PID=$!
echo "Server gestartet mit PID: $PID"
echo "Server läuft auf http://localhost:3001"
echo "Vue3-Version ist unter http://localhost:3001/index-vue3.html erreichbar"
echo ""
echo "Logs anzeigen mit: tail -f $LOGFILE"
echo "Server stoppen mit: kill $PID"