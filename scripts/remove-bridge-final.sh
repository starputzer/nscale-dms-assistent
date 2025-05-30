#!/bin/bash
# Bridge-System Entfernung - Finales Script
# Basiert auf verifizierter Analyse dass keine aktiven Komponenten Bridge nutzen
# Datum: 30. Mai 2025

set -e

echo "🌉 Bridge-System Entfernung - Final"
echo "==================================="

# Farben
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Backup-Verzeichnis
BACKUP_DIR="bridge_removal_final_$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR

# Phase 1: Finale Sicherheitsprüfung
echo -e "\n${YELLOW}🔍 Phase 1: Finale Sicherheitsprüfung${NC}"

# Prüfe dass SimpleChatView (aktiv genutzt) kein Bridge verwendet
if grep -q "bridge" src/views/SimpleChatView.vue 2>/dev/null; then
    echo -e "${RED}✗ FEHLER: SimpleChatView verwendet Bridge!${NC}"
    exit 1
else
    echo -e "${GREEN}✓ SimpleChatView verwendet kein Bridge${NC}"
fi

# Prüfe dass main.ts kein Bridge importiert
if grep -q "bridge" src/main.ts 2>/dev/null; then
    echo -e "${RED}✗ FEHLER: main.ts importiert Bridge!${NC}"
    exit 1
else
    echo -e "${GREEN}✓ main.ts importiert kein Bridge${NC}"
fi

# Phase 2: Backup
echo -e "\n${YELLOW}📦 Phase 2: Erstelle Backup${NC}"

# Bridge-System sichern
if [ -d "src/bridge" ]; then
    BRIDGE_COUNT=$(find src/bridge -type f | wc -l)
    tar -czf ${BACKUP_DIR}/bridge_complete.tar.gz src/bridge/
    echo -e "${GREEN}✓ Bridge-System gesichert ($BRIDGE_COUNT Dateien)${NC}"
fi

# Weitere zu entfernende Dateien sichern
FILES_TO_BACKUP=(
    "src/views/EnhancedChatView.vue"
    "src/bridge-init.ts"
    "src/main-enhanced.ts"
    "src/composables/useBridgeChat.ts"
    "src/utils/globalFunctionsBridge.ts"
    "src/components/debug/StreamingDebugPanel.vue"
    "src/stories/EnhancedChatView.stories.ts"
)

for file in "${FILES_TO_BACKUP[@]}"; do
    if [ -f "$file" ]; then
        mkdir -p "${BACKUP_DIR}/$(dirname $file)"
        cp "$file" "${BACKUP_DIR}/$file"
    fi
done

# Phase 3: Bereinige Import-Dateien
echo -e "\n${YELLOW}🧹 Phase 3: Bereinige Import-Dateien${NC}"

# Sichere und bereinige composables/index.ts
if [ -f "src/composables/index.ts" ]; then
    cp src/composables/index.ts ${BACKUP_DIR}/composables.index.ts.bak
    # Entferne Bridge-bezogene Exports
    sed -i '/useBridgeChat/d' src/composables/index.ts
    sed -i '/bridge/d' src/composables/index.ts
    echo "✓ Bereinigt: src/composables/index.ts"
fi

# Sichere und bereinige utils/index.ts
if [ -f "src/utils/index.ts" ]; then
    cp src/utils/index.ts ${BACKUP_DIR}/utils.index.ts.bak
    sed -i '/globalFunctionsBridge/d' src/utils/index.ts
    sed -i '/bridge/d' src/utils/index.ts
    echo "✓ Bereinigt: src/utils/index.ts"
fi

# Sichere und bereinige stores/storeInitializer.ts
if [ -f "src/stores/storeInitializer.ts" ]; then
    cp src/stores/storeInitializer.ts ${BACKUP_DIR}/storeInitializer.ts.bak
    sed -i '/bridge/d' src/stores/storeInitializer.ts
    echo "✓ Bereinigt: src/stores/storeInitializer.ts"
fi

# Phase 4: Build-Test vor Entfernung
echo -e "\n${YELLOW}🔨 Phase 4: Build-Test vor Entfernung${NC}"

if npm run build:no-check > ${BACKUP_DIR}/build_before.log 2>&1; then
    echo -e "${GREEN}✓ Build erfolgreich${NC}"
else
    echo -e "${RED}✗ Build fehlgeschlagen (siehe ${BACKUP_DIR}/build_before.log)${NC}"
    exit 1
fi

# Phase 5: Entferne Bridge-System
echo -e "\n${YELLOW}🗑️ Phase 5: Entferne Bridge-System${NC}"

# Entferne Bridge-Verzeichnis
if [ -d "src/bridge" ]; then
    rm -rf src/bridge/
    echo "✓ Entfernt: src/bridge/ ($BRIDGE_COUNT Dateien)"
fi

