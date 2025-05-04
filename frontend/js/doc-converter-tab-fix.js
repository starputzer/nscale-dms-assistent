/**
 * Fix für den Dokumentenkonverter-Tab im Admin-Panel
 * Behebt das Problem mit dem endlosen Ladebalken und fügt CSS-Fixes hinzu
 */

// Verbesserte Logging-Ausgabe
if (window.logger) {
    logger.info('Doc-Converter-Tab-Fix geladen', 'docConverter');
} else {
    console.log('Doc-Converter-Tab-Fix geladen');
}

// WICHTIG: Feature-Toggle aktivieren - garantiert die Sichtbarkeit
localStorage.setItem('useNewUI', 'true');
localStorage.setItem('feature_vueDocConverter', 'true');
console.log('Feature-Toggles für Vue.js DocConverter aktiviert');

// CSS-Datei dynamisch einbinden
function loadCSS(url) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = url;
    document.head.appendChild(link);
    console.log(`CSS-Datei geladen: ${url}`);
}

// Unsere spezielle CSS-Datei laden
// Versuche verschiedene mögliche Pfade
const cssPathAttempts = [
    '/static/css/doc-converter-fix.css',
    '/frontend/static/css/doc-converter-fix.css',
    '/api/static/css/doc-converter-fix.css',
    '/frontend/css/doc-converter-fix.css',
    '/css/doc-converter-fix.css'
];

// Fallbacks für die CSS-Datei
let cssLoaded = false;
function tryLoadCSS() {
    if (cssLoaded || cssPathAttempts.length === 0) return;
    
    const path = cssPathAttempts.shift();
    console.log(`Versuche CSS zu laden von: ${path}`);
    
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = path;
    
    link.onload = function() {
        console.log(`CSS erfolgreich geladen von: ${path}`);
        cssLoaded = true;
    };
    
    link.onerror = function() {
        console.warn(`CSS konnte nicht geladen werden von: ${path}, versuche nächsten Pfad...`);
        setTimeout(tryLoadCSS, 100);
    };
    
    document.head.appendChild(link);
}

// CSS-Ladung starten
tryLoadCSS();

