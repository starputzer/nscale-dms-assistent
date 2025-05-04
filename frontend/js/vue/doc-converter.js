// Vereinfachter doc-converter.js für den Doc-Converter-Tab
console.log('Vereinfachte Version des doc-converter.js wurde geladen');

// Variable für die Initialisierung
window.docConverterUIInitialized = false;

// Funktion, die prüft, ob das Element existiert, und falls nicht, es später versucht
function initConverterUI() {
  // Verhindere doppelte Initialisierung
  if (window.docConverterUIInitialized) {
    console.log('DocConverter bereits initialisiert, überspringe...');
    return;
  }
  
  const mountElement = document.getElementById('doc-converter-app');
  if (mountElement) {
    console.log('DocConverter-Element gefunden, initialisiere UI');
    
    // Debugging: Ausgabe der gefundenen Elemente
    console.log('DocConverter-Struktur vor Initialisierung:', {
      mountElement: mountElement,
      innerContainer: document.getElementById('doc-converter-container')
    });
    
    // Als initialisiert markieren
    window.docConverterUIInitialized = true;
    
    // Container komplett ersetzen (nicht nur innerHTML), um alten Container zu entfernen
    const newContent = document.createElement('div');
    newContent.className = 'doc-converter-app-content';
    newContent.innerHTML = `
      <div class="doc-converter-view p-4">
        <header class="header mb-4 text-center">
          <h1 class="title text-2xl font-semibold text-green-600 mb-2">nscale Dokumenten-Konverter</h1>
          <p class="subtitle text-gray-600">Konvertieren Sie Ihre Dokumente zu durchsuchbarem Text für das nscale DMS</p>
        </header>

        <main class="main-content bg-white rounded-lg shadow-md overflow-hidden">
          <div class="p-6">
            <h2 class="section-title text-xl font-semibold mb-4">1. Dokumente hochladen</h2>
            
            <div class="file-upload bg-gray-50 p-4 border border-dashed border-gray-300 rounded-md">
              <div class="text-center">
                <i class="fas fa-cloud-upload-alt text-3xl text-gray-400 mb-2"></i>
                <p class="text-gray-600 mb-2">Ziehen Sie Dateien hierher oder klicken Sie, um Dateien auszuwählen</p>
                <p class="text-xs text-gray-400">Unterstützte Formate: PDF, DOCX, DOC, XLSX, XLS, PPTX, PPT, HTML, TXT</p>
                <button class="mt-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
                  Dateien auswählen
                </button>
              </div>
            </div>
          </div>
          
          <div class="p-6 border-t border-gray-200">
            <h2 class="section-title text-xl font-semibold mb-4">2. Konvertierungsoptionen</h2>
            
            <div class="options-grid grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="option">
                <label class="flex items-center">
                  <input type="checkbox" checked class="mr-2">
                  <span>Abschnittstrennung beibehalten</span>
                </label>
              </div>
              <div class="option">
                <label class="flex items-center">
                  <input type="checkbox" checked class="mr-2">
                  <span>Bilder extrahieren</span>
                </label>
              </div>
              <div class="option">
                <label class="flex items-center">
                  <input type="checkbox" checked class="mr-2">
                  <span>Optimierte Formatierung</span>
                </label>
              </div>
              <div class="option">
                <label class="flex items-center">
                  <input type="checkbox" checked class="mr-2">
                  <span>Metadaten extrahieren</span>
                </label>
              </div>
            </div>
          </div>
          
          <div class="p-6 border-t border-gray-200">
            <h2 class="section-title text-xl font-semibold mb-4">3. Konvertierung starten</h2>
            
            <div class="action-buttons flex gap-4">
              <button class="bg-green-500 text-white px-4 py-2 rounded disabled:bg-gray-300 disabled:cursor-not-allowed">
                <i class="fas fa-sync-alt mr-2"></i>
                Konvertierung starten
              </button>
              <button class="border border-gray-300 px-4 py-2 rounded disabled:text-gray-400 disabled:cursor-not-allowed">
                <i class="fas fa-times mr-2"></i>
                Auswahl zurücksetzen
              </button>
            </div>
          </div>
          
          <div class="info-panel bg-yellow-50 p-6 border-t border-yellow-200">
            <div class="flex items-start">
              <i class="fas fa-info-circle text-yellow-500 mt-1 mr-3"></i>
              <div>
                <h3 class="font-semibold mb-1">Hinweis zur vereinfachten Ansicht</h3>
                <p class="text-sm">
                  Dies ist eine vereinfachte Version des Dokumenten-Konverters. 
                  Für die volle Funktionalität muss die Vue.js-Version korrekt eingerichtet werden.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    `;
    
    // Alten Container entfernen und durch neuen ersetzen
    mountElement.innerHTML = '';
    mountElement.appendChild(newContent);
    
    console.log('Vereinfachter Dokumentenkonverter wurde initialisiert');
    
    // Event-Listener hinzufügen
    const uploadButton = newContent.querySelector('button');
    if (uploadButton) {
      uploadButton.addEventListener('click', () => {
        alert('Die Dateiauswahl ist in dieser vereinfachten Version nicht verfügbar.');
      });
    }
  } else {
    console.warn('Kein Mounting-Element für DocConverter gefunden (#doc-converter-app)');
    
    // Prüfen, ob wir uns im DocConverter-Tab befinden
    const docConverterTab = document.querySelector('.admin-panel-content[data-tab="docConverter"]:not([style*="display: none"])');
    if (!docConverterTab) {
      console.log('DocConverter-Tab ist nicht aktiv, keine weitere Initialisierung nötig');
      return;
    }
    
    // Wenn wir uns im Tab befinden aber kein Mount-Element finden, nur einmal neu versuchen
    if (!window.docConverterUIInitialized && !window.docConverterRetryAttempted) {
      window.docConverterRetryAttempted = true;
      console.log('DocConverter-Tab ist aktiv, versuche einmalig erneute Initialisierung in 1 Sekunde');
      setTimeout(initConverterUI, 1000);
    } else {
      console.log('DocConverter-Initialisierung bereits versucht, keine weiteren Versuche');
    }
  }
}

