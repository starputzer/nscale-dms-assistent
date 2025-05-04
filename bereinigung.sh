#!/bin/bash

# Bereinigungsskript für die nscale-assist-app Dateistruktur
# Dieses Skript entfernt duplizierte Dateien gemäß dem Bereinigungsplan

# Farben für Ausgabe
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Bereinigung der Dateistruktur für nscale-assist-app ===${NC}"
echo "Dieses Skript entfernt duplizierte Dateien gemäß dem Bereinigungsplan."
echo "Vor dem Löschen werden Sicherungskopien erstellt."

# Verzeichnis für Backups erstellen
BACKUP_DIR="/opt/nscale-assist/app/backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
echo -e "${GREEN}Backup-Verzeichnis erstellt: $BACKUP_DIR${NC}"

# Funktion zum Sichern und Löschen einer Datei
backup_and_remove() {
    local file=$1
    if [ -f "$file" ]; then
        # Erstelle das Verzeichnis im Backup
        local backup_path="$BACKUP_DIR$file"
        mkdir -p "$(dirname "$backup_path")"
        
        # Kopiere die Datei zum Backup
        cp "$file" "$backup_path"
        
        # Lösche die Originaldatei
        rm "$file"
        echo -e "${GREEN}Gesichert und entfernt: $file${NC}"
    else
        echo -e "${YELLOW}Datei nicht gefunden, übersprungen: $file${NC}"
    fi
}

# Funktion zum Sichern und Löschen eines Verzeichnisses
backup_and_remove_dir() {
    local dir=$1
    if [ -d "$dir" ]; then
        # Erstelle das Verzeichnis im Backup
        local backup_dir="$BACKUP_DIR$dir"
        mkdir -p "$(dirname "$backup_dir")"
        
        # Kopiere das Verzeichnis zum Backup
        cp -r "$dir" "$backup_dir"
        
        # Lösche das Originalverzeichnis
        rm -rf "$dir"
        echo -e "${GREEN}Verzeichnis gesichert und entfernt: $dir${NC}"
    else
        echo -e "${YELLOW}Verzeichnis nicht gefunden, übersprungen: $dir${NC}"
    fi
}

echo -e "${BLUE}\n1. Dokumentenkonverter-Skript-Duplikate entfernen${NC}"
# Liste der zu entfernenden Dokumentenkonverter-Skript-Duplikate
backup_and_remove "/opt/nscale-assist/app/frontend/js/vue/doc-converter.js"
backup_and_remove "/opt/nscale-assist/app/frontend/static/js/vue/doc-converter.js"
backup_and_remove "/opt/nscale-assist/app/frontend/vue/standalone/doc-converter.js"
backup_and_remove "/opt/nscale-assist/app/frontend/static/vue/standalone/doc-converter.js"
backup_and_remove "/opt/nscale-assist/app/static/vue/standalone/doc-converter.js"
backup_and_remove "/opt/nscale-assist/app/static/js/vue/doc-converter.js"
backup_and_remove "/opt/nscale-assist/app/frontend/js/vue/doc-converter-nomodule.js"
backup_and_remove "/opt/nscale-assist/app/frontend/static/js/vue/doc-converter-nomodule.js"
backup_and_remove "/opt/nscale-assist/app/frontend/static/vue/standalone/doc-converter-nomodule.js"
backup_and_remove "/opt/nscale-assist/app/frontend/static/js/doc-converter-fallback.js"
backup_and_remove "/opt/nscale-assist/app/frontend/static/js/doc-converter-debug.js"
backup_and_remove "/opt/nscale-assist/app/frontend/static/js/doc-converter-init.js"

echo -e "${BLUE}\n2. Vue-Komponenten-Duplikate entfernen${NC}"
# Liste der zu entfernenden Vue-Komponenten-Duplikate
backup_and_remove "/opt/nscale-assist/app/frontend/vue/standalone/admin-feedback.js"
backup_and_remove "/opt/nscale-assist/app/frontend/vue/standalone/admin-motd.js"
backup_and_remove "/opt/nscale-assist/app/frontend/vue/standalone/admin-system.js"
backup_and_remove "/opt/nscale-assist/app/frontend/vue/standalone/admin-users.js"
backup_and_remove "/opt/nscale-assist/app/frontend/vue/standalone/chat-interface.js"

# Entferne alle Dateien in den folgenden Verzeichnissen
backup_and_remove_dir "/opt/nscale-assist/app/frontend/static/vue/standalone"
backup_and_remove_dir "/opt/nscale-assist/app/static/vue/standalone"

