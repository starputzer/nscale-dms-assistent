#!/bin/bash
# Bridge-System Entfernungs-Script V2
# Berücksichtigt, dass EnhancedChatView nicht verwendet wird
# Datum: 30. Mai 2025

set -e

echo "🌉 Bridge-System Entfernung V2"
echo "=============================="

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Backup-Verzeichnis
BACKUP_DIR="bridge_removal_backup_v2_$(date +%Y%m%d_%H%M%S)"

# Phase 1: Analyse und Backup
echo -e "\n${YELLOW}📊 Phase 1: Analyse und Backup${NC}"

# Erstelle Backup-Verzeichnis
mkdir -p $BACKUP_DIR

# Prüfe welche Views tatsächlich verwendet werden
echo "Prüfe Router-Konfiguration..."
USED_VIEWS=$(grep -h "component:" src/router/*.ts 2>/dev/null | grep -v "//" | sort -u > ${BACKUP_DIR}/used_views.txt || true)
echo -e "${BLUE}Router verwendet folgende Views:${NC}"
cat ${BACKUP_DIR}/used_views.txt | head -10

# Prüfe ob EnhancedChatView verwendet wird
if grep -q "EnhancedChatView" src/router/*.ts 2>/dev/null; then
    echo -e "${RED}⚠️  EnhancedChatView wird im Router verwendet!${NC}"
    ENHANCED_USED=true
else
    echo -e "${GREEN}✓ EnhancedChatView wird NICHT im Router verwendet${NC}"
    ENHANCED_USED=false
fi

# Finde alle Bridge-Imports außerhalb des bridge-Verzeichnisses
echo -e "\nSuche Bridge-Imports außerhalb von src/bridge/..."
grep -r "from.*['\"].*bridge" src/ --include="*.ts" --include="*.vue" --exclude-dir="bridge" > ${BACKUP_DIR}/external_bridge_imports.txt 2>/dev/null || true

# Filtere nur relevante Imports (nicht EnhancedChatView wenn nicht verwendet)
if [ "$ENHANCED_USED" = false ]; then
    grep -v "EnhancedChatView" ${BACKUP_DIR}/external_bridge_imports.txt > ${BACKUP_DIR}/relevant_bridge_imports.txt 2>/dev/null || true
else
    cp ${BACKUP_DIR}/external_bridge_imports.txt ${BACKUP_DIR}/relevant_bridge_imports.txt
fi

IMPORT_COUNT=$(wc -l < ${BACKUP_DIR}/relevant_bridge_imports.txt)
echo -e "${BLUE}Gefunden: $IMPORT_COUNT relevante Bridge-Imports${NC}"

# Backup der Bridge-Dateien
echo -e "\nErstelle Backup des Bridge-Systems..."
if [ -d "src/bridge" ]; then
    tar -czf ${BACKUP_DIR}/bridge_system_backup.tar.gz src/bridge/ 2>/dev/null || true
    echo -e "${GREEN}✓ Bridge-System gesichert${NC}"
fi

# Liste aller Bridge-bezogenen Dateien
echo -e "\nIdentifiziere alle Bridge-bezogenen Dateien..."
BRIDGE_FILES=(
    "src/bridge-init.ts"
    "src/composables/useBridgeChat.ts"
    "src/utils/globalFunctionsBridge.ts"
    "src/main-enhanced.ts"
    "src/js/bridge-integration.js"
    "frontend/js/vue-legacy-bridge.js"
    "src/views/EnhancedChatView.vue"  # Wird entfernt wenn nicht verwendet
    "src/stories/EnhancedChatView.stories.ts"
    "src/components/debug/StreamingDebugPanel.vue"
)

# Backup verwandter Dateien
echo "Sichere verwandte Dateien..."
for file in "${BRIDGE_FILES[@]}"; do
    if [ -f "$file" ]; then
        mkdir -p "${BACKUP_DIR}/$(dirname $file)"
        cp "$file" "${BACKUP_DIR}/$file" 2>/dev/null || true
        echo "  ✓ Gesichert: $file"
    fi
done

# Phase 2: Prüfe kritische Abhängigkeiten
echo -e "\n${YELLOW}🔍 Phase 2: Prüfe kritische Abhängigkeiten${NC}"

# Prüfe ob main.ts Bridge importiert
if grep -q "bridge" src/main.ts 2>/dev/null; then
    echo -e "${RED}⚠️  WARNUNG: main.ts enthält Bridge-Referenzen!${NC}"
    grep "bridge" src/main.ts
    echo "Bitte manuell prüfen vor Fortsetzung."
    exit 1
fi

# Prüfe AKTIV GENUTZTE Komponenten (nicht EnhancedChatView wenn nicht im Router)
if [ "$ENHANCED_USED" = false ]; then
    # Exclude EnhancedChatView from check
    COMPONENT_USAGE=$(grep -r "useBridge\|bridgeInstance\|bridge\.on\|bridge\.emit" src/components/ src/views/ 2>/dev/null | grep -v "EnhancedChatView" | wc -l || echo "0")
else
    COMPONENT_USAGE=$(grep -r "useBridge\|bridgeInstance\|bridge\.on\|bridge\.emit" src/components/ src/views/ 2>/dev/null | wc -l || echo "0")
fi

if [ "$COMPONENT_USAGE" -gt 0 ]; then
    echo -e "${RED}⚠️  WARNUNG: $COMPONENT_USAGE aktive Komponenten nutzen Bridge!${NC}"
    grep -r "useBridge\|bridgeInstance\|bridge\.on\|bridge\.emit" src/components/ src/views/ 2>/dev/null | grep -v "EnhancedChatView" || true
    echo "Bitte manuell prüfen vor Fortsetzung."
    exit 1
fi

echo -e "${GREEN}✓ Keine kritischen Abhängigkeiten in aktiven Komponenten${NC}"

# Phase 3: Entferne Bridge-Imports aus externen Dateien
echo -e "\n${YELLOW}🧹 Phase 3: Bereinige externe Bridge-Imports${NC}"

# Liste der zu bereinigenden Dateien
FILES_TO_CLEAN=(
    "src/stores/storeInitializer.ts"
    "src/composables/index.ts"
    "src/utils/index.ts"
    "src/types/globals.d.ts"
    "src/types/env.d.ts"
)

for file in "${FILES_TO_CLEAN[@]}"; do
    if [ -f "$file" ]; then
        # Backup original
        cp "$file" "${BACKUP_DIR}/$(basename $file).original" 2>/dev/null || true
        
        # Entferne Bridge-Import-Zeilen und Bridge-Typen
        sed -i.bak '/import.*bridge/d' "$file" 2>/dev/null || true
        sed -i.bak '/bridge:/d' "$file" 2>/dev/null || true
        sed -i.bak '/BridgeAPI/d' "$file" 2>/dev/null || true
        
        echo "  ✓ Bereinigt: $file"
    fi
done

# Phase 4: Test Build
echo -e "\n${YELLOW}🔨 Phase 4: Test Build vor Entfernung${NC}"
echo "Führe Build-Test durch..."

if npm run build:no-check > ${BACKUP_DIR}/build_test_before.log 2>&1; then
    echo -e "${GREEN}✓ Build erfolgreich vor Entfernung!${NC}"
else
    echo -e "${RED}✗ Build fehlgeschlagen vor Entfernung!${NC}"
    echo "Siehe ${BACKUP_DIR}/build_test_before.log für Details"
    exit 1
fi

# Phase 5: Entferne Bridge-Dateien
echo -e "\n${YELLOW}🗑️  Phase 5: Entferne Bridge-System${NC}"

# Entferne Bridge-Verzeichnis
if [ -d "src/bridge" ]; then
    BRIDGE_FILE_COUNT=$(find src/bridge -type f | wc -l)
    rm -rf src/bridge/
    echo "✓ Entfernt: src/bridge/ ($BRIDGE_FILE_COUNT Dateien)"
fi

# Entferne verwandte Dateien
FILES_TO_REMOVE=(
    "src/bridge-init.ts"
    "src/composables/useBridgeChat.ts"
    "src/utils/globalFunctionsBridge.ts"
    "src/main-enhanced.ts"
    "src/js/bridge-integration.js"
    "src/components/debug/StreamingDebugPanel.vue"
)

# Entferne EnhancedChatView nur wenn nicht verwendet
if [ "$ENHANCED_USED" = false ]; then
    FILES_TO_REMOVE+=(
        "src/views/EnhancedChatView.vue"
        "src/stories/EnhancedChatView.stories.ts"
    )
fi

for file in "${FILES_TO_REMOVE[@]}"; do
    if [ -f "$file" ]; then
        rm -f "$file"
        echo "✓ Entfernt: $file"
    fi
done

# Entferne leere Verzeichnisse
find src -type d -empty -delete 2>/dev/null || true

# Phase 6: Finaler Build-Test
echo -e "\n${YELLOW}🔨 Phase 6: Finaler Build-Test${NC}"

if npm run build:no-check > ${BACKUP_DIR}/final_build_test.log 2>&1; then
    echo -e "${GREEN}✓ Finaler Build erfolgreich!${NC}"
    BUILD_SUCCESS=true
else
    echo -e "${RED}✗ Finaler Build fehlgeschlagen!${NC}"
    BUILD_SUCCESS=false
fi

# Phase 7: Knip-Analyse
echo -e "\n${YELLOW}🔍 Phase 7: Knip-Analyse nach Entfernung${NC}"
npx knip --no-exit-code --reporter compact > ${BACKUP_DIR}/knip_after_bridge_removal.txt 2>&1 || true
echo "✓ Knip-Analyse gespeichert"

# Zusammenfassung
echo -e "\n${GREEN}✅ Bridge-System Entfernung abgeschlossen!${NC}"
echo "============================================"
echo "Entfernte Bridge-Dateien: ${BRIDGE_FILE_COUNT:-0}"
echo "Bereinigte Import-Dateien: ${#FILES_TO_CLEAN[@]}"
echo "Entfernte verwandte Dateien: ${#FILES_TO_REMOVE[@]}"
echo "Build-Status: $([ "$BUILD_SUCCESS" = true ] && echo "✓ Erfolgreich" || echo "✗ Fehlgeschlagen")"
echo ""
echo "Backup gespeichert in: ${BACKUP_DIR}/"
echo ""

if [ "$BUILD_SUCCESS" = true ]; then
    echo "Nächste Schritte:"
    echo "1. Führe Tests durch: npm test"
    echo "2. Prüfe die Anwendung manuell"
    echo "3. Committe die Änderungen"
else
    echo -e "${RED}⚠️  Build fehlgeschlagen!${NC}"
    echo "Prüfe ${BACKUP_DIR}/final_build_test.log für Details"
fi

echo ""
echo "Bei Problemen Rollback mit:"
echo "  tar -xzf ${BACKUP_DIR}/bridge_system_backup.tar.gz -C /"
echo "  cp ${BACKUP_DIR}/*.original src/"
echo ""

# Zeige Größenersparnis
if [ -f "${BACKUP_DIR}/bridge_system_backup.tar.gz" ]; then
    BACKUP_SIZE=$(ls -lh ${BACKUP_DIR}/bridge_system_backup.tar.gz | awk '{print $5}')
    echo -e "${BLUE}📊 Bridge-System Größe (komprimiert): $BACKUP_SIZE${NC}"
fi

# Erstelle detaillierte Zusammenfassung
cat > ${BACKUP_DIR}/removal_summary.md << EOF
# Bridge-System Entfernung - Zusammenfassung

**Datum**: $(date)  
**Status**: $([ "$BUILD_SUCCESS" = true ] && echo "✅ Erfolgreich" || echo "❌ Fehlgeschlagen")

## Entfernte Komponenten

### Bridge-Kern
- \`src/bridge/\` - Komplettes Verzeichnis (${BRIDGE_FILE_COUNT:-0} Dateien)

### Verwandte Dateien
$(for file in "${FILES_TO_REMOVE[@]}"; do echo "- \`$file\`"; done)

### Bereinigte Imports
$(for file in "${FILES_TO_CLEAN[@]}"; do echo "- \`$file\`"; done)

## Build-Ergebnisse
- Vor Entfernung: ✓ Erfolgreich
- Nach Entfernung: $([ "$BUILD_SUCCESS" = true ] && echo "✓ Erfolgreich" || echo "✗ Fehlgeschlagen")

## Notizen
- EnhancedChatView verwendet: $([ "$ENHANCED_USED" = true ] && echo "Ja" || echo "Nein (entfernt)")
- Legacy-Frontend Bridge: Nicht entfernt (frontend/js/vue-legacy-bridge.js)
EOF

echo -e "\n${YELLOW}📝 Detaillierte Zusammenfassung: ${BACKUP_DIR}/removal_summary.md${NC}"