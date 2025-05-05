#!/bin/bash

# Build-and-Deploy-Skript für die Vue.js-Anwendung
# Dieses Skript baut die Vue.js-Anwendung und stellt sie bereit
# Kann automatisiert in CI/CD-Pipelines verwendet werden

# Fehler sofort abfangen
set -e

# Farben für bessere Lesbarkeit
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Log-Funktion
log() {
  echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
  echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] FEHLER:${NC} $1"
}

warn() {
  echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNUNG:${NC} $1"
}

# Root-Verzeichnis des Projekts
PROJECT_ROOT="/opt/nscale-assist/app"
VUE_APP_DIR="${PROJECT_ROOT}/nscale-vue"
DIST_DIR="${VUE_APP_DIR}/dist"

# 1. Zur Vue.js-App wechseln
log "Wechsle zum Vue.js-App-Verzeichnis: ${VUE_APP_DIR}"
cd "${VUE_APP_DIR}"

# 2. NPM-Abhängigkeiten installieren (falls nötig)
log "Installiere/Aktualisiere NPM-Abhängigkeiten..."
npm install

# 3. Vue.js App bauen
log "Baue Vue.js-Anwendung mit 'npm run build'..."
npm run build

# 4. Prüfe, ob der Build erfolgreich war
if [ ! -d "${DIST_DIR}" ]; then
  error "Build-Verzeichnis '${DIST_DIR}' nicht gefunden. Build fehlgeschlagen!"
  exit 1
fi

if [ ! -f "${DIST_DIR}/index.html" ]; then
  error "index.html im Build-Verzeichnis fehlt. Build unvollständig!"
  exit 1
fi

log "Vue.js-Build erfolgreich erstellt in: ${DIST_DIR}"

# 5. Backup des aktuellen Produktionsstands erstellen
TIMESTAMP=$(date +%Y%m%d%H%M%S)
log "Erstelle Backup der aktuellen Produktionsdateien mit Zeitstempel: ${TIMESTAMP}"

BACKUP_DIR="${PROJECT_ROOT}/backups/vue-${TIMESTAMP}"
mkdir -p "${BACKUP_DIR}"

# Nur Backup erstellen, wenn es bereits einen Vue-Build gibt
if [ -d "${PROJECT_ROOT}/static/vue" ]; then
  cp -r "${PROJECT_ROOT}/static/vue" "${BACKUP_DIR}/"
  log "Backup erstellt: ${BACKUP_DIR}/vue"
fi

# 6. Build-Dateien in verschiedene Verzeichnisse kopieren für maximale Kompatibilität
log "Kopiere Build-Dateien in die Zielverzeichnisse..."

