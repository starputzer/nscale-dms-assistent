#!/bin/bash

# Farbdefinitionen für bessere Lesbarkeit
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Konfigurierbare Variablen
REPO_URL="https://github.com/starputzer/nscale-dms-assistent"
BRANCH="doc-converter"
TEMP_DIR=$(mktemp -d)
TARGET_FOLDER="doc_converter"
CURRENT_DIR=$(pwd)

echo -e "${BLUE}=== nscale DMS Assistent - Python Datei-Wiederherstellung ===${NC}"
echo -e "${BLUE}=== $(date) ===${NC}"
echo -e "${YELLOW}Repository:${NC} $REPO_URL"
echo -e "${YELLOW}Branch:${NC} $BRANCH"
echo -e "${YELLOW}Temporäres Verzeichnis:${NC} $TEMP_DIR"
echo -e "${YELLOW}Aktuelles Verzeichnis:${NC} $CURRENT_DIR"
echo

# Funktion zur Fehlerbehandlung und Aufräumen
cleanup() {
    echo -e "\n${YELLOW}Räume temporäres Verzeichnis auf...${NC}"
    rm -rf "$TEMP_DIR"
    echo -e "${GREEN}Temporäres Verzeichnis wurde entfernt.${NC}"
}

# Funktion zum Ausführen bei Fehlern
handle_error() {
    echo -e "${RED}Ein Fehler ist aufgetreten. Skript wird beendet.${NC}"
    cleanup
    exit 1
}

# Trap für Fehler und Skriptbeendigung einrichten
trap handle_error ERR
trap cleanup EXIT

# 1. Repository klonen
echo -e "${YELLOW}1. Klone Repository mit Branch '$BRANCH'...${NC}"
git clone -b "$BRANCH" --depth 1 "$REPO_URL" "$TEMP_DIR/repo"
echo -e "${GREEN}Repository erfolgreich geklont.${NC}"
echo

# 2. Finde alle .pyc-Dateien im doc_converter-Ordner des aktuellen Verzeichnisses
echo -e "${YELLOW}2. Suche nach .pyc-Dateien in '$TARGET_FOLDER'...${NC}"
if [ ! -d "$CURRENT_DIR/$TARGET_FOLDER" ]; then
    echo -e "${RED}Fehler: Ordner '$TARGET_FOLDER' nicht gefunden im aktuellen Verzeichnis.${NC}"
    exit 1
fi

PYC_FILES=$(find "$CURRENT_DIR/$TARGET_FOLDER" -name "*.pyc")
PYC_COUNT=$(echo "$PYC_FILES" | grep -c "\.pyc$")

if [ "$PYC_COUNT" -eq 0 ]; then
    echo -e "${RED}Keine .pyc-Dateien gefunden. Nichts zu tun.${NC}"
    exit 0
fi

echo -e "${GREEN}$PYC_COUNT .pyc-Dateien gefunden.${NC}"
echo

# 3. & 4. Verarbeite jede .pyc-Datei
echo -e "${YELLOW}3. & 4. Verarbeite gefundene .pyc-Dateien...${NC}"

# Zähler für Erfolgsmeldungen
SUCCESS_COUNT=0
FAILURE_COUNT=0

for PYC_FILE in $PYC_FILES; do
    # a. Ermittle den Pfad ohne Erweiterung
    REL_PATH=${PYC_FILE#$CURRENT_DIR/}
    REL_DIR=$(dirname "$REL_PATH")
    FILENAME=$(basename "$PYC_FILE" .pyc)
    PY_REL_PATH="${REL_DIR%__pycache__}/${FILENAME}.py"
    
    # Debug-Ausgabe zur Pfadermittlung
    echo -e "${BLUE}Verarbeite:${NC} $REL_PATH"
    echo -e "  ${BLUE}Zugehörige .py-Datei:${NC} $PY_REL_PATH"
    
    # b. Suche nach der entsprechenden .py-Datei im geklonten Repository
    SOURCE_FILE="$TEMP_DIR/repo/$PY_REL_PATH"
    TARGET_FILE="$CURRENT_DIR/${PY_REL_PATH}"
    
    if [ -f "$SOURCE_FILE" ]; then
        # c. Kopiere die .py-Datei
        TARGET_DIR=$(dirname "$TARGET_FILE")
        
        # Erstelle Zielverzeichnis, falls es nicht existiert
        if [ ! -d "$TARGET_DIR" ]; then
            echo -e "  ${YELLOW}Erstelle Verzeichnis:${NC} $TARGET_DIR"
            mkdir -p "$TARGET_DIR"
        fi
        
        # Kopiere die Datei
        echo -e "  ${GREEN}Kopiere:${NC} $SOURCE_FILE -> $TARGET_FILE"
        cp "$SOURCE_FILE" "$TARGET_FILE"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    else
        echo -e "  ${RED}WARNUNG: Keine entsprechende .py-Datei gefunden:${NC} $SOURCE_FILE"
        FAILURE_COUNT=$((FAILURE_COUNT + 1))
    fi
    
    echo
done

# Statistik ausgeben
echo -e "${BLUE}=== Zusammenfassung ===${NC}"
echo -e "${GREEN}Erfolgreich ersetzt:${NC} $SUCCESS_COUNT Dateien"
echo -e "${RED}Nicht gefunden:${NC} $FAILURE_COUNT Dateien"
echo -e "${BLUE}==========================${NC}"

# Hinweis auf das temporäre Verzeichnis
echo -e "\n${YELLOW}5. Temporäres Verzeichnis wird beim Beenden aufgeräumt.${NC}"

# Das temporäre Verzeichnis wird durch den trap-Handler beim Beenden aufgeräumt
exit 0