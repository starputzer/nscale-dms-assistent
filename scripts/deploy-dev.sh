#!/bin/bash

# Deploy-Script für die Development-Umgebung
# -------------------------------------------

set -e

# Farben für die Ausgabe
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}nscale DMS Assistent - Development Deployment${NC}"
echo "================================================="
echo 

# Konfiguration
ENV="development"
OUTPUT_DIR="dist"
BACKUP_DIR="backups/dev-$(date +%Y%m%d%H%M%S)"

# Prüfe, ob Node.js installiert ist
if ! command -v node &> /dev/null; then
    echo -e "${RED}Fehler: Node.js muss installiert sein.${NC}"
    echo "Installiere Node.js (v16+) und versuche es erneut."
    exit 1
fi

# Prüfe Node-Version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo -e "${YELLOW}Warnung: Node.js-Version ist veraltet (v$(node -v)).${NC}"
    echo "Es wird mindestens Node.js v16 empfohlen."
    read -p "Trotzdem fortfahren? (j/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Jj]$ ]]; then
        exit 1
    fi
fi

# Prüfe, ob package.json existiert
if [ ! -f "package.json" ]; then
    echo -e "${RED}Fehler: package.json nicht gefunden.${NC}"
    echo "Stelle sicher, dass du im richtigen Verzeichnis bist."
    exit 1
fi

# Stelle sicher, dass .env.development existiert
if [ ! -f ".env.development" ]; then
    echo -e "${RED}Fehler: .env.development nicht gefunden.${NC}"
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

# Erstelle Dev-Build
echo -e "${GREEN}Erstelle Dev-Build...${NC}"
npm run build -- --mode development

# Erstelle ein Backup des aktuellen Deployments, falls vorhanden
if [ -d "$OUTPUT_DIR" ]; then
    echo -e "${YELLOW}Erstelle Backup des vorhandenen Deployments...${NC}"
    mkdir -p "$BACKUP_DIR"
    cp -r "$OUTPUT_DIR" "$BACKUP_DIR/"
fi

# Kopiere die Konfiguration, falls separate Config-Datei existiert
if [ -f "config/dev-config.js" ]; then
    echo -e "${GREEN}Kopiere Konfiguration...${NC}"
    cp "config/dev-config.js" "$OUTPUT_DIR/js/config.js"
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

# Starte lokalen Server für die Vorschau
echo -e "${GREEN}Deployment abgeschlossen. Starte Vorschau-Server...${NC}"
npm run preview

echo -e "${GREEN}Fertig!${NC}"
exit 0