#!/bin/bash

# Aktuelles Verzeichnis
cd "$(dirname "$0")"

# Farben definieren
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Express-Server starten
echo -e "${GREEN}Starte Express-Server für Vue 3 App...${NC}"
node serve-vue3.js &

# PID speichern
PID=$!
echo -e "${GREEN}Server gestartet mit PID: ${YELLOW}$PID${NC}"
echo -e "${GREEN}App ist erreichbar unter: ${YELLOW}http://localhost:3000${NC}"
echo -e "${GREEN}Server stoppen mit: ${YELLOW}kill $PID${NC}"

# PID in Datei speichern
echo $PID > .vue3_server_pid

# Warten, bis Benutzer abbricht
echo -e "${GREEN}Drücke Ctrl+C um zu beenden...${NC}"
wait $PID