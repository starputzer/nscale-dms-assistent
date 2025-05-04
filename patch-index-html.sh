#!/bin/bash
# patch-index-html.sh
# Aktualisiert die Pfade in index.html gemäß der neuen Dateistruktur

ROOT_DIR="/opt/nscale-assist/app"
FRONTEND_DIR="${ROOT_DIR}/frontend"

# Farben für Ausgabe
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Aktualisierung der Pfade in index.html ===${NC}"
echo "Dieses Skript aktualisiert die Pfade in der index.html-Datei auf die neue Struktur."

# Sicherheitsabfrage
read -p "Diese Aktion wird index.html modifizieren. Fortfahren? (j/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Jj]$ ]]
then
    echo "Abgebrochen."
    exit 1
fi

# Erstelle ein Backup
BACKUP_FILE="${FRONTEND_DIR}/index.html.backup-$(date +%Y%m%d-%H%M%S)"
if [ -f "${FRONTEND_DIR}/index.html" ]; then
    cp ${FRONTEND_DIR}/index.html "$BACKUP_FILE"
    echo -e "${GREEN}Backup erstellt: $BACKUP_FILE${NC}"
else
    echo -e "${RED}FEHLER: ${FRONTEND_DIR}/index.html nicht gefunden!${NC}"
    exit 1
fi

# Temporäre Kopie erstellen, um Zwischenergebnisse zu speichern
TMP_HTML="${FRONTEND_DIR}/index.html.tmp"
cp "${FRONTEND_DIR}/index.html" "$TMP_HTML"

# CSS-Klasse für Vue-Template-Container hinzufügen
echo "Füge Vue-Template-Container CSS-Klasse hinzu..."
cat > "${FRONTEND_DIR}/css/vue-template-fix.css" << 'EOF'
/* Vue Template Fix CSS */
.vue-template-container {
  display: none !important;
}
EOF

# CSS-Referenz in den <head> einfügen
sed -i '/<\/head>/i \    <link rel="stylesheet" href="/css/vue-template-fix.css">' "$TMP_HTML"

# 1. DocConverter-Tab inline-Script entfernen und durch externe Referenz ersetzen
echo "Entferne DocConverter inline-Script..."

# Alle <script>-Tags finden, die "DocConverter-Tab inline script" oder "initializeDocConverter" enthalten
if grep -q "DocConverter-Tab inline script\|initializeDocConverter" "$TMP_HTML"; then
    # Temporäre Datei für die Verarbeitung
    TMP_FILE=$(mktemp)
    
    # Verwende awk, um den Bereich zwischen <script> und </script> zu identifizieren und zu ersetzen
    awk '
    BEGIN { scriptFound = 0; outputSuppress = 0; }
    
    /<script>.*DocConverter-Tab inline script/ || /<script>.*initializeDocConverter/ {
        scriptFound = 1;
        outputSuppress = 1;
        print "<!-- Externes Script zur Initialisierung des Dokumentenkonverters -->";
        print "<script src=\"/static/js/vue/doc-converter-initializer.js\"></script>";
        next;
    }
    
    /<\/script>/ {
        if (outputSuppress) {
            outputSuppress = 0;
            next;
        }
    }
    
    {
        if (!outputSuppress) print;
    }
    ' "$TMP_HTML" > "$TMP_FILE"
    
    # Ergebnis zurück in die temporäre HTML-Datei kopieren
    mv "$TMP_FILE" "$TMP_HTML"
    echo "DocConverter-Script erfolgreich ersetzt"
else
    echo "WARNUNG: Kein DocConverter-Script gefunden"
    # Füge das Script trotzdem vor dem schließenden </body>-Tag ein
    sed -i 's|</body>|    <!-- Externes Script zur Initialisierung des Dokumentenkonverters -->\n    <script src="/static/js/vue/doc-converter-initializer.js"></script>\n</body>|' "$TMP_HTML"
    echo "DocConverter-Initializer vor </body> hinzugefügt"
fi

# 2. Feature-Toggle inline-Script entfernen und durch externe Referenz ersetzen
echo "Entferne Feature-Toggle inline-Script..."

