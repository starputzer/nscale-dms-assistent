#!/bin/bash

# Build-und-Serve-Script für den nscale DMS Assistenten
# --------------------------------------------------

set -e

# Farben für die Ausgabe
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}nscale DMS Assistent - Build und Serve${NC}"
echo "========================================="
echo 

# Parameter
ENV=${1:-development}
OUTPUT_DIR="dist"
PORT=${2:-4173} # Standardport für Vite Preview

# Prüfe, ob valide Umgebung angegeben wurde
if [[ "$ENV" != "development" && "$ENV" != "staging" && "$ENV" != "production" && "$ENV" != "test" ]]; then
    echo -e "${RED}Fehler: Ungültige Umgebung '$ENV'.${NC}"
    echo "Gültige Optionen: development, staging, production, test"
    exit 1
fi

# Prüfe, ob Node.js installiert ist
if ! command -v node &> /dev/null; then
    echo -e "${RED}Fehler: Node.js muss installiert sein.${NC}"
    echo "Installiere Node.js (v16+) und versuche es erneut."
    exit 1
fi

# Prüfe, ob package.json existiert
if [ ! -f "package.json" ]; then
    echo -e "${RED}Fehler: package.json nicht gefunden.${NC}"
    echo "Stelle sicher, dass du im richtigen Verzeichnis bist."
    exit 1
fi

# Prüfe, ob .env.$ENV existiert
if [ ! -f ".env.$ENV" ]; then
    echo -e "${YELLOW}Warnung: .env.$ENV nicht gefunden.${NC}"
    echo "Die Anwendung wird ohne spezifische Umgebungsvariablen gestartet."
fi

# Installiere Abhängigkeiten
echo -e "${GREEN}Installiere Abhängigkeiten...${NC}"
npm ci || npm install

# Führe Lint und TypeScript-Prüfung durch (optional in development)
if [[ "$ENV" != "development" ]]; then
    echo -e "${GREEN}Führe Lint und TypeScript-Prüfung durch...${NC}"
    npm run lint
    npm run typecheck
fi

# Erstelle Build für die angegebene Umgebung
echo -e "${GREEN}Erstelle Build für $ENV-Umgebung...${NC}"
npm run build -- --mode $ENV

# Passe Port für Preview an
if [ -n "$PORT" ]; then
    echo -e "${GREEN}Konfiguriere Server-Port: $PORT${NC}"
    export VITE_PREVIEW_PORT=$PORT
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
echo -e "${GREEN}Starte Vorschau-Server auf Port $PORT...${NC}"
echo -e "${YELLOW}Drücke STRG+C zum Beenden.${NC}"
npm run preview -- --port $PORT

echo -e "${GREEN}Fertig!${NC}"
exit 0