# Hauptverzeichnisse erstellen/bereinigen
for DIR in "${PROJECT_ROOT}/static/vue" "${PROJECT_ROOT}/frontend/vue" "${PROJECT_ROOT}/static/assets" "${PROJECT_ROOT}/frontend/assets"; do
  mkdir -p "${DIR}"
  # Bereinigen alter Dateien, nur im assets-Verzeichnis
  if [[ "${DIR}" == *"/assets" ]]; then
    rm -rf "${DIR}"/*
    log "Verzeichnis ${DIR} bereinigt"
  fi
done

# Kopiere index.html in beide Hauptverzeichnisse
cp "${DIST_DIR}/index.html" "${PROJECT_ROOT}/static/index.html"
cp "${DIST_DIR}/index.html" "${PROJECT_ROOT}/frontend/index.html.vue"
log "index.html in die Hauptverzeichnisse kopiert"

# Kopiere Assets in verschiedene Verzeichnisse
cp -r "${DIST_DIR}/assets"/* "${PROJECT_ROOT}/static/vue/assets/"
cp -r "${DIST_DIR}/assets"/* "${PROJECT_ROOT}/frontend/vue/assets/"
cp -r "${DIST_DIR}/assets"/* "${PROJECT_ROOT}/static/assets/"
cp -r "${DIST_DIR}/assets"/* "${PROJECT_ROOT}/frontend/assets/"
log "Asset-Dateien in alle Zielverzeichnisse kopiert"

# 7. Standalone-Komponenten kopieren
mkdir -p "${PROJECT_ROOT}/static/vue/standalone" "${PROJECT_ROOT}/frontend/vue/standalone"

# JS-Dateien in standalone-Verzeichnisse kopieren
for FILE in $(find "${DIST_DIR}/assets/js" -maxdepth 1 -type f -name "*.js" | grep -vE "main|_plugin-vue_export-helper|purify.es|vue-router"); do
  BASENAME=$(basename "${FILE}")
  cp "${FILE}" "${PROJECT_ROOT}/static/vue/standalone/${BASENAME}"
  cp "${FILE}" "${PROJECT_ROOT}/frontend/vue/standalone/${BASENAME}"
  log "Standalone-Komponente ${BASENAME} kopiert"
done

# 8. Feature-Flag-Aktualisierung: Vue.js vollständig erzwingen
TOGGLE_SCRIPT="${PROJECT_ROOT}/static/js/force-enable-vue.js"

cat > "${TOGGLE_SCRIPT}" << 'EOF'
// Vollständige Vue.js-Aktivierung
document.addEventListener('DOMContentLoaded', function() {
    console.log("[force-enable-vue] Vue.js vollständig aktivieren (keine Fallbacks mehr)");
    try {
        // Vue.js als einzige UI festlegen
        localStorage.setItem('useNewUI', 'true');
        localStorage.setItem('feature_useNewUI', 'true');
        
        // Alle Vue-Komponenten permanent aktivieren
        localStorage.setItem('feature_vueDocConverter', 'true');
        localStorage.setItem('feature_vueSettings', 'true');
        localStorage.setItem('feature_vueAdmin', 'true');
        localStorage.setItem('feature_vueChat', 'true');
        
        // Alte Feature-Flags entfernen
        localStorage.removeItem('useOldUI');
        localStorage.removeItem('disableVue');
        
        // Vollständige Migration festschreiben
        localStorage.setItem('vue_migration_complete', 'true');
        
        console.log("[force-enable-vue] Alle Vue.js-Komponenten sind dauerhaft aktiviert");
        
        // Event auslösen, damit die Seite sofort die Vue.js-Komponenten lädt
        setTimeout(function() {
            let event = new CustomEvent('vue-features-enabled', { detail: true });
            document.dispatchEvent(event);
            console.log("[force-enable-vue] Vue-Features-Enabled Event ausgelöst");
        }, 100);
    } catch (error) {
        console.error("[force-enable-vue] Fehler beim Aktivieren von Vue.js:", error);
    }
});
EOF

log "Feature-Toggle-Skript erstellt: ${TOGGLE_SCRIPT}"

# 9. Vue.js-Modus für den Server aktivieren
SERVER_CONFIG="${PROJECT_ROOT}/config/server_config.json"

# Erstelle Verzeichnis falls es nicht existiert
mkdir -p "$(dirname "${SERVER_CONFIG}")"

# Erstelle oder aktualisiere die Server-Konfiguration
if [ -f "${SERVER_CONFIG}" ]; then
  # Wenn die Datei existiert, aktualisiere nur die Vue.js-Einstellung
  TMP_FILE=$(mktemp)
  jq '.useVueJS = true' "${SERVER_CONFIG}" > "${TMP_FILE}" && mv "${TMP_FILE}" "${SERVER_CONFIG}"
  log "Server-Konfiguration aktualisiert: Vue.js-Modus aktiviert"
else
  # Erstelle neue Konfigurationsdatei
  cat > "${SERVER_CONFIG}" << EOF
{
  "useVueJS": true,
  "vueJSBuildPath": "${VUE_APP_DIR}/dist",
  "debug": false,
  "logLevel": "info"
}
EOF
  log "Neue Server-Konfiguration erstellt mit aktiviertem Vue.js-Modus"
fi

# 10. Berechtigungen setzen
chmod -R 755 "${PROJECT_ROOT}/static" "${PROJECT_ROOT}/frontend"

# 11. Erfolg melden
log "Vue.js-Anwendung erfolgreich gebaut und bereitgestellt!"
log "Für die Aktivierung der Änderungen muss der Server neu gestartet werden."
log "Verwenden Sie: 'sudo systemctl restart nscale-assist-server.service' (falls verfügbar)"

# Informationen zu nächsten Schritten
echo
echo "================================================================================"
echo "Deployment abgeschlossen! Nächste Schritte:"
echo
echo "1. Server neustarten: 'sudo systemctl restart nscale-assist-server.service'"
echo "2. Zugriff auf: http://localhost:8000 (oder entsprechende Server-URL)"
echo "3. Falls Probleme auftreten, prüfen Sie die Server-Logs"
echo "================================================================================"