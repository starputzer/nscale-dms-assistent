#!/bin/bash

# Rollback-Script für die Produktionsumgebung
# -----------------------------------------

set -e

# Farben für die Ausgabe
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}nscale DMS Assistent - Produktions-Rollback${NC}"
echo "================================================"
echo 

# Konfiguration
PROD_SERVER="prod-server.example.com"
PROD_PATH="/var/www/nscale-assist"
PROD_USER="deployer"
CURRENT_LINK="/var/www/nscale-assist/current"

# Sicherheitsabfrage
echo -e "${YELLOW}ACHTUNG: Du bist dabei, einen Rollback auf der PRODUKTIONSUMGEBUNG durchzuführen!${NC}"
read -p "Bist du sicher, dass du fortfahren möchtest? (j/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Jj]$ ]]; then
    echo -e "${GREEN}Rollback abgebrochen.${NC}"
    exit 0
fi

# Prüfe SSH-Verbindung zum Produktionsserver
echo -e "${GREEN}Prüfe SSH-Verbindung zum Produktionsserver...${NC}"
if ! ssh -q $PROD_USER@$PROD_SERVER exit; then
    echo -e "${RED}Fehler: Konnte keine SSH-Verbindung zum Produktionsserver herstellen.${NC}"
    echo "Bitte prüfe deine SSH-Konfiguration und Berechtigungen."
    exit 1
fi

# Hole Liste der vorhandenen Releases
echo -e "${GREEN}Hole Liste der vorhandenen Releases...${NC}"
RELEASES=$(ssh $PROD_USER@$PROD_SERVER "ls -t $PROD_PATH/releases")

# Prüfe, ob Releases existieren
if [ -z "$RELEASES" ]; then
    echo -e "${RED}Fehler: Keine Releases gefunden.${NC}"
    echo "Es scheint keine früheren Releases zu geben, auf die zurückgesetzt werden kann."
    exit 1
fi

# Zeige die letzten 5 Releases an
echo -e "${GREEN}Verfügbare Releases:${NC}"
RELEASE_ARRAY=(${RELEASES})
CURRENT=$(ssh $PROD_USER@$PROD_SERVER "readlink $CURRENT_LINK | xargs basename")

for i in {0..4}; do
    if [ $i -lt ${#RELEASE_ARRAY[@]} ]; then
        RELEASE=${RELEASE_ARRAY[$i]}
        VERSION=$(ssh $PROD_USER@$PROD_SERVER "cat $PROD_PATH/releases/$RELEASE/version.json 2>/dev/null | grep version" | cut -d\" -f4 || echo "Unbekannt")
        if [ "$RELEASE" == "$CURRENT" ]; then
            echo -e "$i: $RELEASE - Version $VERSION ${GREEN}(aktuell)${NC}"
        else
            echo "$i: $RELEASE - Version $VERSION"
        fi
    fi
done

# Frage nach dem Release für den Rollback
read -p "Welches Release möchtest du wiederherstellen? (0-4 oder 'q' zum Beenden): " SELECTION

if [[ "$SELECTION" == "q" ]]; then
    echo -e "${GREEN}Rollback abgebrochen.${NC}"
    exit 0
fi

if ! [[ "$SELECTION" =~ ^[0-4]$ ]] || [ $SELECTION -ge ${#RELEASE_ARRAY[@]} ]; then
    echo -e "${RED}Ungültige Auswahl.${NC}"
    exit 1
fi

SELECTED_RELEASE=${RELEASE_ARRAY[$SELECTION]}

# Bestätigungsabfrage
echo -e "${YELLOW}Du bist dabei, auf Release $SELECTED_RELEASE zurückzusetzen.${NC}"
read -p "Bist du sicher? (j/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Jj]$ ]]; then
    echo -e "${GREEN}Rollback abgebrochen.${NC}"
    exit 0
fi

# Führe Rollback durch
echo -e "${GREEN}Führe Rollback auf Release $SELECTED_RELEASE durch...${NC}"
ssh $PROD_USER@$PROD_SERVER "ln -sfn $PROD_PATH/releases/$SELECTED_RELEASE $CURRENT_LINK"

# Invalidiere CDN-Cache (falls vorhanden)
echo -e "${GREEN}Invalidiere CDN-Cache...${NC}"
# Hier kannst du einen API-Aufruf einfügen, um den CDN-Cache zu invalidieren
# Beispiel für AWS CloudFront:
# aws cloudfront create-invalidation --distribution-id DISTRIBUTION_ID --paths "/*"

# Prüfe, ob die Produktionsseite erreichbar ist
echo -e "${GREEN}Prüfe, ob die Anwendung erreichbar ist...${NC}"
if curl -s -f -o /dev/null "https://nscale-assist.example.com"; then
    echo -e "${GREEN}Rollback erfolgreich! Die Anwendung ist erreichbar.${NC}"
else
    echo -e "${RED}Warnung: Die Anwendung scheint nicht erreichbar zu sein. Bitte prüfe die Server-Konfiguration.${NC}"
    echo "Das Rollback wurde durchgeführt, aber die Anwendung ist nicht über die URL erreichbar."
fi

# Log Rollback in Deployment-Log
echo -e "${GREEN}Logge Rollback...${NC}"
ROLLBACK_VERSION=$(ssh $PROD_USER@$PROD_SERVER "cat $PROD_PATH/releases/$SELECTED_RELEASE/version.json 2>/dev/null | grep version" | cut -d\" -f4 || echo "Unbekannt")
ssh $PROD_USER@$PROD_SERVER "echo \"$(date): Rollback to version $ROLLBACK_VERSION (release $SELECTED_RELEASE)\" >> $PROD_PATH/deployment.log"

echo -e "${GREEN}Rollback abgeschlossen.${NC}"
echo "Die Anwendung wurde auf das Release $SELECTED_RELEASE zurückgesetzt."

echo -e "${GREEN}Fertig!${NC}"
exit 0