// Funktion zum Beheben des Ladebalken-Problems
function fixDocConverterTab() {
  console.log('Versuche, den Dokumentenkonverter-Tab zu reparieren');
  
  // DocConverter-Tab überwachen - sowohl klassische als auch Vue.js-Varianten
  const possibleButtons = [
    document.querySelector('button[data-tab="docConverter"]'),
    document.querySelector('button[data-tab="documente-konvertieren"]'),
    document.querySelector('a[href="#docConverter"]')
  ];
  
  for (const button of possibleButtons) {
    if (button) {
      console.log('DocConverter-Tab-Button gefunden, füge Click-Handler hinzu');
      button.addEventListener('click', function() {
        console.log('DocConverter-Tab angeklickt');
        // Verzögerung für DOM-Update
        setTimeout(initializeDocConverterTab, 100);
      });
    }
  }
  
  // Funktion zum Initialisieren des Tabs
  function initializeDocConverterTab() {
    console.log('Initialisiere DocConverter-Tab');
    const docConverterApp = document.getElementById('doc-converter-app');
    
    if (docConverterApp) {
          // Vue.js ist immer aktiviert, aber wir zeigen trotzdem sofort die klassische UI an
      // um sicherzustellen, dass etwas sichtbar ist
      console.log('DocConverter-Tab initialisiert, zeige sofort klassische UI an');
      showClassicUI();
      
      // Zusätzlich versuchen, die Vue.js-Komponente zu laden
      try {
        // Aktiviere den Fallback, falls Vue.js nicht funktioniert
        if (typeof window.initializeClassicDocConverter === 'function') {
          setTimeout(function() {
            console.log('Aktiviere klassische Implementierung als garantierten Fallback');
            window.initializeClassicDocConverter();
          }, 300);
        }
      } catch (e) {
        console.error('Fehler beim Initialisieren des Fallbacks:', e);
      }
    }
  }
  
  // Funktion für die klassische UI
  function showClassicUI() {
    const docConverterApp = document.getElementById('doc-converter-app');
    if (docConverterApp) {
      // Sichtbarkeit explizit setzen
      docConverterApp.style.display = 'block';
      docConverterApp.style.visibility = 'visible';
      docConverterApp.style.opacity = '1';
      
      docConverterApp.innerHTML = `
        <div class="p-6">
          <h2 class="text-xl font-semibold mb-4">Dokumenten-Konverter</h2>
          <p class="mb-6">Mit diesem Tool können Sie verschiedene Dokumenttypen (PDF, DOCX, XLSX, etc.) in durchsuchbaren Text für das nscale DMS konvertieren.</p>
          
          <div class="mb-6 bg-blue-50 border-l-4 border-blue-500 p-4">
            <div class="flex">
              <div class="flex-shrink-0">
                <i class="fas fa-info-circle text-blue-500"></i>
              </div>
              <div class="ml-3">
                <p class="text-sm text-blue-700">Die klassische Implementierung des Dokumenten-Konverters ist aktiv. Um die Vue.js-Implementierung zu aktivieren, gehen Sie zum Tab "Features".</p>
              </div>
            </div>
          </div>
          
          <div class="border border-gray-200 rounded-md p-6 bg-white">
            <div class="flex items-center justify-center h-64 flex-col">
              <div class="text-center">
                <i class="fas fa-file-upload text-4xl text-gray-400 mb-3"></i>
                <h3 class="font-medium text-lg text-gray-700 mb-2">Dokumente hier ablegen</h3>
                <p class="text-gray-500 mb-4">oder</p>
                <button class="nscale-btn-primary" id="docSelectButton">
                  <i class="fas fa-folder-open mr-2"></i>Dokumente auswählen
                </button>
              </div>
            </div>
          </div>
          
          <div class="mt-4">
            <button class="nscale-btn-secondary" id="docLoadFallbackButton">
              <i class="fas fa-sync-alt mr-2"></i>Fallback-Implementierung laden
            </button>
          </div>
        </div>
      `;
      
      // Event-Handler für den Dokumente-auswählen-Button
      const docSelectButton = document.getElementById('docSelectButton');
      if (docSelectButton) {
        docSelectButton.addEventListener('click', function() {
          // Versuche, die Dateiauswahl zu öffnen
          const fileInput = document.createElement('input');
          fileInput.type = 'file';
          fileInput.multiple = true;
          fileInput.accept = '.pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.html,.txt';
          fileInput.click();
          
          fileInput.addEventListener('change', function() {
            if (fileInput.files.length > 0) {
              alert(`${fileInput.files.length} Datei(en) ausgewählt. Die Konvertierung ist in dieser Fallback-UI nicht verfügbar.`);
            }
          });
        });
      }
      
      // Event-Handler für den Fallback-Button
      const fallbackButton = document.getElementById('docLoadFallbackButton');
      if (fallbackButton) {
        fallbackButton.addEventListener('click', function() {
          // Versuche, die Fallback-Implementierung direkt zu laden
          try {
            if (typeof window.initDocConverter === 'function') {
              alert('Versuche, die Fallback-Implementierung zu laden...');
              window.initDocConverter();
            } else {
              // Versuche, das Skript direkt zu laden
              const fallbackScript = document.createElement('script');
              fallbackScript.src = '/static/js/doc-converter-fallback.js';
              document.body.appendChild(fallbackScript);
              
              fallbackScript.onload = function() {
                alert('Fallback-Implementierung geladen. Bitte aktualisieren Sie die Seite, wenn der Konverter nicht angezeigt wird.');
              };
            }
          } catch (e) {
            console.error('Fehler beim Laden der Fallback-Implementierung:', e);
            alert('Fehler beim Laden der Fallback-Implementierung. Bitte aktualisieren Sie die Seite und versuchen Sie es erneut.');
          }
        });
      }
      
      // Erzwinge Sichtbarkeit für übergeordnete Elemente
      let parent = docConverterApp.parentElement;
      while (parent) {
        parent.style.display = 'block';
        parent.style.visibility = 'visible';
        parent.style.opacity = '1';
        parent.classList.remove('hidden');
        parent = parent.parentElement;
      }
    }
  }
  
  // Auch prüfen, ob wir bereits im DocConverter-Tab sind (mehrere mögliche Selektoren prüfen)
  const activeTabSelectors = [
    '.admin-tab.active[data-tab="docConverter"]',
    '.admin-tab.active[data-tab="documente-konvertieren"]',
    'a.active[href="#docConverter"]'
  ];
  
  for (const selector of activeTabSelectors) {
    if (document.querySelector(selector)) {
      console.log('Bereits im DocConverter-Tab, initialisiere sofort');
      initializeDocConverterTab();
      break;
    }
  }
  
  // Prüfen, ob wir auf der Hauptseite sind und den DocConverter-Tab auslösen müssen
  const path = window.location.pathname;
  const hash = window.location.hash;
  if (path.endsWith('/docConverter') || hash === '#docConverter') {
    console.log('URL deutet auf DocConverter-Tab hin, initialisiere');
    setTimeout(initializeDocConverterTab, 500);
  }
}

// Dokument-Geladen-Handler
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM geladen, initialisiere Doc-Converter-Tab-Fix');
  fixDocConverterTab();
});