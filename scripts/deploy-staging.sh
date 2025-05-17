#!/bin/bash

# Deploy-Script für die Staging-Umgebung
# -------------------------------------------

set -e

# Farben für die Ausgabe
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}nscale DMS Assistent - Staging Deployment${NC}"
echo "==============================================="
echo 

# Konfiguration
ENV="staging"
OUTPUT_DIR="dist"
BACKUP_DIR="backups/staging-$(date +%Y%m%d%H%M%S)"
STAGING_SERVER="staging-server.example.com"
STAGING_PATH="/var/www/staging-nscale-assist"
STAGING_USER="deployer"

# Prüfe, ob Node.js installiert ist
if ! command -v node &> /dev/null; then
    echo -e "${RED}Fehler: Node.js muss installiert sein.${NC}"
    echo "Installiere Node.js (v16+) und versuche es erneut."
    exit 1
fi

# Prüfe SSH-Verbindung zum Staging-Server
echo -e "${GREEN}Prüfe SSH-Verbindung zum Staging-Server...${NC}"
if ! ssh -q $STAGING_USER@$STAGING_SERVER exit; then
    echo -e "${RED}Fehler: Konnte keine SSH-Verbindung zum Staging-Server herstellen.${NC}"
    echo "Bitte prüfe deine SSH-Konfiguration und Berechtigungen."
    exit 1
fi

# Prüfe, ob package.json existiert
if [ ! -f "package.json" ]; then
    echo -e "${RED}Fehler: package.json nicht gefunden.${NC}"
    echo "Stelle sicher, dass du im richtigen Verzeichnis bist."
    exit 1
fi

# Stelle sicher, dass .env.staging existiert
if [ ! -f ".env.staging" ]; then
    echo -e "${RED}Fehler: .env.staging nicht gefunden.${NC}"
    echo "Bitte erstelle die Datei und versuche es erneut."
    exit 1
fi

# Installiere Abhängigkeiten
echo -e "${GREEN}Installiere Abhängigkeiten...${NC}"
npm ci || npm install

# Führe Lint und TypeScript-Prüfung durch
echo -e "${GREEN}Führe Lint und TypeScript-Prüfung durch...${NC}"
npm run lint
npm run typecheck

# Führe Tests aus
echo -e "${GREEN}Führe Tests aus...${NC}"
npm run test

# Erstelle Staging-Build
echo -e "${GREEN}Erstelle Staging-Build...${NC}"
npm run build -- --mode staging

# Erstelle ein Backup des aktuellen Deployments auf dem Staging-Server
echo -e "${GREEN}Erstelle Backup auf dem Staging-Server...${NC}"
ssh $STAGING_USER@$STAGING_SERVER "mkdir -p ${STAGING_PATH}_backup && cp -r $STAGING_PATH/* ${STAGING_PATH}_backup/ || true"

# Kopiere die Konfiguration für Staging, falls separate Config-Datei existiert
if [ -f "config/staging-config.js" ]; then
    echo -e "${GREEN}Kopiere Konfiguration...${NC}"
    cp "config/staging-config.js" "$OUTPUT_DIR/js/config.js"
fi

# Erstelle Versionsinfo-Datei
echo -e "${GREEN}Erstelle Versionsinfo...${NC}"
VERSION=$(node -p "require('./package.json').version")
BUILD_DATE=$(date +"%Y-%m-%d %H:%M:%S")

cat > "$OUTPUT_DIR/version.json" << EOF
{
  "version": "$VERSION",
  "environment": "$ENV",
  "buildDate": "$BUILD_DATE",
  "nodeVersion": "$(node -v)",
  "npmVersion": "$(npm -v)"
}
EOF

# Kopiere die Build-Dateien auf den Staging-Server
echo -e "${GREEN}Kopiere Dateien auf den Staging-Server...${NC}"
rsync -avz --delete $OUTPUT_DIR/ $STAGING_USER@$STAGING_SERVER:$STAGING_PATH/

# Setze Berechtigungen auf dem Staging-Server
echo -e "${GREEN}Setze Berechtigungen auf dem Staging-Server...${NC}"
ssh $STAGING_USER@$STAGING_SERVER "chmod -R 755 $STAGING_PATH && find $STAGING_PATH -type f -exec chmod 644 {} \;"

# Aktualisiere Symlinks, falls nötig
echo -e "${GREEN}Aktualisiere Symlinks auf dem Staging-Server...${NC}"
ssh $STAGING_USER@$STAGING_SERVER "ln -sfn $STAGING_PATH /var/www/staging-nscale-assist-latest"

# Prüfe, ob der Staging-Server erreichbar ist
echo -e "${GREEN}Prüfe, ob die Anwendung erreichbar ist...${NC}"
if curl -s -f -o /dev/null "https://staging.nscale-assist.example.com"; then
    echo -e "${GREEN}Staging-Deployment erfolgreich! Die Anwendung ist erreichbar.${NC}"
else
    echo -e "${YELLOW}Warnung: Die Anwendung scheint nicht erreichbar zu sein. Bitte prüfe die Server-Konfiguration.${NC}"
fi

echo -e "${GREEN}Staging-Deployment abgeschlossen.${NC}"
echo "Die Anwendung ist jetzt unter https://staging.nscale-assist.example.com verfügbar."

echo -e "${GREEN}Fertig!${NC}"
exit 0