echo -e "${BLUE}\n3. Feature-Toggle-Dateien bereinigen${NC}"
# Liste der zu entfernenden Feature-Toggle-Duplikate
backup_and_remove "/opt/nscale-assist/app/frontend/js/vue/feature-toggle.js"
backup_and_remove "/opt/nscale-assist/app/frontend/js/vue/feature-toggle-nomodule.js"
backup_and_remove "/opt/nscale-assist/app/frontend/static/js/vue/feature-toggle.js"
backup_and_remove "/opt/nscale-assist/app/frontend/static/js/vue/feature-toggle-nomodule.js"
backup_and_remove "/opt/nscale-assist/app/frontend/static/vue/standalone/feature-toggle.js"
backup_and_remove "/opt/nscale-assist/app/frontend/static/vue/standalone/feature-toggle-nomodule.js"
backup_and_remove "/opt/nscale-assist/app/static/js/feature-toggle-enhanced.js"
backup_and_remove "/opt/nscale-assist/app/static/vue/standalone/feature-toggle.js"
backup_and_remove "/opt/nscale-assist/app/static/vue/standalone/feature-toggle-nomodule.js"

echo -e "${BLUE}\n4. CSS-Dateien bereinigen${NC}"
# Liste der zu entfernenden CSS-Duplikate
backup_and_remove "/opt/nscale-assist/app/frontend/static/css/doc-converter-fix.css"
backup_and_remove "/opt/nscale-assist/app/frontend/static/css/vue-template-fix.css"
backup_and_remove "/opt/nscale-assist/app/frontend/static/css/height-fix.css"
backup_and_remove "/opt/nscale-assist/app/frontend/static/css/doc-converter-position-fix.css"
backup_and_remove "/opt/nscale-assist/app/frontend/static/css/feedback-icons-fix.css"
backup_and_remove "/opt/nscale-assist/app/static/css/doc-converter-fix.css"
backup_and_remove "/opt/nscale-assist/app/static/css/doc-converter-position-fix.css"
backup_and_remove "/opt/nscale-assist/app/static/css/feedback-icons-fix.css"
backup_and_remove "/opt/nscale-assist/app/static/css/vue-template-fix.css"
backup_and_remove "/opt/nscale-assist/app/static/css/height-fix.css"
backup_and_remove "/opt/nscale-assist/app/api/static/css/doc-converter-fix.css"
backup_and_remove "/opt/nscale-assist/app/api/static/css/vue-template-fix.css"
backup_and_remove "/opt/nscale-assist/app/api/static/css/height-fix.css"
backup_and_remove "/opt/nscale-assist/app/api/static/css/feedback-icons-fix.css"

echo -e "${BLUE}\n5. Fix- und Utility-Skripte bereinigen${NC}"
# Liste der zu entfernenden Fix- und Utility-Skript-Duplikate
backup_and_remove "/opt/nscale-assist/app/static/js/admin-doc-converter-fix.js"
backup_and_remove "/opt/nscale-assist/app/static/js/admin-tab-handler.js"
backup_and_remove "/opt/nscale-assist/app/frontend/static/js/force-doc-converter-cleanup.js"
backup_and_remove "/opt/nscale-assist/app/frontend/static/js/admin-tab-handler.js"
backup_and_remove "/opt/nscale-assist/app/frontend/static/js/admin-doc-converter-fix.js"
backup_and_remove "/opt/nscale-assist/app/frontend/static/js/vue-settings-integration.js"
backup_and_remove "/opt/nscale-assist/app/frontend/static/js/enhanced-chat.js"

echo -e "${BLUE}\n6. Leere Verzeichnisse entfernen${NC}"
# Entferne leere Verzeichnisse, starte bei den tiefsten Ebenen
find /opt/nscale-assist/app/frontend/static -type d -empty -delete 2>/dev/null
find /opt/nscale-assist/app/static -type d -empty -delete 2>/dev/null
find /opt/nscale-assist/app/api/static -type d -empty -delete 2>/dev/null
echo -e "${GREEN}Leere Verzeichnisse wurden entfernt${NC}"

echo -e "${BLUE}\nBereinigung abgeschlossen${NC}"
echo -e "${GREEN}Alle Dateien wurden in $BACKUP_DIR gesichert${NC}"
echo -e "${YELLOW}Hinweis: Überprüfen Sie die Anwendung, um sicherzustellen, dass alles noch funktioniert${NC}"
echo -e "${YELLOW}Bei Problemen können Sie die Dateien aus dem Backup wiederherstellen${NC}"