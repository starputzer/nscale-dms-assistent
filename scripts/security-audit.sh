#!/bin/bash
# security-audit.sh
#
# Dieses Skript führt Sicherheitsaudits für npm-Abhängigkeiten durch
# und generiert einen detaillierten Bericht.
#
# Verwendung: ./scripts/security-audit.sh
#
# Optionen:
#   --production  Nur Produktionsabhängigkeiten prüfen
#   --fix         Versuchen, Sicherheitslücken automatisch zu beheben
#   --report      Einen detaillierten HTML-Bericht generieren
#
# Autor: Claude
# Datum: 11.05.2025

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
REPORT_DIR="$PROJECT_DIR/security-reports"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
REPORT_FILE="$REPORT_DIR/security-report_$TIMESTAMP.html"
LOG_FILE="$REPORT_DIR/security-audit_$TIMESTAMP.log"

# Farbcodes für Konsolenausgabe
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Verzeichnisse erstellen, falls sie nicht existieren
mkdir -p "$REPORT_DIR"

# Parameter verarbeiten
PRODUCTION_ONLY=false
AUTO_FIX=false
GENERATE_REPORT=false

for arg in "$@"; do
  case $arg in
    --production)
      PRODUCTION_ONLY=true
      shift
      ;;
    --fix)
      AUTO_FIX=true
      shift
      ;;
    --report)
      GENERATE_REPORT=true
      shift
      ;;
    *)
      # Unbekannter Parameter
      ;;
  esac
done

# Log-Funktion
log() {
  echo -e "$1" | tee -a "$LOG_FILE"
}

# Sicherheitsüberprüfung durchführen
cd "$PROJECT_DIR"

log "${BLUE}=== nscale-assist Sicherheitsaudit ===${NC}"
log "${BLUE}Zeitstempel: $(date)${NC}"
log "${BLUE}Verzeichnis: $PROJECT_DIR${NC}"
log ""

# Node.js und npm-Version prüfen
log "${BLUE}Node.js Version:${NC}"
node --version | tee -a "$LOG_FILE"
log "${BLUE}npm Version:${NC}"
npm --version | tee -a "$LOG_FILE"
log ""

# Package.json analysieren
log "${BLUE}Analysiere package.json...${NC}"
TOTAL_DEPS=$(jq '.dependencies | length' package.json 2>/dev/null || echo "?")
DEV_DEPS=$(jq '.devDependencies | length' package.json 2>/dev/null || echo "?")
log "Produktionsabhängigkeiten: $TOTAL_DEPS"
log "Entwicklungsabhängigkeiten: $DEV_DEPS"
log ""

# NPM-Audit durchführen
log "${BLUE}Führe npm audit durch...${NC}"

if [ "$PRODUCTION_ONLY" = true ]; then
  log "Prüfe nur Produktionsabhängigkeiten..."
  npm audit --production > "$REPORT_DIR/audit_production_$TIMESTAMP.txt" 2>&1 || true
  AUDIT_OUTPUT=$(cat "$REPORT_DIR/audit_production_$TIMESTAMP.txt")
else
  log "Prüfe alle Abhängigkeiten..."
  npm audit > "$REPORT_DIR/audit_all_$TIMESTAMP.txt" 2>&1 || true
  AUDIT_OUTPUT=$(cat "$REPORT_DIR/audit_all_$TIMESTAMP.txt")
fi

# Ergebnisse analysieren
VULNERABILITIES=$(echo "$AUDIT_OUTPUT" | grep -o '[0-9]* vulnerabilities' | head -1 || echo "0 vulnerabilities")
HIGH_VULNERABILITIES=$(echo "$AUDIT_OUTPUT" | grep -o '[0-9]* high' | head -1 || echo "0 high")
CRITICAL_VULNERABILITIES=$(echo "$AUDIT_OUTPUT" | grep -o '[0-9]* critical' | head -1 || echo "0 critical")

log ""
if [[ "$VULNERABILITIES" == "0 vulnerabilities" ]]; then
  log "${GREEN}Keine Sicherheitslücken gefunden!${NC}"
