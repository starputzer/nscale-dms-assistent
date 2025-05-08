#\!/bin/bash
# restart-dev-server.sh
# Restart-Skript für den nscale-assist Development-Server
# Erstellt: 08.05.2025

# Farben für Ausgaben
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
NC="\033[0m" # No Color

echo -e "${YELLOW}nscale-assist Development-Server Restart${NC}"
echo "------------------------------------------------"
echo "Dieses Skript startet den Development-Server neu und führt dabei"
echo "verschiedene Optimierungen durch, einschließlich MIME-Typ-Korrekturen."

# Verzeichnis-Check
if [ \! -d "/opt/nscale-assist/app" ]; then
  echo -e "${RED}Fehler: Das Verzeichnis /opt/nscale-assist/app existiert nicht.${NC}"
  exit 1
fi

# In das richtige Verzeichnis wechseln
cd /opt/nscale-assist/app || exit 1
echo -e "${GREEN}Arbeitsverzeichnis: $(pwd)${NC}"

# Vorhandene Server-Prozesse beenden
echo -e "\n${YELLOW}Stoppe laufende Server-Prozesse...${NC}"
pkill -f "uvicorn" || true
pkill -f "vite" || true
echo "Alle Server-Prozesse wurden gestoppt."

# Cache leeren - nur static-Verzeichnis, um keine wichtigen Daten zu löschen
echo -e "\n${YELLOW}Leere Frontend-Cache...${NC}"
find ./api/frontend/static -type f -not -path "*/\.git/*" -delete 2>/dev/null || true
echo "Frontend-Cache geleert."

# Falls es ein error.log gibt, sichern und neu beginnen
if [ -f "./error.log" ]; then
  mv ./error.log ./error.log.bak
  echo "Vorheriges error.log gesichert als error.log.bak"
fi

# MIME-Type-Header-Check - prüfe, ob CSS-Dateien korrekt zugeordnet sind
echo -e "\n${YELLOW}Prüfe MIME-Type-Konfiguration...${NC}"
if grep -q "def dispatch.*Content-Type.*text/css" ./api/server.py; then
  echo -e "${GREEN}✓ MIME-Type-Handling für CSS in server.py ist konfiguriert.${NC}"
else
  echo -e "${RED}⚠ MIME-Type-Handling für CSS in server.py könnte fehlen\!${NC}"
  echo "Bitte überprüfe die 'EnhancedMiddleware'-Klasse in server.py"
fi

# Vite-Plugin-Check - prüfe, ob CSS-Handling-Plugin konfiguriert ist
if grep -q "cssHandlingPlugin" ./vite.config.js; then
  echo -e "${GREEN}✓ CSS-Handling-Plugin in vite.config.js ist konfiguriert.${NC}"
else
  echo -e "${RED}⚠ CSS-Handling-Plugin in vite.config.js könnte fehlen\!${NC}"
  echo "Vite benötigt ein Plugin zur korrekten Behandlung von CSS-Importen."
fi

# CSS-Check - prüfe, ob CSS-Dateien direkt in HTML eingebunden sind
if grep -q "<link.*rel=\"stylesheet\".*href=\"/css/" ./frontend/index.html; then
  echo -e "${GREEN}✓ CSS-Dateien sind direkt in index.html eingebunden.${NC}"
else
  echo -e "${RED}⚠ CSS-Dateien könnten nicht richtig in index.html eingebunden sein\!${NC}"
  echo "CSS-Dateien sollten über <link>-Tags in index.html eingebunden werden."
fi

# Server neustarten
echo -e "\n${YELLOW}Starte API-Server...${NC}"
cd ./api || exit 1
python -m uvicorn server:app --reload --host 0.0.0.0 --port 5000 > ../api_server.log 2>&1 &
API_PID=$\!
echo -e "${GREEN}API-Server gestartet mit PID ${API_PID}${NC}"

# Zurück ins Hauptverzeichnis
cd .. || exit 1

# Vite-Server starten
echo -e "\n${YELLOW}Starte Vite-Dev-Server...${NC}"
npx vite > ./vite_server.log 2>&1 &
VITE_PID=$\!
echo -e "${GREEN}Vite-Server gestartet mit PID ${VITE_PID}${NC}"

# Warte kurz und zeige dann Statusinfo
sleep 2
echo -e "\n${GREEN}Beide Server wurden erfolgreich gestartet\!${NC}"
echo -e "API-Server läuft auf: ${YELLOW}http://localhost:5000${NC}"
echo -e "Frontend läuft auf: ${YELLOW}http://localhost:3000/frontend/${NC}"
echo -e "\nLogs werden hier gespeichert:"
echo -e "- API-Server: ${YELLOW}./api_server.log${NC}"
echo -e "- Vite-Server: ${YELLOW}./vite_server.log${NC}"

echo -e "\n${GREEN}Fertig\! Der Server ist nun bereit.${NC}"
echo -e "Beende dieses Skript mit STRG+C, um die Server zu stoppen."

# Warte auf Benutzerabbruch
wait
