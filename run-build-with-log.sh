#!/bin/bash

# Verzeichnis sicherstellen
cd /opt/nscale-assist/app

# Build ausführen und Ausgabe in Logdatei umleiten
echo "Running npm run build..."
npm run build > build-log.txt 2>&1

# Exit-Code speichern
BUILD_RESULT=$?

# Prüfen, ob der Build erfolgreich war
if [ $BUILD_RESULT -eq 0 ]; then
  echo "Build erfolgreich abgeschlossen. Log in build-log.txt"
else
  echo "Build fehlgeschlagen. Fehler in build-log.txt"
fi

# Exit mit dem gleichen Code wie der Build
exit $BUILD_RESULT