#!/bin/bash

# build-vite.sh
# Build-Skript für das Vite-Setup des nscale DMS Assistenten

set -e

# Farben für die Ausgabe
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}nscale DMS Assistent - Vite Build${NC}"
echo "======================================"
echo

# Prüfe, ob Node.js und npm installiert sind
if ! command -v node &> /dev/null || ! command -v npm &> /dev/null; then
    echo -e "${RED}Fehler: Node.js und npm müssen installiert sein.${NC}"
    echo "Installiere Node.js (v16+) und npm (v8+) und versuche es erneut."
    exit 1
fi

# Prüfe Node.js-Version (sollte >= 16 sein)
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

# Erstelle Verzeichnisstruktur, falls sie nicht existiert
echo -e "${GREEN}Erstelle Verzeichnisstruktur...${NC}"
mkdir -p frontend/components
mkdir -p frontend/vue
mkdir -p frontend/assets
mkdir -p frontend/types
mkdir -p scripts
echo -e "${GREEN}Verzeichnisstruktur erstellt.${NC}"

# Installiere Abhängigkeiten
echo -e "${GREEN}Installiere Abhängigkeiten...${NC}"
npm install

# Migration-Tool ausführen, falls vorhanden
if [ -f "scripts/migrate-to-vite.js" ]; then
    echo -e "${GREEN}Führe Migrations-Tool aus...${NC}"
    node scripts/migrate-to-vite.js
else
    echo -e "${YELLOW}Migrations-Tool nicht gefunden, überspringe...${NC}"
fi

# Entwicklungsmodus oder Produktions-Build?
if [ "$1" == "dev" ]; then
    echo -e "${GREEN}Starte Entwicklungsserver...${NC}"
    
    # Kopiere CSS-Dateien 
    if [ -d "frontend/css" ]; then
        echo "Kopiere CSS-Dateien nach static/css für Entwicklung..."
        mkdir -p frontend/static/css
        
        for css_file in frontend/css/*.css; do
            base_name=$(basename "$css_file")
            cp "$css_file" "frontend/static/css/$base_name"
            echo "Kopiert: $base_name"
        done
    fi
    
    # Starte Entwicklungsserver
    npm run dev
else
    # TypeScript-Prüfung
    echo -e "${GREEN}Führe TypeScript-Prüfung durch...${NC}"
    npm run check || {
        echo -e "${YELLOW}TypeScript-Prüfung fehlgeschlagen.${NC}"
        read -p "Möchtest du trotzdem fortfahren und ohne Typenprüfung bauen? (j/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Jj]$ ]]; then
            exit 1
        fi
        BUILD_CMD="npm run build:no-check"
    }

    # Build
    echo -e "${GREEN}Baue für Produktion...${NC}"
    ${BUILD_CMD:-npm run build}

    # Kopiere Ergebnis, falls erfolgreich
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Build erfolgreich!${NC}"
        
        # Backup erstellen, falls ein Verzeichnis bereits existiert
        if [ -d "api/frontend/assets" ]; then
            BACKUP_DIR="backups/frontend-$(date +%Y%m%d%H%M%S)"
            echo -e "${YELLOW}Backup der vorhandenen Assets wird erstellt in $BACKUP_DIR...${NC}"
            mkdir -p "$BACKUP_DIR"
            cp -r api/frontend/assets "$BACKUP_DIR/"
        fi

        echo -e "${GREEN}Build abgeschlossen. Verwende 'npm run preview' für eine Vorschau.${NC}"
    else
        echo -e "${RED}Build fehlgeschlagen.${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}Fertig!${NC}"
exit 0