// Funktion zum direkten Start der Initialisierung, unabhängig vom DOMContentLoaded-Event
function startInitialization() {
  // Verhindern doppelter Initialisierung - nur einmal versuchen
  if (!window.docConverterTabListenerInitialized) {
    window.docConverterTabListenerInitialized = true;
    
    console.log('DocConverter: Starte direkte Initialisierung');
    
    // Sofort versuchen zu initialisieren
    initConverterUI();
    
    // Richte den Tab-Change-Listener und DOM-Observer ein, aber nur einmal
    setupTabChangeListener();
    setupDOMObserver();
  }
}

// Wenn das DOM bereits geladen ist, sofort initialisieren, sonst auf das Event warten
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startInitialization);
} else {
  // DOM ist bereits geladen, starte direkt
  console.log('DocConverter: DOM bereits geladen, starte direkt');
  setTimeout(startInitialization, 100);
}

// Globales Flag für Tab-Change-Listener
window.tabChangeListenerInitialized = false;

// Backup-Option: Führe die Initialisierung auch beim Tab-Wechsel aus
function setupTabChangeListener() {
  // Verhindere doppelte Initialisierung
  if (window.tabChangeListenerInitialized) {
    return;
  }
  window.tabChangeListenerInitialized = true;
  
  // Überwache Tab-Wechsel, falls das Element dynamisch erstellt wird
  const adminNavItems = document.querySelectorAll('.admin-nav-item');
  if (adminNavItems.length > 0) {
    adminNavItems.forEach(item => {
      item.addEventListener('click', function() {
        // Wenn zur DocConverter-Tab gewechselt wird
        if (this.getAttribute('data-tab') === 'docConverter' || 
            this.querySelector('input[value="docConverter"]')) {
          console.log('DocConverter-Tab aktiviert, versuche Initialisierung...');
          
          // Nur einmal inizialisieren statt vierfach
          initConverterUI();
        }
      });
    });
    console.log('Tab-Change-Listener für DocConverter eingerichtet');
  }
}

// Globales Flag für DOM-Observer
window.domObserverInitialized = false;

// Alternative Methode zum Finden des DocConverter-Tabs über MutationObserver, mit verbesserter Logik gegen Endlosschleifen
function setupDOMObserver() {
  // Verhindere doppelte Initialisierung
  if (window.domObserverInitialized) {
    return;
  }
  window.domObserverInitialized = true;
  
  // Zähler für Erkennungsversuche - nach 3 Versuchen keine weitere Initialisierung
  let detectionAttempts = 0;
  const MAX_DETECTION_ATTEMPTS = 3;
  
  // Beobachte DOM-Änderungen, um den Tab zu finden, sobald er erstellt wird
  const observer = new MutationObserver(function(mutations) {
    // Wenn bereits initialisiert oder maximale Anzahl Versuche erreicht, observer beenden
    if (window.docConverterUIInitialized || detectionAttempts >= MAX_DETECTION_ATTEMPTS) {
      console.log('DocConverter bereits initialisiert oder maximale Versuche erreicht, beende MutationObserver');
      observer.disconnect();
      return;
    }
    
    // Zähler erhöhen
    detectionAttempts++;
    console.log(`DocConverter DOM-Beobachter: Versuch ${detectionAttempts} von ${MAX_DETECTION_ATTEMPTS}`);
    
    // Prüfe aktuelle DOM-Struktur - nur einmal pro Callback
    let foundConverter = false;
    
    // Prüfe, ob wir im DocConverter-Tab sind
    const docConverterTab = document.querySelector('.admin-panel-content[data-tab="docConverter"]:not([style*="display: none"])');
    if (!docConverterTab) {
      console.log('DocConverter-Tab ist nicht aktiv, warte weiter...');
      return;
    }
    
    // Prüfe, ob ein DocConverter-Container existiert
    if (document.getElementById('doc-converter-app')) {
      console.log('DocConverter-Container durch DOM-Mutation erkannt');
      foundConverter = true;
      initConverterUI();
    }
    
    // Prüfe auf Tab-Wechsel
    const activeTab = document.querySelector('[data-tab="docConverter"].active');
    if (activeTab && !foundConverter) {
      console.log('Aktiver DocConverter-Tab durch DOM-Mutation erkannt');
      initConverterUI();
    }
    
    // Bei Erfolg oder nach maximalen Versuchen sofort beenden
    if (window.docConverterUIInitialized || detectionAttempts >= MAX_DETECTION_ATTEMPTS) {
      console.log('DocConverter initialisiert oder maximale Versuche erreicht, beende Observer');
      observer.disconnect();
    }
  });
  
  // Den gesamten Body beobachten, aber mit niedrigerem Polling-Intervall
  observer.observe(document.body, { 
    childList: true, 
    subtree: true 
  });
  
  console.log('DOM-Beobachter für DocConverter eingerichtet (mit begrenzter Anzahl Versuchen)');
  
  // Nach 10 Sekunden auf jeden Fall beenden, um Ressourcen zu sparen
  setTimeout(() => {
    if (observer) {
      console.log('DocConverter DOM-Beobachter: Beende nach Timeout (10s)');
      observer.disconnect();
    }
  }, 10000);
}