# Entferne ungenutzte Views und Komponenten
REMOVE_FILES=(
    "src/views/EnhancedChatView.vue"
    "src/bridge-init.ts"
    "src/main-enhanced.ts"
    "src/composables/useBridgeChat.ts"
    "src/utils/globalFunctionsBridge.ts"
    "src/components/debug/StreamingDebugPanel.vue"
    "src/stories/EnhancedChatView.stories.ts"
    "src/js/bridge-integration.js"
)

for file in "${REMOVE_FILES[@]}"; do
    if [ -f "$file" ]; then
        rm -f "$file"
        echo "✓ Entfernt: $file"
    fi
done

# Entferne Bridge-Tests
if [ -d "test/bridge" ]; then
    rm -rf test/bridge/
    echo "✓ Entfernt: test/bridge/"
fi

# Phase 6: Finaler Build-Test
echo -e "\n${YELLOW}🔨 Phase 6: Finaler Build-Test${NC}"

if npm run build:no-check > ${BACKUP_DIR}/build_after.log 2>&1; then
    echo -e "${GREEN}✓ Build erfolgreich nach Entfernung!${NC}"
    BUILD_SUCCESS=true
else
    echo -e "${RED}✗ Build fehlgeschlagen${NC}"
    BUILD_SUCCESS=false
fi

# Phase 7: Cleanup leere Verzeichnisse
echo -e "\n${YELLOW}🧹 Phase 7: Cleanup${NC}"
find src -type d -empty -delete 2>/dev/null || true
echo "✓ Leere Verzeichnisse entfernt"

# Zusammenfassung
echo -e "\n${GREEN}============================================${NC}"
echo -e "${GREEN}✅ Bridge-System Entfernung abgeschlossen!${NC}"
echo -e "${GREEN}============================================${NC}"

# Statistiken
TOTAL_REMOVED=$((BRIDGE_COUNT + ${#REMOVE_FILES[@]}))
echo -e "\n📊 Statistiken:"
echo "• Entfernte Bridge-Dateien: $BRIDGE_COUNT"
echo "• Entfernte verwandte Dateien: ${#REMOVE_FILES[@]}"
echo "• Gesamt entfernt: $TOTAL_REMOVED Dateien"
echo "• Build-Status: $([ "$BUILD_SUCCESS" = true ] && echo "✅ Erfolgreich" || echo "❌ Fehlgeschlagen")"
echo "• Backup: $BACKUP_DIR/"

# Größenersparnis
if [ -f "${BACKUP_DIR}/bridge_complete.tar.gz" ]; then
    SIZE=$(ls -lh ${BACKUP_DIR}/bridge_complete.tar.gz | awk '{print $5}')
    echo "• Bridge-Größe (komprimiert): $SIZE"
fi

# Rollback-Anweisungen
echo -e "\n📝 Rollback bei Bedarf:"
echo "tar -xzf ${BACKUP_DIR}/bridge_complete.tar.gz"
echo "cp ${BACKUP_DIR}/*.bak src/"

# Nächste Schritte
if [ "$BUILD_SUCCESS" = true ]; then
    echo -e "\n✨ Nächste Schritte:"
    echo "1. npm test - Tests ausführen"
    echo "2. Anwendung manuell testen"
    echo "3. git add -A && git commit -m 'refactor: Remove unused bridge system'"
    echo "4. Knip erneut ausführen für weitere Cleanup-Möglichkeiten"
else
    echo -e "\n${RED}⚠️  Build fehlgeschlagen - bitte ${BACKUP_DIR}/build_after.log prüfen${NC}"
fi

# Report erstellen
cat > ${BACKUP_DIR}/removal_report.md << EOF
# Bridge-System Entfernung Report

**Datum**: $(date)
**Status**: $([ "$BUILD_SUCCESS" = true ] && echo "✅ Erfolgreich" || echo "❌ Fehlgeschlagen")

## Entfernte Komponenten

### Bridge-Kern
- \`src/bridge/\` - $BRIDGE_COUNT Dateien

### Verwandte Dateien
$(for f in "${REMOVE_FILES[@]}"; do [ -f "${BACKUP_DIR}/$f" ] && echo "- \`$f\`"; done)

### Bereinigte Imports
- \`src/composables/index.ts\`
- \`src/utils/index.ts\`
- \`src/stores/storeInitializer.ts\`

## Verifikation
- SimpleChatView: ✅ Kein Bridge
- main.ts: ✅ Kein Bridge
- Build vor Entfernung: ✅ Erfolgreich
- Build nach Entfernung: $([ "$BUILD_SUCCESS" = true ] && echo "✅ Erfolgreich" || echo "❌ Fehlgeschlagen")

## Backup
Vollständiges Backup in: \`$BACKUP_DIR/\`
EOF

echo -e "\n📄 Detaillierter Report: ${BACKUP_DIR}/removal_report.md"