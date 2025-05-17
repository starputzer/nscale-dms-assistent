#!/bin/bash

# Farben für bessere Lesbarkeit
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}nscale-assist Admin Panel (Direkt)${NC}"
echo "------------------------------------------------"
echo -e "Dieser Befehl öffnet eine direkte Implementierung des Admin-Panels"
echo -e "ohne Abhängigkeit von Feature-Toggles."
echo -e "${GREEN}Arbeitsverzeichnis: ${PWD}${NC}"
echo ""

# Check if a web browser is available
if command -v xdg-open &> /dev/null; then
    BROWSER="xdg-open"
elif command -v open &> /dev/null; then
    BROWSER="open"
elif command -v start &> /dev/null; then
    BROWSER="start"
else
    echo -e "${RED}Kein Web-Browser-Befehl gefunden. Bitte öffnen Sie die URL manuell.${NC}"
    echo -e "URL: ${BLUE}http://localhost:3000/frontend/admin-direct.html${NC}"
    exit 1
fi

# Start the browser
echo -e "${YELLOW}Öffne Admin Panel in Browser...${NC}"
$BROWSER http://localhost:3000/frontend/admin-direct.html

echo -e "${GREEN}Fertig! Admin Panel wurde im Browser geöffnet.${NC}"
echo "Wenn das Panel nicht geladen wird, stellen Sie sicher, dass der Dev-Server läuft."
echo "Führen Sie './restart-dev-server.sh' aus, falls nötig."