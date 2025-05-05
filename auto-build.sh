#!/bin/bash

# auto-build.sh
# Automatisiertes Build- und Deployment-Skript für nscale-assist Vue.js
# Kann als Cron-Job oder im CI/CD-Prozess verwendet werden

# Fehlerbehandlung aktivieren
set -e

# Konfiguration
PROJECT_ROOT="/opt/nscale-assist/app"
VUE_APP_DIR="${PROJECT_ROOT}/nscale-vue"
DIST_DIR="${VUE_APP_DIR}/dist"
STATIC_DIR="${PROJECT_ROOT}/static"
LOG_FILE="${PROJECT_ROOT}/logs/auto-build.log"
GIT_REPO_URL="file://${PROJECT_ROOT}"  # Lokales Git-Repository
TIMESTAMP=$(date +%Y%m%d%H%M%S)
AUTO_RESTART=${AUTO_RESTART:-false}  # Parameter für automatischen Neustart, default: false
SLACK_WEBHOOK=${SLACK_WEBHOOK:-""}  # Optional: Slack Webhook URL

# Farbdefinitionen
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'  # No Color

# Logs-Verzeichnis erstellen
mkdir -p "$(dirname "$LOG_FILE")"

# Log-Funktionen
log() {
    local message="[$(date +'%Y-%m-%d %H:%M:%S')] $1"
    echo -e "${GREEN}${message}${NC}"
    echo "$message" >> "$LOG_FILE"
}

warn() {
    local message="[$(date +'%Y-%m-%d %H:%M:%S')] WARNUNG: $1"
    echo -e "${YELLOW}${message}${NC}" >&2
    echo "$message" >> "$LOG_FILE"
}

error() {
    local message="[$(date +'%Y-%m-%d %H:%M:%S')] FEHLER: $1"
    echo -e "${RED}${message}${NC}" >&2
    echo "$message" >> "$LOG_FILE"
}

# Funktion für Slack-Benachrichtigungen (falls konfiguriert)
notify() {
    local status=$1
    local message=$2
    
    if [ -n "$SLACK_WEBHOOK" ]; then
        local color="good"
        if [ "$status" == "error" ]; then
            color="danger"
        elif [ "$status" == "warning" ]; then
            color="warning"
        fi
        
        # Slack Payload
        local payload="{\"attachments\": [{\"color\": \"${color}\", \"title\": \"nscale-assist Build\", \"text\": \"${message}\", \"footer\": \"Auto-Build System\"}]}"
        
        # Sende Nachricht
        curl -s -X POST -H 'Content-type: application/json' --data "$payload" "$SLACK_WEBHOOK" > /dev/null || true
    fi
}

# Startmeldung
log "Auto-Build für nscale-assist Vue.js gestartet"

# Laufzeitprüfung
if ! command -v npm &> /dev/null; then
    error "npm ist nicht installiert. Abbruch."
    notify "error" "Build fehlgeschlagen: npm ist nicht installiert."
    exit 1
fi

# Git-Update (falls git verwendet wird)
if [ -d "${VUE_APP_DIR}/.git" ]; then
    log "Führe Git-Update durch..."
    cd "$VUE_APP_DIR"
    
    # Aktuelle Branch ermitteln
    CURRENT_BRANCH=$(git symbolic-ref --short HEAD 2>/dev/null || echo "detached")
    log "Aktuelle Branch: $CURRENT_BRANCH"
    
    # Änderungen prüfen
    git fetch
    UPDATES=$(git rev-list HEAD..origin/$CURRENT_BRANCH --count 2>/dev/null || echo "0")
    
    if [ "$UPDATES" -gt "0" ]; then
        log "$UPDATES neue Commits gefunden. Update wird durchgeführt..."
        
        # Stash lokale Änderungen
        git stash -m "Auto-stash vor Pull am $TIMESTAMP" || true
        
        # Pull mit Rebase durchführen
        if git pull --rebase origin "$CURRENT_BRANCH"; then
            log "Git-Update erfolgreich."
            
            # Stash anwenden, falls vorhanden
            if git stash list | grep -q "Auto-stash vor Pull am $TIMESTAMP"; then
                if git stash pop; then
                    log "Lokale Änderungen wiederhergestellt."
                else
                    warn "Konflikt beim Wiederherstellen lokaler Änderungen. Bitte manuell prüfen."
                    notify "warning" "Git-Update erfolgreich, aber Konflikte bei lokalen Änderungen."
                fi
            fi
        else
            error "Git-Update fehlgeschlagen."
            notify "error" "Git-Update fehlgeschlagen. Manueller Eingriff erforderlich."
            exit 1
        fi
    else
        log "Keine neuen Commits. Version ist aktuell."
    fi
