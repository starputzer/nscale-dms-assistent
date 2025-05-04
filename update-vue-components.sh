#!/bin/bash
# update-vue-components.sh
# Skript zum Aktualisieren der Vue.js-Komponenten in der Produktion

set -e # Abbrechen bei Fehlern
echo "=== nscale Vue.js-Komponenten Aktualisierung ==="

# Absolute Verzeichnisse
ROOT_DIR="/opt/nscale-assist/app"
SOURCE_DIR="${ROOT_DIR}/nscale-vue"
STATIC_DIR="${ROOT_DIR}/frontend/static"
JS_DIR="${ROOT_DIR}/frontend/js"
API_STATIC_DIR="${ROOT_DIR}/api/static"

# Wechsle in das Hauptverzeichnis
cd "${ROOT_DIR}"

# Sicherstellen, dass die statischen Verzeichnisse existieren
mkdir -p ${STATIC_DIR}/vue/components
mkdir -p ${STATIC_DIR}/vue/standalone
mkdir -p ${STATIC_DIR}/vue/assets
mkdir -p ${JS_DIR}/vue
mkdir -p ${API_STATIC_DIR}/vue/standalone

# Build-Prozess
echo "1. Baue Vue.js-Komponenten..."
cd ${SOURCE_DIR}
npm run build
cd "${ROOT_DIR}"

