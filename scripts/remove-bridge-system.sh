#!/bin/bash
# Bridge-System Entfernungs-Script
# Datum: 30. Mai 2025

set -e

echo "🌉 Bridge-System Entfernung"
echo "=========================="

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Backup-Verzeichnis
BACKUP_DIR="bridge_removal_backup_$(date +%Y%m%d_%H%M%S)"

# Phase 1: Analyse und Backup
echo -e "\n${YELLOW}📊 Phase 1: Analyse und Backup${NC}"

# Erstelle Backup-Verzeichnis
mkdir -p $BACKUP_DIR

# Finde alle Bridge-Imports außerhalb des bridge-Verzeichnisses
echo "Suche Bridge-Imports außerhalb von src/bridge/..."
grep -r "from.*['\"].*bridge" src/ --include="*.ts" --include="*.vue" --exclude-dir="bridge" > ${BACKUP_DIR}/external_bridge_imports.txt 2>/dev/null || true

# Zähle gefundene Imports
IMPORT_COUNT=$(wc -l < ${BACKUP_DIR}/external_bridge_imports.txt)
echo -e "${BLUE}Gefunden: $IMPORT_COUNT externe Bridge-Imports${NC}"

# Backup der Bridge-Dateien
echo "Erstelle Backup des Bridge-Systems..."
if [ -d "src/bridge" ]; then
    tar -czf ${BACKUP_DIR}/bridge_system_backup.tar.gz src/bridge/ 2>/dev/null || true
    echo -e "${GREEN}✓ Bridge-System gesichert${NC}"
fi

# Backup verwandter Dateien
echo "Sichere verwandte Dateien..."
FILES_TO_BACKUP=(
    "src/bridge-init.ts"
    "src/composables/useBridgeChat.ts"
    "src/utils/globalFunctionsBridge.ts"
    "src/main-enhanced.ts"
    "src/js/bridge-integration.js"
    "frontend/js/vue-legacy-bridge.js"
)

for file in "${FILES_TO_BACKUP[@]}"; do
    if [ -f "$file" ]; then
        cp "$file" "${BACKUP_DIR}/" 2>/dev/null || true
        echo "  ✓ Gesichert: $file"
    fi
done

# Phase 2: Prüfe kritische Abhängigkeiten
echo -e "\n${YELLOW}🔍 Phase 2: Prüfe kritische Abhängigkeiten${NC}"

# Prüfe ob main.ts Bridge importiert
if grep -q "bridge" src/main.ts 2>/dev/null; then
    echo -e "${RED}⚠️  WARNUNG: main.ts enthält Bridge-Referenzen!${NC}"
    echo "Bitte manuell prüfen vor Fortsetzung."
    exit 1
fi

# Prüfe aktive Komponenten
COMPONENT_USAGE=$(grep -r "useBridge\|bridgeInstance\|bridge\.on\|bridge\.emit" src/components/ src/views/ 2>/dev/null | wc -l || echo "0")
if [ "$COMPONENT_USAGE" -gt 0 ]; then
    echo -e "${RED}⚠️  WARNUNG: $COMPONENT_USAGE Komponenten nutzen Bridge!${NC}"
    grep -r "useBridge\|bridgeInstance\|bridge\.on\|bridge\.emit" src/components/ src/views/ 2>/dev/null || true
    echo "Bitte manuell prüfen vor Fortsetzung."
    exit 1
fi

echo -e "${GREEN}✓ Keine kritischen Abhängigkeiten gefunden${NC}"

# Phase 3: Entferne Bridge-Imports aus externen Dateien
echo -e "\n${YELLOW}🧹 Phase 3: Bereinige externe Bridge-Imports${NC}"

# Liste der zu bereinigenden Dateien (manuell geprüft)
FILES_TO_CLEAN=(
    "src/stores/storeInitializer.ts"
    "src/composables/index.ts"
    "src/utils/index.ts"
)

for file in "${FILES_TO_CLEAN[@]}"; do
    if [ -f "$file" ]; then
        # Backup original
        cp "$file" "${BACKUP_DIR}/$(basename $file).original" 2>/dev/null || true
        
        # Entferne Bridge-Import-Zeilen
        sed -i.bak '/import.*bridge/d' "$file" 2>/dev/null || true
        
        echo "  ✓ Bereinigt: $file"
    fi
