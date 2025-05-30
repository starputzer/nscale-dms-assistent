#!/bin/bash
# Extended Cleanup Script basierend auf Knip-Analyse
# Datum: 30. Mai 2025

set -e

echo "🧹 Erweiterte Bereinigung basierend auf Knip-Analyse (148 ungenutzte Dateien)"
echo "=================================================================="

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Backup-Verzeichnis
BACKUP_DIR="knip_cleanup_backup_$(date +%Y%m%d_%H%M%S)"

# Erstelle Backup
echo -e "${YELLOW}📦 Erstelle vollständiges Backup...${NC}"
mkdir -p $BACKUP_DIR
tar -czf ${BACKUP_DIR}/src_backup.tar.gz src/ 2>/dev/null || true
echo -e "${GREEN}✓ Backup erstellt: ${BACKUP_DIR}/src_backup.tar.gz${NC}"

# Phase 1: Dependencies bereinigen
echo -e "\n${YELLOW}📦 Phase 1: Bereinige Dependencies...${NC}"

echo "Entferne ungenutzte Production Dependencies..."
npm uninstall deepmerge trim-newlines || true

echo "Entferne ungenutzte Dev Dependencies..."
npm uninstall -D @fullhuman/postcss-purgecss @vue/tsconfig cssnano dotenv jest-axe postcss-discard-unused || true

echo "Installiere fehlende Dependency (lodash)..."
npm install lodash

echo -e "${GREEN}✓ Dependencies bereinigt${NC}"

# Phase 2: Sichere Löschungen (keine Abhängigkeiten)
echo -e "\n${YELLOW}🗑️  Phase 2: Sichere Löschungen...${NC}"

# Test-Import Dateien
if [ -f "src/App.test-import.ts" ]; then
    rm -f src/App.test-import.ts
    echo "✓ Gelöscht: src/App.test-import.ts"
fi

if [ -f "src/App.test-import.tsx" ]; then
    rm -f src/App.test-import.tsx
    echo "✓ Gelöscht: src/App.test-import.tsx"
fi

# Backup/Simple Dateien
echo "Lösche Backup und Simple Dateien..."
find src -name "*.backup.ts" -o -name "*.simple.ts" | while read file; do
    rm -f "$file"
    echo "✓ Gelöscht: $file"
done

# Examples Verzeichnis
if [ -d "src/examples" ]; then
    rm -rf src/examples/
    echo "✓ Gelöscht: src/examples/ (komplett)"
fi

# Migration Verzeichnis
if [ -d "src/migration" ]; then
    rm -rf src/migration/
    echo "✓ Gelöscht: src/migration/ (Vue 3 Migration abgeschlossen)"
fi

# Base Store Module
if [ -d "src/stores/base" ]; then
    rm -rf src/stores/base/
    echo "✓ Gelöscht: src/stores/base/ (ungenutzte Basis-Module)"
fi

# Build-Test nach Phase 2
echo -e "\n${YELLOW}🔨 Führe Build-Test nach Phase 2 durch...${NC}"
if npm run build:no-check > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Build erfolgreich nach Phase 2${NC}"
else
    echo -e "${RED}✗ Build fehlgeschlagen! Stoppe Cleanup.${NC}"
    exit 1
fi

# Phase 3: Bridge Optimized Module (nach Prüfung)
echo -e "\n${YELLOW}🔍 Phase 3: Prüfe Bridge Optimized Module...${NC}"

if ! grep -r "bridge/enhanced/optimized" src/ --include="*.ts" --include="*.vue" > /dev/null 2>&1; then
    if [ -d "src/bridge/enhanced/optimized" ]; then
        echo "Keine Referenzen gefunden. Lösche ungenutztes Bridge Optimized Module..."
        rm -rf src/bridge/enhanced/optimized/
        echo "✓ Gelöscht: src/bridge/enhanced/optimized/ (19 Dateien)"
    fi
else
    echo "⚠️  Bridge Optimized Module wird noch referenziert, überspringe..."
fi

# Phase 4: Ungenutzte Composables
echo -e "\n${YELLOW}🗑️  Phase 4: Lösche ungenutzte Composables...${NC}"

UNUSED_COMPOSABLES=(
    "src/composables/useBasicRouteFallback.ts"
    "src/composables/useChat.backup.ts"
    "src/composables/useChat.simple.ts"
    "src/composables/useEnhancedChat.ts"
    "src/composables/useOptimizedChat.ts"
    "src/composables/useShallowReactivity.ts"
)

for file in "${UNUSED_COMPOSABLES[@]}"; do
    if [ -f "$file" ]; then
        rm -f "$file"
        echo "✓ Gelöscht: $file"
    fi
done

# Phase 5: Mock Dateien
echo -e "\n${YELLOW}🗑️  Phase 5: Lösche Mock Dateien...${NC}"

find src -name "*.mock.ts" | while read file; do
    # Prüfe ob die Mock-Datei importiert wird
    if ! grep -r "$(basename $file .ts)" src/ --include="*.ts" --include="*.vue" --exclude="$file" > /dev/null 2>&1; then
        rm -f "$file"
        echo "✓ Gelöscht: $file"
    else
        echo "⚠️  Behalten: $file (wird noch verwendet)"
    fi
done

# Phase 6: A/B Test Module (wenn nicht verwendet)
echo -e "\n${YELLOW}🔍 Phase 6: Prüfe A/B Test Module...${NC}"

if ! grep -r "abTests" src/ --include="*.ts" --include="*.vue" --exclude="*/stores/abTests*" > /dev/null 2>&1; then
    rm -f src/stores/abTests.ts src/stores/abTests.mock.ts 2>/dev/null || true
    echo "✓ Gelöscht: A/B Test Module (ungenutzt)"
else
    echo "⚠️  A/B Test Module wird noch verwendet, überspringe..."
fi

# Finaler Build-Test
echo -e "\n${YELLOW}🔨 Führe finalen Build-Test durch...${NC}"
if npm run build:no-check > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Build erfolgreich!${NC}"
else
    echo -e "${RED}✗ Build fehlgeschlagen!${NC}"
    echo "Rollback mit: tar -xzf ${BACKUP_DIR}/src_backup.tar.gz"
    exit 1
fi

# Knip erneut ausführen für Verifikation
echo -e "\n${YELLOW}🔍 Führe Knip-Analyse zur Verifikation aus...${NC}"
npx knip --reporter compact > ${BACKUP_DIR}/knip_after_cleanup.txt 2>&1 || true

# Zusammenfassung
echo -e "\n${GREEN}✅ Erweiterte Bereinigung abgeschlossen!${NC}"
echo "=================================================================="
echo "Backup gespeichert in: ${BACKUP_DIR}/"
echo "Knip-Analyse nach Cleanup: ${BACKUP_DIR}/knip_after_cleanup.txt"
echo ""
echo "Nächste Schritte:"
echo "1. Prüfe die Anwendung gründlich"
echo "2. Führe npm run test aus"
echo "3. Bei Problemen: tar -xzf ${BACKUP_DIR}/src_backup.tar.gz"
echo ""
echo "Für weitere Bereinigung siehe: EXTENDED_CLEANUP_PLAN.md"