else
  log "${RED}Sicherheitslücken gefunden: $VULNERABILITIES${NC}"
  log "${RED}Davon kritisch: $CRITICAL_VULNERABILITIES${NC}"
  log "${RED}Davon hoch: $HIGH_VULNERABILITIES${NC}"
  
  # Details anzeigen
  log ""
  log "${YELLOW}Details der Sicherheitslücken:${NC}"
  echo "$AUDIT_OUTPUT" | grep -A 50 "# Run" | tee -a "$LOG_FILE"
  
  # Automatische Behebung, falls angefordert
  if [ "$AUTO_FIX" = true ]; then
    log ""
    log "${YELLOW}Versuche, Sicherheitslücken automatisch zu beheben...${NC}"
    if [ "$PRODUCTION_ONLY" = true ]; then
      npm audit fix --production | tee -a "$LOG_FILE"
    else
      npm audit fix | tee -a "$LOG_FILE"
    fi
    
    # Prüfen, ob weitere manuelle Fixes erforderlich sind
    if [ "$PRODUCTION_ONLY" = true ]; then
      REMAINING=$(npm audit --production 2>&1 | grep -o '[0-9]* vulnerabilities' | head -1 || echo "0 vulnerabilities")
    else
      REMAINING=$(npm audit 2>&1 | grep -o '[0-9]* vulnerabilities' | head -1 || echo "0 vulnerabilities")
    fi
    
    if [[ "$REMAINING" == "0 vulnerabilities" ]]; then
      log "${GREEN}Alle Sicherheitslücken wurden behoben!${NC}"
    else
      log "${YELLOW}Verbleibende Sicherheitslücken: $REMAINING${NC}"
      log "${YELLOW}Einige Sicherheitslücken erfordern manuelle Eingriffe oder Breaking Changes.${NC}"
      log "${YELLOW}Überprüfen Sie die Audit-Ausgabe für Details.${NC}"
    fi
  else
    log ""
    log "${YELLOW}Um Sicherheitslücken automatisch zu beheben, führen Sie dieses Skript mit --fix aus.${NC}"
  fi
fi