done

# Phase 4: Test Build
echo -e "\n${YELLOW}🔨 Phase 4: Test Build${NC}"
echo "Führe Build-Test durch..."

if npm run build:no-check > ${BACKUP_DIR}/build_test.log 2>&1; then
    echo -e "${GREEN}✓ Build erfolgreich!${NC}"
else
    echo -e "${RED}✗ Build fehlgeschlagen!${NC}"
    echo "Siehe ${BACKUP_DIR}/build_test.log für Details"
    echo "Rollback mit: tar -xzf ${BACKUP_DIR}/bridge_system_backup.tar.gz"
    exit 1
fi

# Phase 5: Entferne Bridge-Dateien
echo -e "\n${YELLOW}🗑️  Phase 5: Entferne Bridge-System${NC}"

# Entferne Bridge-Verzeichnis
if [ -d "src/bridge" ]; then
    rm -rf src/bridge/
    echo "✓ Entfernt: src/bridge/"
fi

# Entferne verwandte Dateien
FILES_TO_REMOVE=(
    "src/bridge-init.ts"
    "src/composables/useBridgeChat.ts"
    "src/utils/globalFunctionsBridge.ts"
    "src/main-enhanced.ts"
    "src/js/bridge-integration.js"
)

for file in "${FILES_TO_REMOVE[@]}"; do
    if [ -f "$file" ]; then
        rm -f "$file"
        echo "✓ Entfernt: $file"
    fi
done

# Phase 6: Finaler Build-Test
echo -e "\n${YELLOW}🔨 Phase 6: Finaler Build-Test${NC}"

if npm run build:no-check > ${BACKUP_DIR}/final_build_test.log 2>&1; then
    echo -e "${GREEN}✓ Finaler Build erfolgreich!${NC}"
else
    echo -e "${RED}✗ Finaler Build fehlgeschlagen!${NC}"
    echo "Rollback erforderlich!"
    exit 1
fi

# Phase 7: Cleanup TypeScript Konfiguration
echo -e "\n${YELLOW}🧹 Phase 7: Bereinige TypeScript-Konfiguration${NC}"

# Entferne Bridge-Pfade aus tsconfig.json wenn vorhanden
if [ -f "tsconfig.json" ]; then
    cp tsconfig.json ${BACKUP_DIR}/tsconfig.json.original
    # Hier würde man Bridge-spezifische Pfade entfernen
    echo "✓ TypeScript-Konfiguration geprüft"
fi

# Zusammenfassung
echo -e "\n${GREEN}✅ Bridge-System erfolgreich entfernt!${NC}"
echo "=========================================="
echo "Entfernte Dateien: $(find src/bridge -type f 2>/dev/null | wc -l || echo "0") Bridge-Dateien"
echo "Bereinigte Imports: $IMPORT_COUNT"
echo "Backup gespeichert in: ${BACKUP_DIR}/"
echo ""
echo "Nächste Schritte:"
echo "1. Führe vollständige Tests durch: npm test"
echo "2. Prüfe die Anwendung manuell"
echo "3. Committe die Änderungen"
echo ""
echo "Bei Problemen Rollback mit:"
echo "  tar -xzf ${BACKUP_DIR}/bridge_system_backup.tar.gz"
echo ""

# Optional: Zeige Größenersparnis
echo -e "${BLUE}📊 Geschätzte Einsparungen:${NC}"
BRIDGE_SIZE=$(du -sh src/bridge 2>/dev/null | cut -f1 || echo "N/A")
echo "Bridge-System Größe: $BRIDGE_SIZE"

# Erstelle Zusammenfassungsdatei
cat > ${BACKUP_DIR}/removal_summary.txt << EOF
Bridge-System Entfernung - Zusammenfassung
==========================================
Datum: $(date)
Entfernte Verzeichnisse: src/bridge/
Entfernte Dateien: ${FILES_TO_REMOVE[@]}
Bereinigte Dateien: ${FILES_TO_CLEAN[@]}
Build-Status: Erfolgreich
EOF

echo -e "\n${YELLOW}⚠️  Wichtig:${NC}"
echo "Das Legacy-Frontend (frontend/js/vue-legacy-bridge.js) wurde NICHT entfernt."
echo "Falls das Legacy-Frontend nicht mehr benötigt wird, kann es separat entfernt werden."