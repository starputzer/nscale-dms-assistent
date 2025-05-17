#!/bin/bash

# Skript zum Korrigieren der generierten frontend/index.html nach dem Build

# Farben für Ausgabe
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== nscale DMS Assistant - Fix Frontend HTML ===${NC}"

# Ins App-Verzeichnis wechseln
cd /opt/nscale-assist/app

# Überprüfe, ob die Build-Verzeichnis existiert
if [ ! -d "api/frontend" ]; then
  echo -e "${RED}Fehler: Build-Verzeichnis nicht gefunden${NC}"
  exit 1
fi

# Aktualisiere die indexen.html im Frontend-Verzeichnis
echo -e "${YELLOW}Aktualisiere index.html im Frontend-Verzeichnis...${NC}"

cat > api/frontend/index.html << EOF
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>nscale DMS Assistent</title>
    
    <!-- Basis CSS für initiales Rendering (minimiert) -->
    <link rel="stylesheet" href="/assets/index-DGVlmrpP.css">
    
    <!-- Favicon -->
    <link rel="icon" href="/assets/images/senmvku-logo.png" type="image/png">
    
    <!-- Preload kritische Assets -->
    <link rel="preload" href="/assets/images/senmvku-logo.png" as="image">
</head>
<body>
    <!-- App Mount Point -->
    <div id="app"><!-- Vue-App wird hier gemountet --></div>
    
    <!-- Initiales Lade-Feedback -->
    <div id="app-loading" class="app-loader">
        <div class="app-loader-content">
            <img src="/assets/images/senmvku-logo.png" alt="nscale Logo" class="app-loader-logo">
            <div class="app-loader-spinner"></div>
            <p>Anwendung wird geladen...</p>
        </div>
    </div>
    
    <!-- Kritische Inline-Skripte für initiale Konfiguration -->
    <script>
        // Grundlegende Konfiguration und Feature-Detection
        window.APP_CONFIG = {
            apiBaseUrl: '/api',
            buildVersion: '1.0.0',
            buildTimestamp: '$(date +%Y%m%d%H%M%S)',
            environment: 'production'
        };
        
        // Theme-Präferenz aus LocalStorage oder Systemeinstellung laden
        (function() {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            const savedTheme = localStorage.getItem('theme');
            const theme = savedTheme || (prefersDark ? 'dark' : 'light');
            document.documentElement.classList.add(\`theme-\${theme}\`);
            window.APP_CONFIG.initialTheme = theme;
        })();
        
        // Globaler Fehler-Handler
        window.addEventListener('error', function(event) {
            console.error('Globaler Fehler abgefangen:', event.error);
            const errorElement = document.createElement('div');
            errorElement.className = 'critical-error';
            errorElement.innerHTML = \`
                <div class="critical-error-content">
                    <h2>Anwendungsfehler</h2>
                    <p>Es ist ein unerwarteter Fehler aufgetreten. Bitte laden Sie die Seite neu.</p>
                    <button onclick="window.location.reload()">Neu laden</button>
                </div>
            \`;
            
            const appLoader = document.getElementById('app-loading');
            if (appLoader) appLoader.style.display = 'none';
            
            document.body.appendChild(errorElement);
        });
    </script>
    
    <!-- Haupt-App-Bundle - dynamisch via Vite erzeugt -->
    <script type="module" src="/assets/index-BJ8w4JZ2.js"></script>
</body>
</html>
EOF

echo -e "${GREEN}index.html erfolgreich aktualisiert.${NC}"

# Kopiere die benötigten Assets
echo -e "${YELLOW}Kopiere benötigte Assets...${NC}"

# Stell sicher, dass das images-Verzeichnis existiert
mkdir -p api/frontend/assets/images

# Kopiere das Logo, falls es vorhanden ist
if [ -f "public/assets/images/senmvku-logo.png" ]; then
  cp public/assets/images/senmvku-logo.png api/frontend/assets/images/
  echo -e "${GREEN}Logo kopiert.${NC}"
else
  echo -e "${RED}Logo nicht gefunden. Suche nach alternativen Quellen...${NC}"
  LOGO_PATH=$(find /opt/nscale-assist/app -name "senmvku-logo.png" -type f | head -n 1)
  if [ -n "$LOGO_PATH" ]; then
    cp "$LOGO_PATH" api/frontend/assets/images/
    echo -e "${GREEN}Logo aus alternativer Quelle kopiert: $LOGO_PATH${NC}"
  else
    echo -e "${YELLOW}Kein Logo gefunden. Überspringe...${NC}"
  fi
fi

echo -e "${GREEN}Alle Fixes wurden angewendet.${NC}"
echo -e "${BLUE}=== Vorgang abgeschlossen ===${NC}"

echo -e "${YELLOW}Die Anwendung sollte nun mit folgendem Befehl gestartet werden können:${NC}"
echo -e "cd /opt/nscale-assist/app && python3 -m http.server --directory api/frontend 8000"
echo -e "${YELLOW}Die Anwendung ist dann unter http://localhost:8000 erreichbar.${NC}"