else
    log "Kein Git-Repository erkannt. Überspringe Git-Update."
fi

# Backup erstellen
BACKUP_DIR="${PROJECT_ROOT}/backups/vue-${TIMESTAMP}"
mkdir -p "$BACKUP_DIR"

if [ -d "$STATIC_DIR" ]; then
    log "Backup erstellen in: $BACKUP_DIR"
    cp -r "$STATIC_DIR" "$BACKUP_DIR/"
    log "Backup erfolgreich erstellt."
fi

# Build ausführen
log "Starte Vue.js-Build..."
cd "$VUE_APP_DIR"

# Dependencies installieren
log "Installiere/Aktualisiere NPM-Dependencies..."
if npm install; then
    log "Dependencies erfolgreich installiert."
else
    error "Fehler beim Installieren der Dependencies."
    notify "error" "Build fehlgeschlagen: Fehler bei npm install"
    exit 1
fi

# Build ausführen
log "Führe 'npm run build' aus..."
if npm run build; then
    log "Vue.js-Build erfolgreich ausgeführt."
else
    error "Vue.js-Build fehlgeschlagen."
    notify "error" "Build fehlgeschlagen: npm run build fehlgeschlagen"
    
    # Backup wiederherstellen
    if [ -d "${BACKUP_DIR}/static" ]; then
        warn "Stelle Backup wieder her..."
        cp -r "${BACKUP_DIR}/static" "$PROJECT_ROOT/"
        log "Backup wiederhergestellt."
    fi
    
    exit 1
fi

# Prüfe Build-Ergebnis
if [ ! -d "$DIST_DIR" ] || [ ! -f "${DIST_DIR}/index.html" ]; then
    error "Build unvollständig oder fehlerhaft."
    notify "error" "Build fehlgeschlagen: Unvollständiger Build"
    
    # Backup wiederherstellen
    if [ -d "${BACKUP_DIR}/static" ]; then
        warn "Stelle Backup wieder her..."
        cp -r "${BACKUP_DIR}/static" "$PROJECT_ROOT/"
        log "Backup wiederhergestellt."
    fi
    
    exit 1
fi

# Deployment
log "Deployment wird durchgeführt..."

