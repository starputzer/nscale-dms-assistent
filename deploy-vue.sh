#!/bin/bash
# Deployskript für die Vue.js-Migration
# Erstellt ein Build und kopiert es in den static-Ordner

# Sicherstellen, dass das Skript im Projektverzeichnis ausgeführt wird
cd "$(dirname "$0")"

# Farben für Ausgaben
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== nscale DMS Assistent Vue.js-Migration Deployment ===${NC}"
echo "Erstelle Build und kopiere es in den static-Ordner"

# Überprüfen, ob das Vue.js-Projekt existiert
if [ ! -d "./vue-migration/nscale-vue-app" ]; then
    echo -e "${RED}Fehler: Vue.js-Projekt nicht gefunden in ./vue-migration/nscale-vue-app${NC}"
    exit 1
fi

# Erstellen eines Backups des static-Ordners
BACKUP_DIR="./backups/vue-$(date +%Y%m%d%H%M%S)"
echo -e "${YELLOW}Erstelle Backup des static-Ordners in ${BACKUP_DIR}${NC}"
mkdir -p "$BACKUP_DIR"
if [ -d "./static" ]; then
    cp -r ./static "$BACKUP_DIR/"
    echo -e "${GREEN}Backup erfolgreich erstellt${NC}"
else
    echo -e "${YELLOW}Kein static-Ordner vorhanden, überspringe Backup${NC}"
fi

# NPM-Build ausführen
echo -e "${YELLOW}Führe NPM-Build aus...${NC}"
cd ./vue-migration/nscale-vue-app
npm install
npm run build

# Überprüfen, ob der Build erfolgreich war
if [ $? -ne 0 ]; then
    echo -e "${RED}Fehler beim Build des Vue.js-Projekts${NC}"
    exit 1
fi

echo -e "${GREEN}Build erfolgreich erstellt${NC}"

# Zurück zum Projektverzeichnis wechseln
cd ../../

# Kopieren des Builds in den static-Ordner
echo -e "${YELLOW}Kopiere Build-Dateien in static-Ordner...${NC}"

# Einen neuen static-Ordner erstellen, wenn er nicht existiert
if [ ! -d "./static" ]; then
    mkdir -p ./static
fi

# Build-Dateien kopieren
cp -r ./vue-migration/nscale-vue-app/dist/* ./static/

echo -e "${GREEN}Build-Dateien erfolgreich in static-Ordner kopiert${NC}"

# Setze ordnungsgemäße Berechtigungen
echo -e "${YELLOW}Setze Berechtigungen...${NC}"
chmod -R 755 ./static
echo -e "${GREEN}Berechtigungen gesetzt${NC}"

# Anpassen der Server-Konfiguration (falls notwendig)
echo -e "${YELLOW}Überprüfe Server-Konfiguration...${NC}"
if [ -f "./api/server.py" ]; then
    # Implementiere hier, wenn nötig, automatische Anpassungen an server.py
    echo -e "${GREEN}Server-Konfiguration ist bereit${NC}"
else
    echo -e "${RED}Warnung: server.py nicht gefunden${NC}"
fi

echo -e "${GREEN}Vue.js-Migration wurde erfolgreich deployed!${NC}"
echo "Sie können die Anwendung jetzt mit dem folgenden Befehl starten:"
echo -e "${YELLOW}source ../venv/bin/activate && python api/server.py${NC}"

exit 0