# Kopiere die standalone-Skripte aus den richtigen Verzeichnissen
echo "2. Kopiere Standalone-Skripte..."
if [ -d "${SOURCE_DIR}/dist/assets/js" ]; then
  cp ${SOURCE_DIR}/dist/assets/js/*.js ${STATIC_DIR}/vue/standalone/
  cp ${SOURCE_DIR}/dist/assets/js/*.js ${API_STATIC_DIR}/vue/standalone/
  echo "   Standalone-Skripte aus dist/assets/js kopiert"
elif [ -d "${SOURCE_DIR}/dist/assets" ]; then
  cp ${SOURCE_DIR}/dist/assets/*.js ${STATIC_DIR}/vue/standalone/
  cp ${SOURCE_DIR}/dist/assets/*.js ${API_STATIC_DIR}/vue/standalone/
  echo "   Standalone-Skripte aus dist/assets kopiert"
else
  echo "   WARNUNG: dist/assets nicht gefunden, überspringe Standalone-Skripte"
fi

# Kopiere direkten Zugang zu standalone-Komponenten
echo "3. Kopiere standalone-Komponenten-Direktzugriffe..."
if [ -d "${SOURCE_DIR}/src/standalone" ]; then
  cp ${SOURCE_DIR}/src/standalone/*.js ${JS_DIR}/vue/
  echo "   Standalone-Komponenten in ${JS_DIR}/vue/ kopiert"
else
  echo "   WARNUNG: src/standalone nicht gefunden, überspringe Direktzugriffe"
fi

# Kopiere die statischen Assets
echo "4. Kopiere statische Assets..."
if [ -d "${SOURCE_DIR}/dist/assets" ]; then
  # Kopiere alle Assets außer JS-Dateien im Hauptverzeichnis
  find "${SOURCE_DIR}/dist/assets" -type f -not -path "*/js/*" -not -name "*.js" -exec cp {} ${STATIC_DIR}/vue/assets/ \;
  echo "   Assets aus dist/assets kopiert"
fi
if [ -d "${SOURCE_DIR}/dist/css" ]; then
  cp -r ${SOURCE_DIR}/dist/css ${STATIC_DIR}/vue/
  echo "   CSS-Assets kopiert"
fi
if [ -d "${SOURCE_DIR}/dist/img" ]; then
  cp -r ${SOURCE_DIR}/dist/img ${STATIC_DIR}/vue/
  echo "   Bild-Assets kopiert"
fi
if [ -d "${SOURCE_DIR}/dist/fonts" ]; then
  cp -r ${SOURCE_DIR}/dist/fonts ${STATIC_DIR}/vue/
  echo "   Font-Assets kopiert"
fi

# Skripte erstellen, um die Vue.js-Komponenten zu laden
echo "5. Erstelle Skripte zum Laden der Vue.js-Komponenten..."

# DocConverter-Initializer
cat > ${JS_DIR}/vue/doc-converter-initializer.js << 'EOF'
console.log('DocConverter-Initializer wird geladen...');
document.addEventListener('DOMContentLoaded', function() {
  // Suche Container für DocConverter-Initializer
  let initContainer = document.getElementById('doc-converter-initializer');
  
  // Falls nicht vorhanden, aber DocConverter-Tab aktiv ist, erstelle Container
  if (!initContainer) {
    // Verschiedene mögliche Container-IDs prüfen
    const possibleContainers = [
      document.getElementById('doc-converter-container'),
      document.getElementById('doc-converter-app'),
      document.getElementById('doc-converter-tab')
    ];
    
    const docConverterContainer = possibleContainers.find(container => container !== null);
    
    if (docConverterContainer) {
      initContainer = document.createElement('div');
      initContainer.id = 'doc-converter-initializer';
      
      // Container vor dem klassischen Inhalt einfügen
      docConverterContainer.parentNode.insertBefore(initContainer, docConverterContainer);
      
      console.log('DocConverter-Initializer Container erstellt');
    }
  }
  
  // Lade Vue.js-Komponente
  if (initContainer) {
    const script = document.createElement('script');
    // Der korrekte Pfad zur kompilierten Datei
    script.src = '/static/vue/standalone/doc-converter.js';
    script.type = 'module';
    
    // Event-Handler für das Script
    script.onload = function() {
      console.log('DocConverter-Initializer erfolgreich geladen!');
    };
    
    script.onerror = function() {
      console.error('Fehler beim Laden des DocConverter-Initializers');
      
      // Versuche alternative Pfade
      const alternativePaths = [
        '/api/static/vue/standalone/doc-converter.js',
        '/frontend/static/vue/standalone/doc-converter.js',
        '/frontend/js/vue/doc-converter.js'
      ];
      
      let pathIndex = 0;
      
      const tryAlternativePath = function() {
        if (pathIndex < alternativePaths.length) {
          const newScript = document.createElement('script');
          newScript.src = alternativePaths[pathIndex];
          newScript.type = 'module';
          
          console.warn(`Versuche alternative Pfad: ${alternativePaths[pathIndex]}`);
          
          newScript.onload = function() {
            console.log(`DocConverter erfolgreich von ${alternativePaths[pathIndex]} geladen!`);
          };
          
          newScript.onerror = function() {
            console.error(`Fehler beim Laden von ${alternativePaths[pathIndex]}`);
            pathIndex++;
            tryAlternativePath();
          };
          
          document.head.appendChild(newScript);
        } else {
          // Fallback - klassische Implementierung aktivieren
          console.warn('Alle Alternativen fehlgeschlagen, aktiviere klassische Implementierung als Fallback');
          if (typeof window.initializeClassicDocConverter === 'function') {
            window.initializeClassicDocConverter();
          }
        }
      };
      
      tryAlternativePath();
    };
    
    // Script zum DOM hinzufügen
    document.head.appendChild(script);
  }
});
EOF

# Feature-Toggle-Manager
cat > ${JS_DIR}/vue/feature-toggle-manager.js << 'EOF'
console.log('Feature-Toggle-Manager wird geladen...');
document.addEventListener('DOMContentLoaded', function() {
  // Suche Container für Feature-Toggle-Manager
  const featureContainer = document.getElementById('feature-toggle-container');
  
  // Lade Vue.js-Komponente
  if (featureContainer) {
    const script = document.createElement('script');
    script.src = '/static/vue/standalone/feature-toggle.js';
    script.type = 'module';
    
    // Event-Handler für das Script
    script.onload = function() {
      console.log('Feature-Toggle-Manager erfolgreich geladen!');
    };
    
    script.onerror = function() {
      console.error('Fehler beim Laden des Feature-Toggle-Managers');
      
      // Versuche alternative Pfade
      const alternativePaths = [
        '/api/static/vue/standalone/feature-toggle.js',
        '/frontend/static/vue/standalone/feature-toggle.js',
        '/frontend/js/vue/feature-toggle.js'
      ];
      
      let pathIndex = 0;
      
      const tryAlternativePath = function() {
        if (pathIndex < alternativePaths.length) {
          const newScript = document.createElement('script');
          newScript.src = alternativePaths[pathIndex];
          newScript.type = 'module';
          
          console.warn(`Versuche alternative Pfad: ${alternativePaths[pathIndex]}`);
          
          newScript.onload = function() {
            console.log(`Feature-Toggle-Manager erfolgreich von ${alternativePaths[pathIndex]} geladen!`);
          };
          
          newScript.onerror = function() {
            console.error(`Fehler beim Laden von ${alternativePaths[pathIndex]}`);
            pathIndex++;
            tryAlternativePath();
          };
          
          document.head.appendChild(newScript);
        } else {
          // Fallback - einfaches HTML einfügen
          console.warn('Alle Alternativen fehlgeschlagen, verwende HTML-Fallback');
          featureContainer.innerHTML = `
            <div class="error-container p-4 border border-red-300 bg-red-50 rounded mt-4">
              <h3 class="text-red-700 font-medium mb-2">Fehler bei der Initialisierung</h3>
              <p class="text-red-600">Der Feature-Toggle-Manager konnte nicht geladen werden.</p>
              <div class="fallback-container mt-4">
                <p class="mb-4">Verwenden Sie die folgenden Links, um zwischen den UI-Versionen zu wechseln:</p>
                <div class="flex gap-4">
                  <button class="nscale-btn-primary" onclick="localStorage.setItem('useNewUI', 'true'); window.location.reload();">
                    Vue.js-UI aktivieren
                  </button>
                  <button class="nscale-btn-secondary" onclick="localStorage.setItem('useNewUI', 'false'); window.location.reload();">
                    Klassische UI aktivieren
                  </button>
                </div>
              </div>
            </div>
          `;
        }
      };
      
      tryAlternativePath();
    };
    
    // Script zum DOM hinzufügen
    document.head.appendChild(script);
  }
});
EOF

# Erstelle ein Patch-Skript, um die inline-Scripts zu entfernen
echo "6. Erstelle Patch für index.html..."
cat > ${ROOT_DIR}/patch-index-html.sh << 'EOF'
#!/bin/bash
# patch-index-html.sh
# Entfernt inline-Scripts aus index.html und ersetzt sie durch externe Scripts

ROOT_DIR="/opt/nscale-assist/app"
FRONTEND_DIR="${ROOT_DIR}/frontend"

# Sicherheitsabfrage
read -p "Diese Aktion wird index.html modifizieren. Fortfahren? (j/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Jj]$ ]]
then
    echo "Abgebrochen."
    exit 1
fi

# Erstelle ein Backup
if [ -f "${FRONTEND_DIR}/index.html" ]; then
    cp ${FRONTEND_DIR}/index.html ${FRONTEND_DIR}/index.html.bak
    echo "Backup erstellt: ${FRONTEND_DIR}/index.html.bak"
else
    echo "FEHLER: ${FRONTEND_DIR}/index.html nicht gefunden!"
    exit 1
fi

# DocConverter-Tab inline-Script ersetzen
# Prüfe, ob der Muster-String im HTML vorhanden ist
if grep -q "DocConverter-Tab inline script" "${FRONTEND_DIR}/index.html"; then
    sed -i '/<script>.*DocConverter-Tab inline script/,/<\/script>/c\
                                <!-- Externes Script zur Initialisierung des Dokumentenkonverters -->\
                                <script src="/static/js/vue/doc-converter-initializer.js"></script>' "${FRONTEND_DIR}/index.html"
    echo "DocConverter-Tab Script erfolgreich ersetzt"
else
    # Suche nach alternativen Mustern für DocConverter-Skripte
    if grep -q "initializeDocConverter" "${FRONTEND_DIR}/index.html"; then
        sed -i '/<script>.*initializeDocConverter/,/<\/script>/c\
                                    <!-- Externes Script zur Initialisierung des Dokumentenkonverters -->\
                                    <script src="/static/js/vue/doc-converter-initializer.js"></script>' "${FRONTEND_DIR}/index.html"
        echo "DocConverter-Initialisierung Script erfolgreich ersetzt"
    else
        echo "WARNUNG: Konnte kein DocConverter-Initialisierungs-Script in index.html finden"
        
        # Füge das Script vor dem schließenden </body>-Tag ein
        sed -i 's|</body>|    <!-- Externes Script zur Initialisierung des Dokumentenkonverters -->\n    <script src="/static/js/vue/doc-converter-initializer.js"></script>\n</body>|' "${FRONTEND_DIR}/index.html"
        echo "DocConverter-Initializer vor </body> hinzugefügt"
    fi
fi

# Feature-Toggle inline-Script ersetzen
if grep -q "Feature-Toggle-UI" "${FRONTEND_DIR}/index.html"; then
    sed -i '/<script>.*Feature-Toggle-UI/,/<\/script>/c\
                                    <!-- Externes Script für die Feature-Toggle-UI -->\
                                    <script src="/static/js/vue/feature-toggle-manager.js"></script>' "${FRONTEND_DIR}/index.html"
    echo "Feature-Toggle Script erfolgreich ersetzt"
else
    echo "WARNUNG: Konnte kein Feature-Toggle-Script in index.html finden"
    
    # Füge das Script vor dem schließenden </body>-Tag ein
    sed -i 's|</body>|    <!-- Externes Script für die Feature-Toggle-UI -->\n    <script src="/static/js/vue/feature-toggle-manager.js"></script>\n</body>|' "${FRONTEND_DIR}/index.html"
    echo "Feature-Toggle-Manager vor </body> hinzugefügt"
fi

echo "index.html wurde erfolgreich gepatcht!"
EOF

chmod +x ${ROOT_DIR}/patch-index-html.sh
echo "   Patch-Skript erstellt: ${ROOT_DIR}/patch-index-html.sh"

# Kopiere die Standalone-Scripts nach dem Build, wenn sie existieren
echo "7. Kopiere feature-toggle.js in die Standalone-Verzeichnisse..."
for SRC_FILE in "${SOURCE_DIR}/src/standalone/feature-toggle.js" "${SOURCE_DIR}/dist/assets/js/feature-toggle.js" "${SOURCE_DIR}/dist/assets/feature-toggle.js"; do
  if [ -f "${SRC_FILE}" ]; then
    cp "${SRC_FILE}" "${STATIC_DIR}/vue/standalone/"
    cp "${SRC_FILE}" "${API_STATIC_DIR}/vue/standalone/"
    echo "   Feature-Toggle-Manager aus ${SRC_FILE} kopiert"
    break
  fi
done

# Falls feature-toggle.js nicht existiert, erstelle es
if [ ! -f "${STATIC_DIR}/vue/standalone/feature-toggle.js" ]; then
  echo "   WARNUNG: Keine feature-toggle.js Datei gefunden, erstelle leeren Platzhalter"
  
  # Erstelle eine einfache Implementierung des Feature-Toggle-Managers
  cat > "${STATIC_DIR}/vue/standalone/feature-toggle.js" << 'EOF'
console.log('Feature-Toggle-Manager (Fallback-Version) wird initialisiert...');

document.addEventListener('DOMContentLoaded', function() {
  const container = document.getElementById('feature-toggle-container');
  if (!container) return;
  
  container.innerHTML = `
    <div class="feature-toggle-manager p-4 border border-gray-300 rounded">
      <h2 class="text-xl font-bold mb-4">UI-Version Auswahl</h2>
      
      <div class="flex flex-col gap-4">
        <!-- UI-Version toggles -->
        <div class="flex gap-4">
          <button class="nscale-btn-primary" onclick="localStorage.setItem('useNewUI', 'true'); window.location.reload();">
            Vue.js-UI aktivieren
          </button>
          <button class="nscale-btn-secondary" onclick="localStorage.setItem('useNewUI', 'false'); window.location.reload();">
            Klassische UI aktivieren
          </button>
        </div>
        
        <div class="mt-4">
          <p class="text-sm text-gray-600">
            Hinweis: Dies ist eine einfache Version des Feature-Toggle-Managers.
            Die vollständige Vue.js-Version konnte nicht geladen werden.
          </p>
        </div>
      </div>
    </div>
  `;
});
EOF

  # Kopiere es auch in das API-Verzeichnis
  cp "${STATIC_DIR}/vue/standalone/feature-toggle.js" "${API_STATIC_DIR}/vue/standalone/"
  echo "   Einfachen Feature-Toggle-Manager erstellt"
fi

echo "=== Aktualisierung abgeschlossen ==="
echo
echo "Führen Sie nun das Patch-Skript aus, um die inline-Scripts zu entfernen:"
echo "  ${ROOT_DIR}/patch-index-html.sh"
echo
echo "HINWEIS: Diese Änderungen sollten in einer Testumgebung überprüft werden,"
echo "bevor sie in die Produktion übernommen werden."
echo
echo "Wenn Sie auf Probleme stoßen, führen Sie folgende Schritte aus:"
echo "1. Prüfen Sie Konsolenfehler im Browser"
echo "2. Vergewissern Sie sich, dass die Pfade in den Skripten korrekt sind:"
echo "   - Frontend: ${STATIC_DIR}/vue/standalone/"
echo "   - API: ${API_STATIC_DIR}/vue/standalone/"
echo "3. Überprüfen Sie die JavaScript-Initialisierung in der Browser-Konsole"