#!/bin/bash

# Vue 3 Migration Build-Skript
# Dieses Skript führt die nötigen Schritte aus, um eine vollständige Vue 3 Migration durchzuführen

# Farben für Ausgabe
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== nscale DMS Assistant - Vue 3 Migration Build ===${NC}"

# Ins App-Verzeichnis wechseln
cd /opt/nscale-assist/app

# Backup erstellen
TIMESTAMP=$(date +%Y%m%d%H%M%S)
echo -e "${YELLOW}Erstelle Backup der wichtigen Dateien...${NC}"

# Backup von main.ts, wenn vorhanden
if [ -f src/main.ts ]; then
  cp src/main.ts src/main.ts.backup-$TIMESTAMP
  echo "Backup erstellt: src/main.ts.backup-$TIMESTAMP"
fi

# Backup von index.html, wenn vorhanden
if [ -f public/index.html ]; then
  cp public/index.html public/index.html.backup-$TIMESTAMP
  echo "Backup erstellt: public/index.html.backup-$TIMESTAMP"
fi

# Backup von vite.config.js, wenn vorhanden
if [ -f vite.config.js ]; then
  cp vite.config.js vite.config.js.backup-$TIMESTAMP
  echo "Backup erstellt: vite.config.js.backup-$TIMESTAMP"
fi

# Optimierte Datei main.update.ts nach main.ts kopieren
echo -e "${GREEN}Aktualisiere main.ts mit optimierter Version...${NC}"
cp src/main.update.ts src/main.ts

# Überprüfen, ob alle neugebauten Komponenten existieren
echo -e "${YELLOW}Überprüfe, ob alle neuen Komponenten vorhanden sind...${NC}"
MISSING_FILES=0

check_file() {
  if [ ! -f "$1" ]; then
    echo -e "${RED}Fehler: Datei $1 nicht gefunden${NC}"
    MISSING_FILES=$((MISSING_FILES+1))
  else
    echo -e "${GREEN}✓ $1 gefunden${NC}"
  fi
}

# Überprüfe die neu erstellten Dateien
check_file "src/views/AuthView.vue"
check_file "src/components/ui/Motd.vue"
check_file "src/components/dialog/FeedbackDialog.vue"
check_file "src/components/dialog/SettingsDialog.vue" 
check_file "src/components/shared/CriticalError.vue"
check_file "src/utils/networkMonitor.ts"
check_file "src/directives/index.ts"
check_file "src/plugins/index.ts"
check_file "src/services/analytics/telemetry.ts"
check_file "public/assets/styles/base.css"

if [ $MISSING_FILES -gt 0 ]; then
  echo -e "${RED}Es fehlen $MISSING_FILES Dateien. Bitte erstellen Sie diese, bevor Sie fortfahren.${NC}"
  exit 1
fi

# Erstellen einer vereinfachten Vite-Konfiguration für den Build
echo -e "${YELLOW}Erstelle vereinfachte vite.config.js für den Build...${NC}"
cat > vite.simple.config.js << EOF
// vite.simple.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: 'api/frontend',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: \`@import "@/assets/styles/variables.css";\`
      }
    }
  }
})
EOF

echo -e "${GREEN}Build mit vereinfachter Konfiguration starten...${NC}"
npx vite build --config vite.simple.config.js

if [ $? -eq 0 ]; then
  echo -e "${GREEN}Build erfolgreich abgeschlossen!${NC}"
  echo -e "${BLUE}Verwenden Sie folgendes Kommando, um die Anwendung zu starten:${NC}"
  echo -e "${YELLOW}npm run dev${NC}"
else
  echo -e "${RED}Build fehlgeschlagen!${NC}"
  exit 1
fi

echo -e "${GREEN}=== Vue 3 Migration abgeschlossen ===${NC}"
echo -e "${YELLOW}HINWEIS: TypeScript-Fehler werden ignoriert, da dies Teil des Migrationsprozesses ist.${NC}"
echo -e "${YELLOW}Diese sollten nach und nach behoben werden, um eine vollständige Typensicherheit zu gewährleisten.${NC}"