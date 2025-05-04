/**
 * Dokumentenkonverter-Bridge für die Kommunikation zwischen Vue.js und klassischer Implementierung
 */
(function() {
  console.log('[DocConverter-Bridge] Initialisierung...');

  // Feature-Flags prüfen
  const useNewUI = localStorage.getItem('useNewUI') === 'true';
  const vueDocConverter = localStorage.getItem('feature_vueDocConverter') !== 'false';
  
  console.log(`[DocConverter-Bridge] Feature-Flags: useNewUI=${useNewUI}, vueDocConverter=${vueDocConverter}`);
  
  // App-Status-Objekt
  window.docConverterStatus = {
    initialized: false,
    loading: true,
    error: null,
    mode: null // 'vue' oder 'classic'
  };
  
  // Ereignis auslösen
  function emitEvent(eventName, detail = {}) {
    const event = new CustomEvent(eventName, { 
      detail,
      bubbles: true, 
      cancelable: true 
    });
    document.dispatchEvent(event);
    console.log(`[DocConverter-Bridge] Event ausgelöst: ${eventName}`, detail);
  }
  
  // Initialisierungsfunktion für Vue.js-Implementierung
  function initializeVueImplementation() {
    if (window.docConverterStatus.initialized) {
      console.log('[DocConverter-Bridge] Dokumentenkonverter bereits initialisiert, überspringe');
      return;
    }
    
    console.log('[DocConverter-Bridge] Initialisiere Vue.js-Implementierung');
    window.docConverterStatus.mode = 'vue';
    window.docConverterStatus.loading = true;
    
    try {
      // Stellen sicher, dass das Mount-Element existiert
      let mountElement = document.getElementById('doc-converter-app');
      if (!mountElement) {
        console.log('[DocConverter-Bridge] doc-converter-app Element nicht gefunden, erstelle es');
        mountElement = document.createElement('div');
        mountElement.id = 'doc-converter-app';
        
        const adminPanelContent = document.querySelector('.admin-panel-content');
        if (adminPanelContent) {
          adminPanelContent.appendChild(mountElement);
        } else {
          document.body.appendChild(mountElement);
        }
        
        // Lade-Animation hinzufügen
        mountElement.innerHTML = `
          <div class="vue-loading">
            <div class="vue-loading-spinner"></div>
            <p>Dokumentenkonverter wird geladen...</p>
          </div>
        `;
      }
      
      // Dynamisches Import der Vue-App
      // Der tatsächliche Import wird in main.js oder einem separaten Bundle-Skript durchgeführt
      // Wir definieren nur Hooks für den Erfolgs- und Fehlerfall
      window.vueDocConverterMountElement = mountElement;
      window.vueDocConverterInitialized = false;
      
      // Erfolgsfall-Callback
      window.vueDocConverterSuccess = function() {
        console.log('[DocConverter-Bridge] Vue.js-Implementierung erfolgreich geladen');
        window.docConverterStatus.initialized = true;
        window.docConverterStatus.loading = false;
        window.vueDocConverterInitialized = true;
        emitEvent('vue-doc-converter-initialized');
      };
      
      // Fehlerfall-Callback
      window.vueDocConverterError = function(error) {
        console.error('[DocConverter-Bridge] Fehler bei Vue.js-Implementierung:', error);
        window.docConverterStatus.error = error?.message || 'Unbekannter Fehler';
        window.docConverterStatus.loading = false;
        emitEvent('vue-doc-converter-error', { message: error?.message });
        fallbackToClassicImplementation();
      };
      
      // Hauptscript laden
      const script = document.createElement('script');
      script.type = 'text/javascript'; // Kein Modul-Format verwenden
      script.src = '/static/vue/standalone/doc-converter.js';
      script.onerror = function(event) {
        console.error('[DocConverter-Bridge] Fehler beim Laden des doc-converter.js-Skripts');
        window.vueDocConverterError(new Error('Script loading failed'));
      };
      document.body.appendChild(script);
      
      // Timeout für den Fall, dass keine Callbacks aufgerufen werden
      setTimeout(function() {
        if (!window.vueDocConverterInitialized) {
          console.warn('[DocConverter-Bridge] Timeout beim Laden der Vue.js-Implementierung');
          window.vueDocConverterError(new Error('Initialization timeout'));
        }
      }, 10000);
      
      return true;
    } catch (error) {
      console.error('[DocConverter-Bridge] Fehler bei Vue.js-Initialisierung:', error);
      window.docConverterStatus.error = error.message;
      window.docConverterStatus.loading = false;
      emitEvent('vue-doc-converter-error', { message: error.message });
      fallbackToClassicImplementation();
      return false;
    }
  }
  
  // Fallback zur klassischen Implementierung
  function fallbackToClassicImplementation() {
    console.log('[DocConverter-Bridge] Wechsle zu klassischer Implementierung');
    window.docConverterStatus.mode = 'classic';
    
    try {
      if (typeof window.initializeClassicDocConverter === 'function') {
        window.initializeClassicDocConverter();
        window.docConverterStatus.initialized = true;
        window.docConverterStatus.loading = false;
        console.log('[DocConverter-Bridge] Klassische Implementierung initialisiert');
        emitEvent('classic-doc-converter-initialized');
      } else {
        console.error('[DocConverter-Bridge] Klassische Implementierung nicht verfügbar');
        window.docConverterStatus.error = 'Klassische Implementierung nicht verfügbar';
        emitEvent('doc-converter-error', { message: 'Klassische Implementierung nicht verfügbar' });
        showErrorUI();
      }
    } catch (error) {
      console.error('[DocConverter-Bridge] Fehler bei klassischer Implementierung:', error);
      window.docConverterStatus.error = error.message;
      emitEvent('doc-converter-error', { message: error.message });
      showErrorUI();
    }
  }
  
  // Fehler-UI anzeigen
  function showErrorUI() {
    console.log('[DocConverter-Bridge] Zeige Fehler-UI an');
    
    const mountElement = document.getElementById('doc-converter-app') || 
                         document.getElementById('doc-converter-container');
    
    if (mountElement) {
      mountElement.innerHTML = `
        <div class="error-container p-6 bg-red-50 border-l-4 border-red-500 rounded-r">
          <div class="flex">
            <div class="flex-shrink-0">
              <i class="fas fa-exclamation-triangle text-red-500"></i>
            </div>
            <div class="ml-3">
              <h3 class="text-lg font-medium text-red-700">Fehler beim Laden des Dokumentenkonverters</h3>
              <div class="mt-2 text-sm text-red-600">
                <p>Weder die Vue.js-Implementierung noch die klassische Implementierung konnten geladen werden.</p>
                <p class="mt-1">Fehler: ${window.docConverterStatus.error || 'Unbekannter Fehler'}</p>
              </div>
              <div class="mt-4">
                <button onclick="window.location.reload()" class="p-2 bg-red-100 text-red-700 rounded hover:bg-red-200">
                  <i class="fas fa-sync-alt mr-1"></i> Seite neu laden
                </button>
                <button onclick="localStorage.clear(); window.location.reload()" class="ml-2 p-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
                  <i class="fas fa-trash-alt mr-1"></i> Einstellungen zurücksetzen
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }
  }
  
  // Globale Initialisierungsfunktion exportieren
  window.initializeDocConverter = function(mode = 'auto') {
    console.log(`[DocConverter-Bridge] Initialisierung angefordert: Modus=${mode}`);
    
    if (window.docConverterStatus.initialized) {
      console.log('[DocConverter-Bridge] Bereits initialisiert, überspringe');
      return;
    }
    
    if (mode === 'auto') {
      // Automatische Erkennung basierend auf Feature-Flags
      if (useNewUI && vueDocConverter) {
        initializeVueImplementation();
      } else {
        fallbackToClassicImplementation();
      }
    } else if (mode === 'vue') {
      // Explizit Vue.js verwenden
      initializeVueImplementation();
    } else if (mode === 'classic') {
      // Explizit klassische Implementierung verwenden
      fallbackToClassicImplementation();
    } else {
      console.error(`[DocConverter-Bridge] Ungültiger Modus: ${mode}`);
      fallbackToClassicImplementation();
    }
  };
  
  // Automatische Initialisierung verhindern
  // Die Initialisierung erfolgt durch den DocConverter-Adapter oder manuell
  
  console.log('[DocConverter-Bridge] Bridge geladen und bereit');
})();