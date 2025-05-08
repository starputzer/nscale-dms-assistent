#!/bin/bash

# Farbdefinitionen für bessere Lesbarkeit der Ausgabe
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Konfigurierbare Variablen
REPO_URL="https://github.com/starputzer/nscale-dms-assistent"
BRANCH="doc-converter"
TEMP_DIR=$(mktemp -d)
SOURCE_FOLDER="doc_converter"
TARGET_DIR="/opt/nscale-assist/app/doc_converter"

# Banner mit Titelausgabe und Konfigurationen
echo -e "${BLUE}======================================================${NC}"
echo -e "${BLUE}=== nscale-DMS Python Module Wiederherstellung      ===${NC}"
echo -e "${BLUE}======================================================${NC}"
echo -e "${YELLOW}Datum und Zeit:${NC} $(date)"
echo -e "${YELLOW}Repository:${NC} $REPO_URL"
echo -e "${YELLOW}Branch:${NC} $BRANCH"
echo -e "${YELLOW}Temporäres Verzeichnis:${NC} $TEMP_DIR"
echo -e "${YELLOW}Zielverzeichnis:${NC} $TARGET_DIR"
echo

# Zähler für die Statistik
COPIED_FILES=0
DELETED_PYC_FILES=0
FAILED_COPIES=0

# Funktion zur Fehlerbehandlung
handle_error() {
    echo -e "\n${RED}Ein Fehler ist aufgetreten (Zeile $1). Skript wird beendet.${NC}"
    cleanup
    exit 1
}

# Funktion zum Aufräumen
cleanup() {
    echo -e "\n${YELLOW}Räume temporäres Verzeichnis auf...${NC}"
    if [ -d "$TEMP_DIR" ]; then
        rm -rf "$TEMP_DIR"
        echo -e "${GREEN}Temporäres Verzeichnis wurde entfernt.${NC}"
    fi
}

# Trap für Fehler und Programmende
trap 'handle_error $LINENO' ERR
trap cleanup EXIT

# Überprüfe, ob git installiert ist
if ! command -v git &> /dev/null; then
    echo -e "${RED}ERROR: Git ist nicht installiert. Bitte installieren Sie Git und versuchen Sie es erneut.${NC}"
    exit 1
fi

# 1. Repository klonen
echo -e "${CYAN}1. Klone Repository...${NC}"
if ! git clone -b "$BRANCH" --depth 1 "$REPO_URL" "$TEMP_DIR/repo"; then
    echo -e "${RED}ERROR: Repository konnte nicht geklont werden.${NC}"
    exit 1
fi
echo -e "${GREEN}Repository erfolgreich geklont.${NC}"
echo

# Prüfe, ob der doc_converter-Ordner im geklonten Repository existiert
if [ ! -d "$TEMP_DIR/repo/$SOURCE_FOLDER" ]; then
    echo -e "${RED}ERROR: Der Ordner '$SOURCE_FOLDER' wurde im geklonten Repository nicht gefunden.${NC}"
    exit 1
fi

# 2. Finde alle Python-Dateien im geklonten Repository
echo -e "${CYAN}2. Suche nach Python-Dateien im geklonten Repository...${NC}"
PY_FILES=$(find "$TEMP_DIR/repo/$SOURCE_FOLDER" -name "*.py")

# Prüfe, ob Python-Dateien gefunden wurden
PY_COUNT=$(echo "$PY_FILES" | grep -c "\.py$" || true)

if [ "$PY_COUNT" -eq 0 ]; then
    echo -e "${RED}WARNING: Keine Python-Dateien im '$SOURCE_FOLDER'-Ordner gefunden.${NC}"
    exit 0
fi

echo -e "${GREEN}$PY_COUNT Python-Dateien gefunden.${NC}"
echo

# 3. & 5. Kopiere die Python-Dateien und erstelle Verzeichnisse
echo -e "${CYAN}3. & 5. Kopiere Python-Dateien zum Zielverzeichnis...${NC}"

