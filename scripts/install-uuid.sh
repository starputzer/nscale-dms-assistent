#!/bin/bash

# Farben für die Ausgabe
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verzeichnis des Projekts
PROJECT_DIR="/opt/nscale-assist/app"

# Prüfe, ob UUID-Paket bereits installiert ist
UUID_INSTALLED=false
if [ -d "$PROJECT_DIR/node_modules/uuid" ]; then
  UUID_INSTALLED=true
fi

echo -e "${GREEN}nscale DMS-Assistent - UUID-Paket Installationshelfer${NC}"
echo -e "======================================================"
echo ""

# 1. Backup der package.json erstellen
echo -e "${YELLOW}1. Erstelle Backup der package.json...${NC}"
if [ -f "$PROJECT_DIR/package.json" ]; then
  cp "$PROJECT_DIR/package.json" "$PROJECT_DIR/package.json.bak"
  echo "Backup erstellt: $PROJECT_DIR/package.json.bak"
else
  echo -e "${RED}Fehler: package.json nicht gefunden in $PROJECT_DIR${NC}"
  exit 1
fi

# 2. Installiere uuid und @types/uuid, wenn nicht vorhanden
echo -e "${YELLOW}2. Installiere erforderliche Pakete...${NC}"
# Wechsle ins Projektverzeichnis
cd "$PROJECT_DIR"

# Installiere uuid, wenn nicht vorhanden
if [ "$UUID_INSTALLED" = false ]; then
  echo "Installiere uuid Paket..."
  npm install uuid@9.0.1
else
  echo "uuid Paket bereits installiert."
fi

# Installiere @types/uuid, wenn nicht vorhanden
if [ ! -d "$PROJECT_DIR/node_modules/@types/uuid" ]; then
  echo "Installiere @types/uuid Paket..."
  npm install --save-dev @types/uuid
else
  echo "@types/uuid Paket bereits installiert."
fi

# 3. Lösche Caches, wenn vorhanden
echo -e "${YELLOW}3. Lösche Build-Caches...${NC}"
if [ -d "$PROJECT_DIR/node_modules/.vite" ]; then
  rm -rf "$PROJECT_DIR/node_modules/.vite"
  echo "Vite-Cache gelöscht."
fi

# 4. Überprüfe, ob die Installation erfolgreich war
echo -e "${YELLOW}4. Überprüfe Installation...${NC}"
if [ -d "$PROJECT_DIR/node_modules/uuid" ] && [ -d "$PROJECT_DIR/node_modules/@types/uuid" ]; then
  echo -e "${GREEN}UUID-Pakete erfolgreich installiert!${NC}"
else
  echo -e "${RED}Installation möglicherweise unvollständig. Bitte überprüfen Sie die Fehlermeldungen.${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}Installation abgeschlossen.${NC}"
echo -e "${YELLOW}Tipps zur Verwendung:${NC}"
echo "1. In TypeScript-Dateien können Sie uuid jetzt so importieren:"
echo "   import { v4 as uuidv4 } from 'uuid';"
echo ""
echo "2. Wenn Sie weiterhin Probleme haben, versuchen Sie folgende Schritte:"
echo "   - Neustart des Entwicklungsservers: npm run dev"
echo "   - Löschen des node_modules Verzeichnisses und npm install"
echo ""
echo -e "${GREEN}Viel Erfolg bei der Entwicklung!${NC}"