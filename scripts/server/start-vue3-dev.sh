#!/bin/bash

# Logdatei für Vite-Server
LOGFILE="vite_server.log"

# Aktuelles Verzeichnis
cd "$(dirname "$0")"

# Alte Logdatei löschen
rm -f "$LOGFILE"

echo "Starte Vite Entwicklungsserver..."
echo "Logdatei: $LOGFILE"

# Vite Entwicklungsserver starten
npx vite --port 3000 --host 0.0.0.0 > "$LOGFILE" 2>&1 &

# PID speichern
PID=$!
echo "Server gestartet mit PID: $PID"
echo "Server läuft auf http://localhost:3000"
echo "Vue3-Version ist unter http://localhost:3000/index-vue3.html erreichbar"
echo ""
echo "Logs anzeigen mit: tail -f $LOGFILE"
echo "Server stoppen mit: kill $PID"