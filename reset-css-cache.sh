#!/bin/bash

# Reset CSS-Cache Script für nscale DMS Assistent
# Dieses Skript erzwingt ein Neu-Laden der CSS-Dateien durch Manipulation der Datei-Zeitstempel

echo "CSS-Cache zurücksetzen für nscale DMS Assistent..."

# Generiere einen neuen Cache-Busting-Timestamp
TIMESTAMP=$(date +%Y%m%d%H%M%S)

# Setze neuen Zeitstempel für alle CSS-Dateien
find /opt/nscale-assist/app/frontend/css/ -name "*.css" -exec touch {} \;
find /opt/nscale-assist/app/public/css/ -name "*.css" -exec touch {} \;
find /opt/nscale-assist/app/api/frontend/css/ -name "*.css" -exec touch {} \;

echo "CSS-Dateien mit neuem Zeitstempel versehen."

# Aktualisiere Cache-Busting-Parameter in HTML-Dateien
if [[ -f /opt/nscale-assist/app/frontend/index.html ]]; then
  sed -i "s/v=[0-9]\{8\}/v=$TIMESTAMP/g" /opt/nscale-assist/app/frontend/index.html
  echo "Cache-Busting-Parameter in index.html aktualisiert."
fi

if [[ -f /opt/nscale-assist/app/frontend/admin-direct.html ]]; then
  sed -i "s/v=[0-9]\{8\}/v=$TIMESTAMP/g" /opt/nscale-assist/app/frontend/admin-direct.html
  echo "Cache-Busting-Parameter in admin-direct.html aktualisiert."
fi

# Server neu starten
echo "Neustart der Server-Prozesse..."
if [[ -f /opt/nscale-assist/app/restart-dev-server.sh ]]; then
  bash /opt/nscale-assist/app/restart-dev-server.sh
else
  # Fallback für den Fall, dass kein Restart-Skript existiert
  pkill -f "python.*server.py" || true
  cd /opt/nscale-assist/app && python api/server.py &
  echo "Server neu gestartet."
fi

echo "CSS-Cache erfolgreich zurückgesetzt und Server neu gestartet!"
echo "Bitte leeren Sie auch den Browser-Cache oder öffnen Sie die Anwendung im Inkognito-Modus."