# HTML-Bericht generieren
if [ "$GENERATE_REPORT" = true ]; then
  log ""
  log "${BLUE}Generiere HTML-Bericht...${NC}"
  
  # HTML-Header
  cat > "$REPORT_FILE" << EOL
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>nscale-assist Sicherheitsaudit - $TIMESTAMP</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    h1, h2, h3 {
      color: #0056b3;
    }
    .header {
      border-bottom: 2px solid #eee;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    .summary {
      background-color: #f8f9fa;
      border-radius: 4px;
      padding: 15px;
      margin-bottom: 20px;
    }
    .vulnerabilities {
      margin-bottom: 20px;
    }
    .status-ok {
      color: #28a745;
      font-weight: bold;
    }
    .status-warning {
      color: #ffc107;
      font-weight: bold;
    }
    .status-error {
      color: #dc3545;
      font-weight: bold;
    }
    .details {
      background-color: #f8f9fa;
      border-radius: 4px;
      padding: 15px;
      margin-top: 20px;
      white-space: pre-wrap;
      font-family: monospace;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th, td {
      padding: 8px;
      border: 1px solid #ddd;
      text-align: left;
    }
    th {
      background-color: #f2f2f2;
    }
    tr:nth-child(even) {
      background-color: #f9f9f9;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>nscale-assist Sicherheitsaudit</h1>
    <p>Erstellungsdatum: $(date)</p>
  </div>
  
  <div class="summary">
    <h2>Zusammenfassung</h2>
    <table>
      <tr>
        <th>Kategorie</th>
        <th>Wert</th>
      </tr>
      <tr>
        <td>Projekt</td>
        <td>nscale-assist</td>
      </tr>
      <tr>
        <td>Zeitstempel</td>
        <td>$TIMESTAMP</td>
      </tr>
      <tr>
        <td>Node.js Version</td>
        <td>$(node --version)</td>
      </tr>
      <tr>
        <td>npm Version</td>
        <td>$(npm --version)</td>
      </tr>
      <tr>
        <td>Produktionsabhängigkeiten</td>
        <td>$TOTAL_DEPS</td>
      </tr>
      <tr>
        <td>Entwicklungsabhängigkeiten</td>
        <td>$DEV_DEPS</td>
      </tr>
    </table>
  </div>
  
  <div class="vulnerabilities">
    <h2>Sicherheitslücken</h2>
EOL

  # Vulnerabilities section
  if [[ "$VULNERABILITIES" == "0 vulnerabilities" ]]; then
    cat >> "$REPORT_FILE" << EOL
    <p class="status-ok">Keine Sicherheitslücken gefunden!</p>
EOL
  else
    cat >> "$REPORT_FILE" << EOL
    <p class="status-error">Sicherheitslücken gefunden: $VULNERABILITIES</p>
    <p class="status-error">Davon kritisch: $CRITICAL_VULNERABILITIES</p>
    <p class="status-error">Davon hoch: $HIGH_VULNERABILITIES</p>
    
    <h3>Details der Sicherheitslücken:</h3>
    <div class="details">$(echo "$AUDIT_OUTPUT" | grep -A 50 "# Run" | sed 's/</\&lt;/g' | sed 's/>/\&gt;/g')</div>
EOL
  fi

  # Recommendations
  cat >> "$REPORT_FILE" << EOL
  </div>
  
  <div class="recommendations">
    <h2>Empfehlungen</h2>
EOL

  if [[ "$VULNERABILITIES" == "0 vulnerabilities" ]]; then
    cat >> "$REPORT_FILE" << EOL
    <p class="status-ok">Keine Maßnahmen erforderlich. Alle Abhängigkeiten sind sicher.</p>
EOL
  else
    cat >> "$REPORT_FILE" << EOL
    <p>Auf Basis der gefundenen Sicherheitslücken werden folgende Maßnahmen empfohlen:</p>
    <ul>
      <li>Führen Sie <code>npm audit fix</code> aus, um automatisch behebbare Probleme zu lösen.</li>
      <li>Für schwerwiegendere Probleme überprüfen Sie die detaillierte Audit-Ausgabe und aktualisieren Sie die betroffenen Pakete manuell.</li>
      <li>Erwägen Sie, veraltete oder nicht mehr gepflegte Pakete zu ersetzen.</li>
      <li>Etablieren Sie regelmäßige Sicherheitsüberprüfungen als Teil Ihres CI/CD-Prozesses.</li>
    </ul>
EOL
  fi

  # Close HTML
  cat >> "$REPORT_FILE" << EOL
  </div>
  
  <div class="footer">
    <p>Dieser Bericht wurde automatisch generiert.</p>
  </div>
</body>
</html>
EOL

  log "${GREEN}HTML-Bericht wurde erstellt: $REPORT_FILE${NC}"
fi

log ""
log "${BLUE}=== Sicherheitsaudit abgeschlossen ===${NC}"
log "${BLUE}Log-Datei: $LOG_FILE${NC}"
if [ "$GENERATE_REPORT" = true ]; then
  log "${BLUE}HTML-Bericht: $REPORT_FILE${NC}"
fi
log ""

# Zeige Empfehlungen basierend auf den Ergebnissen
if [[ "$VULNERABILITIES" != "0 vulnerabilities" ]]; then
  log "${YELLOW}Empfehlungen:${NC}"
  log "1. Führen Sie regelmäßig 'npm audit' aus, um Sicherheitslücken zu identifizieren."
  log "2. Verwenden Sie 'npm audit fix', um automatisch behebbare Probleme zu lösen."
  log "3. Für nicht automatisch behebbare Probleme sollten Sie die betroffenen Pakete manuell aktualisieren."
  log "4. Erwägen Sie, ungenutzte Abhängigkeiten zu entfernen (verwenden Sie dazu npm-check-unused)."
  log "5. Integrieren Sie diesen Sicherheitscheck in Ihren CI/CD-Prozess."
fi

exit 0