# Hauptverzeichnisse erstellen/bereinigen
for DIR in "${PROJECT_ROOT}/static/vue" "${PROJECT_ROOT}/frontend/vue" "${PROJECT_ROOT}/static/assets" "${PROJECT_ROOT}/frontend/assets"; do
    mkdir -p "$DIR"
    
    # Bereinigen alter Dateien, nur im assets-Verzeichnis
    if [[ "$DIR" == *"/assets" ]]; then
        rm -rf "${DIR:?}"/* # Sicherheitscheck für leere DIR-Variable
        log "Verzeichnis $DIR bereinigt"
    fi
done

# Kopiere index.html in beide Hauptverzeichnisse
cp "${DIST_DIR}/index.html" "${PROJECT_ROOT}/static/index.html"
cp "${DIST_DIR}/index.html" "${PROJECT_ROOT}/frontend/index.html.vue"
log "index.html kopiert"

# Kopiere Assets in verschiedene Verzeichnisse
cp -r "${DIST_DIR}/assets"/* "${PROJECT_ROOT}/static/vue/assets/"
cp -r "${DIST_DIR}/assets"/* "${PROJECT_ROOT}/frontend/vue/assets/"
cp -r "${DIST_DIR}/assets"/* "${PROJECT_ROOT}/static/assets/"
cp -r "${DIST_DIR}/assets"/* "${PROJECT_ROOT}/frontend/assets/"
log "Asset-Dateien kopiert"

# Standalone-Komponenten kopieren
mkdir -p "${PROJECT_ROOT}/static/vue/standalone" "${PROJECT_ROOT}/frontend/vue/standalone"

# JS-Dateien in standalone-Verzeichnisse kopieren
for FILE in $(find "${DIST_DIR}/assets/js" -maxdepth 1 -type f -name "*.js" | grep -vE "main|_plugin-vue_export-helper|purify.es|vue-router"); do
    BASENAME=$(basename "$FILE")
    cp "$FILE" "${PROJECT_ROOT}/static/vue/standalone/${BASENAME}"
    cp "$FILE" "${PROJECT_ROOT}/frontend/vue/standalone/${BASENAME}"
    log "Standalone-Komponente $BASENAME kopiert"
done

# Feature-Flag-Aktualisierung: Vue.js vollständig erzwingen
TOGGLE_SCRIPT="${PROJECT_ROOT}/static/js/force-enable-vue.js"
mkdir -p "$(dirname "$TOGGLE_SCRIPT")"

cat > "$TOGGLE_SCRIPT" << 'EOF'
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

log "Feature-Toggle-Skript erstellt"

# Server-Konfiguration aktualisieren
SERVER_CONFIG="${PROJECT_ROOT}/config/server_config.json"
mkdir -p "$(dirname "$SERVER_CONFIG")"

# Erstelle oder aktualisiere die Server-Konfiguration
if [ -f "$SERVER_CONFIG" ]; then
    # Wenn jq verfügbar ist, dann damit bearbeiten
    if command -v jq &> /dev/null; then
        TMP_FILE=$(mktemp)
        jq '.useVueJS = true' "$SERVER_CONFIG" > "$TMP_FILE" && mv "$TMP_FILE" "$SERVER_CONFIG"
        log "Server-Konfiguration aktualisiert: Vue.js-Modus aktiviert"
    else
        # Simple Ersetzung ohne jq
        sed -i 's/"useVueJS":\s*false/"useVueJS": true/g' "$SERVER_CONFIG"
        log "Server-Konfiguration aktualisiert (einfache Ersetzung)"
    fi
else
    # Erstelle neue Konfigurationsdatei
    cat > "$SERVER_CONFIG" << EOF
{
  "useVueJS": true,
  "vueJSBuildPath": "${VUE_APP_DIR}/dist",
  "debug": false,
  "logLevel": "info"
}
EOF
    log "Neue Server-Konfiguration erstellt mit aktiviertem Vue.js-Modus"
fi

# Berechtigungen setzen
chmod -R 755 "${PROJECT_ROOT}/static" "${PROJECT_ROOT}/frontend"
log "Berechtigungen gesetzt"

# Server-Neustart (wenn aktiviert)
if [ "$AUTO_RESTART" = "true" ]; then
    log "Automatischer Server-Neustart wird durchgeführt..."
    
    # Prüfe ob systemd verfügbar ist
    if command -v systemctl &> /dev/null; then
        if systemctl is-active --quiet nscale-assist-server.service; then
            log "Starte nscale-assist-server.service neu..."
            sudo systemctl restart nscale-assist-server.service
            log "Server erfolgreich neu gestartet."
            notify "good" "Build und Deployment erfolgreich. Server wurde neu gestartet."
        else
            warn "nscale-assist-server.service ist nicht aktiv oder existiert nicht."
            notify "warning" "Build erfolgreich, aber Server konnte nicht neu gestartet werden."
        fi
    else
        # Alternative Neustart-Methode für Nicht-systemd-Systeme
        warn "systemctl nicht gefunden. Versuche alternativen Neustart..."
        
        # Prüfe nach PID-Datei
        if [ -f "${PROJECT_ROOT}/server.pid" ]; then
            PID=$(cat "${PROJECT_ROOT}/server.pid")
            if ps -p "$PID" > /dev/null; then
                log "Beende Server-Prozess mit PID $PID..."
                kill "$PID"
                sleep 2
                
                # Prüfe, ob Prozess wirklich beendet wurde
                if ps -p "$PID" > /dev/null; then
                    warn "Server-Prozess konnte nicht beendet werden. Verwende SIGKILL..."
                    kill -9 "$PID" || true
                    sleep 1
                fi
            fi
        fi
        
        # Starte Server neu
        log "Starte Server im Hintergrund..."
        cd "$PROJECT_ROOT"
        nohup python3 -m api.server > "${PROJECT_ROOT}/logs/server.log" 2>&1 &
        echo $! > "${PROJECT_ROOT}/server.pid"
        log "Server im Hintergrund gestartet mit PID $(cat ${PROJECT_ROOT}/server.pid)."
        notify "good" "Build und Deployment erfolgreich. Server wurde neu gestartet."
    fi
else
    log "Automatischer Server-Neustart ist deaktiviert."
    log "Führen Sie einen manuellen Neustart durch mit: sudo systemctl restart nscale-assist-server.service"
    notify "good" "Build und Deployment erfolgreich. Bitte Server manuell neu starten."
fi

# Zusammenfassung
log "Auto-Build und Deployment erfolgreich abgeschlossen!"
log "Zeitstempel: $(date +'%Y-%m-%d %H:%M:%S')"
log "Log-Datei: $LOG_FILE"

echo
echo "================================================================================"
echo "Auto-Build abgeschlossen! Status: ERFOLGREICH"
echo
echo "Die Vue.js-Anwendung wurde erfolgreich gebaut und bereitgestellt."
echo "Für optimale Funktion den Server neu starten, falls noch nicht geschehen."
echo "================================================================================"

exit 0