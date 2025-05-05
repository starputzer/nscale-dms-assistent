#!/bin/bash

# crontab-setup.sh
# Richtet einen Cron-Job für den automatischen Build und Deployment ein

# Farben für bessere Lesbarkeit
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Log-Funktionen
log() {
  echo -e "${GREEN}[Info]${NC} $1"
}

warn() {
  echo -e "${YELLOW}[Warnung]${NC} $1"
}

error() {
  echo -e "${RED}[Fehler]${NC} $1" >&2
}

# Prüfe, ob das Skript als root ausgeführt wird
if [ "$(id -u)" -ne 0 ]; then
  warn "Dieses Skript sollte als root oder mit sudo ausgeführt werden."
  read -p "Fortfahren? (j/n): " proceed
  if [ "$proceed" != "j" ]; then
    exit 1
  fi
fi

# Projektverzeichnis definieren
PROJECT_ROOT="/opt/nscale-assist/app"
AUTO_BUILD_SCRIPT="${PROJECT_ROOT}/auto-build.sh"

# Prüfe, ob auto-build.sh existiert
if [ ! -f "$AUTO_BUILD_SCRIPT" ]; then
  error "Das auto-build.sh Skript wurde nicht gefunden: $AUTO_BUILD_SCRIPT"
  exit 1
fi

# Stelle sicher, dass das Skript ausführbar ist
chmod +x "$AUTO_BUILD_SCRIPT"

# Konfiguriere Cron-Eintrag für den aktuellen Benutzer
CURRENT_USER=$(whoami)
log "Konfiguriere Cron-Job für Benutzer: $CURRENT_USER"

# Cron-Einträge je nach Bedarf anpassen
echo "Wähle eine Option für den automatischen Build:"
echo "1) Täglich (empfohlen)"
echo "2) Wöchentlich"
echo "3) Stündlich (nur für Tests)"
echo "4) Manuell entfernen"

read -p "Option (1-4): " cron_option

CRON_ENTRY=""
case $cron_option in
  1)
    # Täglich um 3 Uhr
    CRON_ENTRY="0 3 * * * $AUTO_BUILD_SCRIPT > ${PROJECT_ROOT}/logs/cron-build.log 2>&1"
    log "Täglicher Cron-Job um 3 Uhr wird eingerichtet"
    ;;
  2)
    # Wöchentlich am Sonntag um 3 Uhr
    CRON_ENTRY="0 3 * * 0 $AUTO_BUILD_SCRIPT > ${PROJECT_ROOT}/logs/cron-build.log 2>&1"
    log "Wöchentlicher Cron-Job (Sonntags, 3 Uhr) wird eingerichtet"
    ;;
  3)
    # Stündlich (für Tests)
    CRON_ENTRY="0 * * * * $AUTO_BUILD_SCRIPT > ${PROJECT_ROOT}/logs/cron-build.log 2>&1"
    warn "Stündlicher Cron-Job wird eingerichtet (nur für Tests geeignet!)"
    ;;
  4)
    log "Cron-Job wird entfernt..."
    (crontab -l 2>/dev/null | grep -v "$AUTO_BUILD_SCRIPT") | crontab -
    log "Cron-Job wurde entfernt"
    exit 0
    ;;
  *)
    error "Ungültige Option"
    exit 1
    ;;
esac

# Logs-Verzeichnis erstellen
mkdir -p "${PROJECT_ROOT}/logs"

# Füge Cron-Eintrag hinzu, wenn er noch nicht existiert
if crontab -l 2>/dev/null | grep -q "$AUTO_BUILD_SCRIPT"; then
  warn "Es existiert bereits ein Cron-Job für auto-build.sh. Dieser wird ersetzt."
  (crontab -l 2>/dev/null | grep -v "$AUTO_BUILD_SCRIPT"; echo "$CRON_ENTRY") | crontab -
else
  (crontab -l 2>/dev/null; echo "$CRON_ENTRY") | crontab -
fi

# Überprüfe, ob der Cron-Job erfolgreich hinzugefügt wurde
if crontab -l 2>/dev/null | grep -q "$AUTO_BUILD_SCRIPT"; then
  log "Cron-Job erfolgreich eingerichtet!"
  echo -e "\nAktueller Crontab:"
  crontab -l
else
  error "Fehler beim Einrichten des Cron-Jobs"
  exit 1
fi

# Test-Option anbieten
log "Cron-Job wurde eingerichtet. Soll ein Test-Build jetzt ausgeführt werden?"
read -p "Test jetzt durchführen? (j/n): " test_now

if [ "$test_now" = "j" ]; then
  log "Test-Build wird gestartet..."
  $AUTO_BUILD_SCRIPT
  log "Test abgeschlossen."
else
  log "Der Cron-Job wird zum geplanten Zeitpunkt ausgeführt."
fi

log "Setup abgeschlossen!"