# Stelle sicher, dass das Hauptzielverzeichnis existiert
if [ ! -d "$TARGET_DIR" ]; then
    echo -e "${YELLOW}Erstelle Hauptzielverzeichnis:${NC} $TARGET_DIR"
    mkdir -p "$TARGET_DIR"
fi

# Verarbeite jede .py-Datei
for PY_FILE in $PY_FILES; do
    # Bestimme den relativen Pfad innerhalb des source_folder
    REL_PATH=${PY_FILE#$TEMP_DIR/repo/$SOURCE_FOLDER/}
    TARGET_FILE="$TARGET_DIR/$REL_PATH"
    TARGET_FOLDER=$(dirname "$TARGET_FILE")
    
    # Erstelle benötigte Unterordner
    if [ ! -d "$TARGET_FOLDER" ]; then
        echo -e "${YELLOW}Erstelle Verzeichnis:${NC} $TARGET_FOLDER"
        mkdir -p "$TARGET_FOLDER"
    fi
    
    # Kopiere die Datei
    echo -e "${GREEN}Kopiere:${NC} $REL_PATH"
    if cp "$PY_FILE" "$TARGET_FILE"; then
        COPIED_FILES=$((COPIED_FILES + 1))
    else
        echo -e "${RED}ERROR: Konnte Datei nicht kopieren:${NC} $PY_FILE -> $TARGET_FILE"
        FAILED_COPIES=$((FAILED_COPIES + 1))
    fi
    
    # 4. Prüfe auf und lösche entsprechende .pyc-Dateien
    PYC_FILE="${TARGET_FILE}c"  # Python 2 style (.pyc direkt neben .py)
    if [ -f "$PYC_FILE" ]; then
        echo -e "${YELLOW}Lösche:${NC} $PYC_FILE"
        rm "$PYC_FILE"
        DELETED_PYC_FILES=$((DELETED_PYC_FILES + 1))
    fi
    
    # Suche nach __pycache__ Ordner
    PYCACHE_DIR="$(dirname "$TARGET_FILE")/__pycache__"
    if [ -d "$PYCACHE_DIR" ]; then
        FILENAME=$(basename "$TARGET_FILE" .py)
        # Suchmuster für verschiedene Python-Versionen
        PYC_PATTERNS=("$FILENAME.cpython-*.pyc" "$FILENAME.pyc")
        
        for PATTERN in "${PYC_PATTERNS[@]}"; do
            PYC_FILES_CACHE=$(find "$PYCACHE_DIR" -name "$PATTERN" 2>/dev/null || true)
            if [ -n "$PYC_FILES_CACHE" ]; then
                for CACHED_PYC in $PYC_FILES_CACHE; do
                    echo -e "${YELLOW}Lösche:${NC} $CACHED_PYC"
                    rm "$CACHED_PYC"
                    DELETED_PYC_FILES=$((DELETED_PYC_FILES + 1))
                done
            fi
        done
    fi
done

# 7. Zusammenfassung ausgeben
echo -e "\n${BLUE}======================================================${NC}"
echo -e "${BLUE}=== Zusammenfassung                                  ===${NC}"
echo -e "${BLUE}======================================================${NC}"
echo -e "${GREEN}Erfolgreich kopierte Dateien:${NC} $COPIED_FILES"
echo -e "${YELLOW}Gelöschte .pyc-Dateien:${NC} $DELETED_PYC_FILES"

if [ $FAILED_COPIES -gt 0 ]; then
    echo -e "${RED}Fehlgeschlagene Kopieroperationen:${NC} $FAILED_COPIES"
fi

echo -e "${BLUE}======================================================${NC}"

# 8. Das temporäre Verzeichnis wird durch den trap-Handler beim Beenden aufgeräumt
echo -e "\n${CYAN}8. Temporäres Verzeichnis wird aufgeräumt...${NC}"

echo -e "\n${GREEN}Wiederherstellung abgeschlossen.${NC}"
exit 0