# Alle <script>-Tags finden, die "Feature-Toggle-UI" enthalten
if grep -q "Feature-Toggle-UI\|initFeatureToggleHTML" "$TMP_HTML"; then
    # Temporäre Datei für die Verarbeitung
    TMP_FILE=$(mktemp)
    
    # Verwende awk, um den Bereich zwischen <script> und </script> zu identifizieren und zu ersetzen
    awk '
    BEGIN { scriptFound = 0; outputSuppress = 0; }
    
    /<script>.*Feature-Toggle-UI/ || /<script>.*initFeatureToggleHTML/ {
        scriptFound = 1;
        outputSuppress = 1;
        print "<!-- Externes Script für die Feature-Toggle-UI -->";
        print "<script src=\"/static/js/vue/feature-toggle-manager.js\"></script>";
        next;
    }
    
    /<\/script>/ {
        if (outputSuppress) {
            outputSuppress = 0;
            next;
        }
    }
    
    {
        if (!outputSuppress) print;
    }
    ' "$TMP_HTML" > "$TMP_FILE"
    
    # Ergebnis zurück in die temporäre HTML-Datei kopieren
    mv "$TMP_FILE" "$TMP_HTML"
    echo "Feature-Toggle-Script erfolgreich ersetzt"
else
    echo "WARNUNG: Kein Feature-Toggle-Script gefunden"
    # Füge das Script trotzdem vor dem schließenden </body>-Tag ein
    sed -i 's|</body>|    <!-- Externes Script für die Feature-Toggle-UI -->\n    <script src="/static/js/vue/feature-toggle-manager.js"></script>\n</body>|' "$TMP_HTML"
    echo "Feature-Toggle-Manager vor </body> hinzugefügt"
fi

# 3. Vue.js laden, falls noch nicht vorhanden
if ! grep -q "vue@3" "$TMP_HTML"; then
    echo "Füge Vue.js CDN-Link hinzu..."
    sed -i 's|</head>|    <script src="https://unpkg.com/vue@3.2.31/dist/vue.global.js"></script>\n</head>|' "$TMP_HTML"
fi

# 3b. Lade doc-converter-fallback.js früh im Header
if ! grep -q "doc-converter-fallback.js" "$TMP_HTML"; then
    echo "Füge doc-converter-fallback.js früh hinzu..."
    sed -i 's|</head>|    <script src="/frontend/js/doc-converter-fallback.js"></script>\n</head>|' "$TMP_HTML"
fi

# 4. Template-Lösungen: Template-Inhalte in versteckte div-Container verschieben
echo "Optimiere Inline-Templates für Vue.js..."

# Temporäre Datei für die Verarbeitung
TMP_FILE=$(mktemp)

# Verwende awk, um Template-Inhalte in versteckte div-Container zu verschieben
awk '
BEGIN { inVueTemplate = 0; templateContent = ""; templateId = 0; }

/<template>/ {
    inVueTemplate = 1;
    templateContent = "";
    templateId++;
    next;
}

/<\/template>/ {
    if (inVueTemplate) {
        print "<div id=\"vue-template-" templateId "\" class=\"vue-template-container\">";
        print templateContent;
        print "</div>";
        inVueTemplate = 0;
        next;
    }
}

{
    if (inVueTemplate) {
        templateContent = templateContent $0 "\n";
    } else {
        print;
    }
}
' "$TMP_HTML" > "$TMP_FILE"

# Ergebnis zurück in die temporäre HTML-Datei kopieren
mv "$TMP_FILE" "$TMP_HTML"

# CSS-Pfade aktualisieren
echo -e "${BLUE}\n1. CSS-Pfade aktualisieren${NC}"
sed -i 's|/static/css/height-fix.css|/frontend/css/height-fix.css|g' "$TMP_HTML"
sed -i 's|/static/css/doc-converter-fix.css|/frontend/css/doc-converter-fix.css|g' "$TMP_HTML"
sed -i 's|/static/css/feedback-icons-fix.css|/frontend/css/feedback-icons-fix.css|g' "$TMP_HTML"
sed -i 's|/static/css/doc-converter-position-fix.css|/frontend/css/doc-converter-position-fix.css|g' "$TMP_HTML"
sed -i 's|/static/css/doc-converter-visibility-fix.css|/frontend/css/doc-converter-visibility-fix.css|g' "$TMP_HTML"
echo -e "${GREEN}CSS-Pfade aktualisiert${NC}"

