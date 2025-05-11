#!/bin/bash

# Deploy-Script für die Produktionsumgebung
# ----------------------------------------

set -e

# Farben für die Ausgabe
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}nscale DMS Assistent - Produktions-Deployment${NC}"
echo "=================================================="
echo 

# Konfiguration
ENV="production"
OUTPUT_DIR="dist"
BACKUP_DIR="backups/prod-$(date +%Y%m%d%H%M%S)"
PROD_SERVER="prod-server.example.com"
PROD_PATH="/var/www/nscale-assist"
PROD_USER="deployer"
RELEASE_PATH="/var/www/nscale-assist/releases/$(date +%Y%m%d%H%M%S)"
CURRENT_LINK="/var/www/nscale-assist/current"

# Sicherheitsabfrage
echo -e "${YELLOW}ACHTUNG: Du bist dabei, auf die PRODUKTIONSUMGEBUNG zu deployen!${NC}"
read -p "Bist du sicher, dass du fortfahren möchtest? (j/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Jj]$ ]]; then
    echo -e "${GREEN}Deployment abgebrochen.${NC}"
    exit 0
fi

# Prüfe, ob Branch master oder main ist
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$CURRENT_BRANCH" != "main" && "$CURRENT_BRANCH" != "master" ]]; then
    echo -e "${RED}Fehler: Du musst auf dem 'main' oder 'master' Branch sein, um auf Produktion zu deployen.${NC}"
    echo "Aktueller Branch: $CURRENT_BRANCH"
    exit 1
fi

# Prüfe, ob es ausstehende Commits gibt
if [[ -n $(git status -s) ]]; then
    echo -e "${RED}Fehler: Es gibt ungespeicherte Änderungen im Repository.${NC}"
    echo "Bitte commit oder stash deine Änderungen vor dem Deployment."
    exit 1
fi

# Prüfe, ob alle Tests bestanden wurden
echo -e "${GREEN}Führe Tests aus...${NC}"
if ! npm run test; then
    echo -e "${RED}Fehler: Tests sind fehlgeschlagen.${NC}"
    echo "Bitte behebe die Fehler vor dem Deployment."
    exit 1
fi

# Stelle sicher, dass .env.production existiert
if [ ! -f ".env.production" ]; then
    echo -e "${RED}Fehler: .env.production nicht gefunden.${NC}"
    echo "Bitte erstelle die Datei und versuche es erneut."
    exit 1
fi

# Installiere Abhängigkeiten für Produktion
echo -e "${GREEN}Installiere Abhängigkeiten für Produktion...${NC}"
npm ci --production || npm install --production

# Führe Lint und TypeScript-Prüfung durch
echo -e "${GREEN}Führe Lint und TypeScript-Prüfung durch...${NC}"
npm run lint
npm run typecheck

# Erstelle Produktions-Build
echo -e "${GREEN}Erstelle Produktions-Build...${NC}"
npm run build -- --mode production

# Prüfe Build-Erfolg
if [ ! -d "$OUTPUT_DIR" ]; then
    echo -e "${RED}Fehler: Build fehlgeschlagen.${NC}"
    echo "Das Output-Verzeichnis '$OUTPUT_DIR' wurde nicht erstellt."
    exit 1
fi

# Prüfe SSH-Verbindung zum Produktionsserver
echo -e "${GREEN}Prüfe SSH-Verbindung zum Produktionsserver...${NC}"
if ! ssh -q $PROD_USER@$PROD_SERVER exit; then
    echo -e "${RED}Fehler: Konnte keine SSH-Verbindung zum Produktionsserver herstellen.${NC}"
    echo "Bitte prüfe deine SSH-Konfiguration und Berechtigungen."
    exit 1
fi

# Erstelle Versionsinfo-Datei
echo -e "${GREEN}Erstelle Versionsinfo...${NC}"
VERSION=$(node -p "require('./package.json').version")
BUILD_DATE=$(date +"%Y-%m-%d %H:%M:%S")
GIT_COMMIT=$(git rev-parse HEAD)
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

cat > "$OUTPUT_DIR/version.json" << EOF
{
  "version": "$VERSION",
  "environment": "$ENV",
  "buildDate": "$BUILD_DATE",
  "gitCommit": "$GIT_COMMIT",
  "gitBranch": "$GIT_BRANCH",
  "nodeVersion": "$(node -v)",
  "npmVersion": "$(npm -v)"
}
EOF

# Erstelle Release-Verzeichnis auf dem Produktionsserver
echo -e "${GREEN}Erstelle Release-Verzeichnis auf dem Produktionsserver...${NC}"
ssh $PROD_USER@$PROD_SERVER "mkdir -p $RELEASE_PATH"

# Kopiere die Build-Dateien auf den Produktionsserver
echo -e "${GREEN}Kopiere Dateien auf den Produktionsserver...${NC}"
rsync -avz --delete $OUTPUT_DIR/ $PROD_USER@$PROD_SERVER:$RELEASE_PATH/

# Setze Berechtigungen auf dem Produktionsserver
echo -e "${GREEN}Setze Berechtigungen auf dem Produktionsserver...${NC}"
ssh $PROD_USER@$PROD_SERVER "chmod -R 755 $RELEASE_PATH && find $RELEASE_PATH -type f -exec chmod 644 {} \;"

# Aktualisiere Symlink für das aktuelle Release
echo -e "${GREEN}Aktualisiere Symlink für das aktuelle Release...${NC}"
ssh $PROD_USER@$PROD_SERVER "ln -sfn $RELEASE_PATH $CURRENT_LINK"

# Führe Bereinigung alter Releases durch (behalte die letzten 5)
echo -e "${GREEN}Bereinige alte Releases...${NC}"
ssh $PROD_USER@$PROD_SERVER "cd $PROD_PATH/releases && ls -t | tail -n +6 | xargs rm -rf"

# Invalidiere CDN-Cache (falls vorhanden)
echo -e "${GREEN}Invalidiere CDN-Cache...${NC}"
# Hier kannst du einen API-Aufruf einfügen, um den CDN-Cache zu invalidieren
# Beispiel für AWS CloudFront:
# aws cloudfront create-invalidation --distribution-id DISTRIBUTION_ID --paths "/*"

# Prüfe, ob die Produktionsseite erreichbar ist
echo -e "${GREEN}Prüfe, ob die Anwendung erreichbar ist...${NC}"
if curl -s -f -o /dev/null "https://nscale-assist.example.com"; then
    echo -e "${GREEN}Produktions-Deployment erfolgreich! Die Anwendung ist erreichbar.${NC}"
else
    echo -e "${RED}Warnung: Die Anwendung scheint nicht erreichbar zu sein. Bitte prüfe die Server-Konfiguration.${NC}"
    echo "Das Deployment wurde durchgeführt, aber die Anwendung ist nicht über die URL erreichbar."
fi

# Log Deployment in Deployment-Log
echo -e "${GREEN}Logge Deployment...${NC}"
ssh $PROD_USER@$PROD_SERVER "echo \"$(date): Deployed version $VERSION (commit $GIT_COMMIT)\" >> $PROD_PATH/deployment.log"

echo -e "${GREEN}Produktions-Deployment abgeschlossen.${NC}"
echo "Die Anwendung ist jetzt unter https://nscale-assist.example.com verfügbar."

echo -e "${GREEN}Fertig!${NC}"
exit 0