# JavaScript-Pfade aktualisieren
echo -e "${BLUE}\n2. JavaScript-Pfade aktualisieren${NC}"
sed -i 's|/static/js/force-enable-vue.js|/frontend/js/force-enable-vue.js|g' "$TMP_HTML"
sed -i 's|/static/js/doc-converter-visibility-fix.js|/frontend/js/doc-converter-visibility-fix.js|g' "$TMP_HTML"
sed -i 's|/static/js/doc-converter-path-tester.js|/frontend/js/doc-converter-path-tester.js|g' "$TMP_HTML"
sed -i 's|/static/js/doc-converter-module-redirector.js|/frontend/js/doc-converter-module-redirector.js|g' "$TMP_HTML"
sed -i 's|/static/js/doc-converter-path-logger.js|/frontend/js/doc-converter-path-logger.js|g' "$TMP_HTML"
sed -i 's|/static/js/doc-converter-debug.js|/frontend/js/doc-converter-debug.js|g' "$TMP_HTML"
sed -i 's|/static/js/doc-converter-direct-fix.js|/frontend/js/doc-converter-direct-fix.js|g' "$TMP_HTML"
sed -i 's|/static/js/doc-converter-diagnostics-enhanced.js|/frontend/js/doc-converter-diagnostics-enhanced.js|g' "$TMP_HTML"
sed -i 's|/static/js/doc-converter-diagnostics.js|/frontend/js/doc-converter-diagnostics.js|g' "$TMP_HTML"
sed -i 's|/static/js/doc-converter-adapter.js|/frontend/js/doc-converter-adapter.js|g' "$TMP_HTML"
sed -i 's|/static/js/features-ui-fix.js|/frontend/js/features-ui-fix.js|g' "$TMP_HTML"
sed -i 's|/static/js/doc-converter-tab-fix.js|/frontend/js/doc-converter-tab-fix.js|g' "$TMP_HTML"
sed -i 's|/static/js/doc-converter-fallback.js|/frontend/js/doc-converter-fallback.js|g' "$TMP_HTML"
echo -e "${GREEN}JavaScript-Pfade aktualisiert${NC}"

# Vue.js-Pfade aktualisieren
echo -e "${BLUE}\n3. Vue.js-Pfade aktualisieren${NC}"
sed -i 's|/static/vue/assets/js/doc-converter.1f752d32.js|/api/static/vue/standalone/doc-converter.ae5f301b.js|g' "$TMP_HTML"
sed -i 's|/static/vue/assets/js/doc-converter.js|/api/static/vue/standalone/doc-converter.js|g' "$TMP_HTML"
sed -i 's|/static/vue/dist/assets/js/doc-converter.js|/api/static/vue/standalone/doc-converter.js|g' "$TMP_HTML"
sed -i 's|/static/vue/standalone/doc-converter.js|/api/static/vue/standalone/doc-converter.js|g' "$TMP_HTML"
sed -i 's|/static/vue/src/standalone/doc-converter.js|/nscale-vue/src/standalone/doc-converter.js|g' "$TMP_HTML"
sed -i 's|/static/js/vue/doc-converter-initializer.js|/frontend/js/vue/doc-converter-initializer.js|g' "$TMP_HTML"
sed -i 's|/static/js/vue/feature-toggle-manager.js|/frontend/js/vue/feature-toggle-manager.js|g' "$TMP_HTML"
echo -e "${GREEN}Vue.js-Pfade aktualisiert${NC}"

# Pfad-Array für Dokumentenkonverter aktualisieren
echo -e "${BLUE}\n4. Pfad-Array für Dokumentenkonverter aktualisieren${NC}"
sed -i "s|const possiblePaths = \[.*\]|const possiblePaths = ['/api/static/vue/standalone/doc-converter.js', '/api/static/vue/standalone/doc-converter.ae5f301b.js', '/nscale-vue/src/standalone/doc-converter.js']|" "$TMP_HTML"
echo -e "${GREEN}Pfad-Array aktualisiert${NC}"

# Fertigstellen
mv "$TMP_HTML" "${FRONTEND_DIR}/index.html"
echo -e "${BLUE}\nindex.html wurde erfolgreich aktualisiert!${NC}"
echo -e "${GREEN}Originaldatei gesichert unter: $BACKUP_FILE${NC}"
echo -e "${YELLOW}Hinweis: Überprüfen Sie die Anwendung, um sicherzustellen, dass alles noch funktioniert${NC}"
echo -e "${YELLOW}Bei Problemen können Sie die Backup-Datei wiederherstellen${NC}"