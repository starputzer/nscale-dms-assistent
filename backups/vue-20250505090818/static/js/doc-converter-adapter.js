/**
 * Dokumentenkonverter-Adapter für Standalone-Modus
 * Integriert Vue.js-Komponenten in bestehende Seiten
 */

(function() {
  console.log('[DocConverter-Adapter] Initialisierung...');

  // Logging-Funktionen
  function log(message, type = 'info') {
    const prefix = '[DocConverter-Adapter]';
    const timestamp = new Date().toISOString().substring(11, 23); // HH:MM:SS.sss
    
    message = `${prefix} [${timestamp}] ${message}`;
    
    switch(type) {
      case 'error':
        console.error(message);
        break;
      case 'warn':
        console.warn(message);
        break;
      case 'debug':
        console.debug(message);
        break;
      default:
        console.log(message);
    }
    
    // Zusätzlich an Diagnostics-Tool senden, falls verfügbar
    if (window.docConverterDiagnostics?.log) {
      window.docConverterDiagnostics.log(`Adapter: ${message}`);
    }
  }
  
  // Feature-Flag-Status abrufen
  function getFeatureFlags() {
    return {
      useNewUI: localStorage.getItem('useNewUI') === 'true',
      vueDocConverter: localStorage.getItem('feature_vueDocConverter') !== 'false',
      vueChat: localStorage.getItem('feature_vueChat') === 'true',
      vueAdmin: localStorage.getItem('feature_vueAdmin') === 'true',
      vueSettings: localStorage.getItem('feature_vueSettings') === 'true',
      devMode: localStorage.getItem('devMode') === 'true'
    };
  }
  
  // Aktueller Tab im Admin-Bereich
  function getCurrentAdminTab() {
    try {
      // Zuerst Vue.js-Tabs prüfen (über Klassennamen)
      const activeVueTab = document.querySelector('.admin-nav-item.active');
      if (activeVueTab) {
        // Versuche, den Tab-Namen aus dem Text zu extrahieren
        const tabText = activeVueTab.textContent.trim().toLowerCase();
        if (tabText.includes('dokumente') || tabText.includes('konvert')) {
          return 'docConverter';
        }
        // Alternativ nach dem Icon suchen
        if (activeVueTab.querySelector('.fa-file-import')) {
          return 'docConverter';
        }
      }
      
      // Dann klassische Tabs prüfen (über data-tab Attribut)
      const activeTab = document.querySelector('.admin-tab-button.active');
      if (activeTab) {
        return activeTab.getAttribute('data-tab');
      }
      
      // Versuche, Vue.js-Controller-Variable zu lesen (falls im selben Kontext)
      if (window.app && window.app.adminTab === 'docConverter') {
        return 'docConverter';
      }
      
      // In Vue-Umgebung: Prüfe den aktuellen angezeigten Tab-Inhalt
      const visibleDocConverter = document.querySelector('.admin-panel-content #doc-converter-app');
      if (visibleDocConverter && window.getComputedStyle(visibleDocConverter).display !== 'none') {
        return 'docConverter';
      }
      
      return null;
    } catch (e) {
      log(`Fehler beim Ermitteln des aktuellen Admin-Tabs: ${e.message}`, 'error');
      return null;
    }
  }
  
  // Container-Erstellung
  function ensureDocConverterContainer() {
    let container = document.getElementById('doc-converter-app');
    
    if (!container) {
      log('Erstelle doc-converter-app Container');
      container = document.createElement('div');
      container.id = 'doc-converter-app';
      
      // Lade-Animation hinzufügen
      container.innerHTML = `
        <div class="vue-loading">
          <div class="vue-loading-spinner"></div>
          <p>Dokumentenkonverter wird geladen...</p>
          <div class="vue-loading-status"></div>
        </div>
      `;
      
      // Container in die Seite einfügen - im Admin-Panel einsetzen
      const adminPanel = document.querySelector('.admin-panel-content');
      if (adminPanel) {
        // Den Container immer einfügen, wenn wir im Admin-Panel sind
        // Die Tab-Prüfung überlassen wir dem Vue.js-Rendering
        adminPanel.appendChild(container);
        log('Container in Admin-Panel eingefügt');
        
        // Für Debugging: Versuche Tab zu erkennen
        const currentTab = getCurrentAdminTab();
        if (currentTab === 'docConverter') {
          log('DocConverter-Tab erkannt', 'debug');
        } else {
          log(`Anderer Tab erkannt: ${currentTab || 'unbekannt'}, Container dennoch eingefügt`, 'debug');
        }
      } else {
        // Versuche alternative Ansätze
        const docConverterSection = document.querySelector('[v-if="adminTab === \'docConverter\'"]');
        if (docConverterSection) {
          docConverterSection.appendChild(container);
          log('Container in DocConverter-Sektion eingefügt (alternatives Ziel)', 'warn');
          return container;
        }
        
        log('Admin-Panel nicht gefunden, Container wird nicht eingefügt', 'error');
        return null;
      }
    }
    
    return container;
  }
  
  // Vue.js-Komponente laden
  function loadVueComponent() {
    log('Versuche Vue.js-Dokumentenkonverter zu laden');
    
    try {
      ensureDocConverterContainer();
      
      // Skript dynamisch laden
      const script = document.createElement('script');
      script.type = 'text/javascript'; // Nicht als Modul laden
      script.src = '/static/vue/standalone/doc-converter.js';
      script.onerror = function() {
        log('Fehler beim Laden des doc-converter.js-Skripts', 'error');
        fallbackToClassicImplementation();
      };
      
      // Event-Listener für die erfolgreiche Initialisierung
      window.addEventListener('vue-doc-converter-initialized', function() {
        log('Vue.js-Dokumentenkonverter erfolgreich initialisiert');
      }, { once: true });
      
      // Event-Listener für Fehler
      window.addEventListener('vue-doc-converter-error', function(e) {
        log(`Vue.js-Dokumentenkonverter Fehler: ${e.detail?.message || 'Unbekannter Fehler'}`, 'error');
        fallbackToClassicImplementation();
      }, { once: true });
      
      // Timeout für den Fall, dass keine Events ausgelöst werden
      const timeout = setTimeout(function() {
        if (!window.vueDocConverterInitialized) {
          log('Timeout beim Laden des Vue.js-Dokumentenkonverters', 'warn');
          fallbackToClassicImplementation();
        }
      }, 10000);
      
      // Erfolgsfall: Timeout löschen
      script.onload = function() {
        log('doc-converter.js-Skript erfolgreich geladen');
        // Timeout wird nur gelöscht, wenn Initialisierung erfolgreich war
      };
      
      // Skript in die Seite einfügen
      document.body.appendChild(script);
      log('Skript in Seite eingefügt');
      
      return true;
    } catch (error) {
      log(`Fehler beim Laden der Vue.js-Komponente: ${error.message}`, 'error');
      fallbackToClassicImplementation();
      return false;
    }
  }
  
  // Fallback zur klassischen Implementierung
  function fallbackToClassicImplementation() {
    log('Wechsle zu klassischer Implementierung', 'warn');
    
    try {
      if (typeof window.initializeClassicDocConverter === 'function') {
        window.initializeClassicDocConverter();
        log('Klassische Implementation initialisiert');
      } else {
        log('Klassische Implementation nicht verfügbar', 'error');
        showErrorUI();
      }
    } catch (error) {
      log(`Fehler beim Initialisieren der klassischen Implementation: ${error.message}`, 'error');
      showErrorUI();
    }
  }
  
  // Fehler-UI anzeigen
  function showErrorUI() {
    log('Zeige Fehler-UI an', 'error');
    
    const container = document.getElementById('doc-converter-app') || 
                      document.getElementById('doc-converter-container');
    
    if (container) {
      container.innerHTML = `
        <div class="vue-fallback">
          <div class="vue-fallback-header">Dokumentenkonverter - Fehler</div>
          <div class="vue-error-message">
            <p>Der Dokumentenkonverter konnte nicht geladen werden. Bitte versuchen Sie folgendes:</p>
            <ul style="margin-top: 10px; margin-left: 20px; list-style-type: disc;">
              <li>Seite neu laden</li>
              <li>Browser-Cache leeren</li>
              <li>Reset-Link in der oberen rechten Ecke verwenden</li>
            </ul>
          </div>
          <div style="margin-top: 15px;">
            <button onclick="window.location.reload()" class="nscale-btn-primary">
              <i class="fas fa-sync-alt"></i> Seite neu laden
            </button>
            <button onclick="localStorage.clear(); window.location.reload()" class="nscale-btn-secondary" style="margin-left: 10px;">
              <i class="fas fa-trash-alt"></i> Einstellungen zurücksetzen
            </button>
          </div>
        </div>
      `;
    } else {
      log('Kein Container für Fehler-UI gefunden', 'error');
    }
  }
  
  // Tab-Wechsel-Beobachter
  function setupTabChangeObserver() {
    // Klassischer Tab-Wechsel
    const tabButtons = document.querySelectorAll('.admin-tab-button');
    tabButtons.forEach(button => {
      button.addEventListener('click', function() {
        const tab = this.getAttribute('data-tab');
        if (tab === 'docConverter') {
          log(`Wechsel zum Tab: ${tab}, initialisiere Dokumentenkonverter`);
          setTimeout(initializeDocConverter, 100);
        }
      });
    });
    
    // MutationObserver für dynamische Tab-Änderungen
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const target = mutation.target;
          if (target.classList.contains('active') && 
              target.getAttribute('data-tab') === 'docConverter') {
            log('Tab-Wechsel zu docConverter durch Klassenänderung erkannt');
            setTimeout(initializeDocConverter, 100);
          }
        }
      });
    });
    
    tabButtons.forEach(button => {
      observer.observe(button, { attributes: true });
    });
    
    log('Tab-Wechsel-Beobachter installiert');
  }
  
  // Hauptinitialisierungsfunktion
  function initializeDocConverter() {
    log('Starte Initialisierung des Dokumentenkonverters');
    
    const flags = getFeatureFlags();
    log(`Feature-Flags: ${JSON.stringify(flags)}`);
    
    // Sicherstellung, dass Vue.js UI-Reset nicht auf klassische UI greift
    if (flags.useNewUI && flags.vueDocConverter) {
      log('Versuche Vue.js-Implementierung zu laden');
      loadVueComponent();
    } else {
      log('Nutze klassische Implementierung (Feature-Flag)', 'info');
      fallbackToClassicImplementation();
    }
  }
  
  // Prüfen, ob wir uns im Admin-Bereich befinden
  function isInAdminPanel() {
    // Prüfen, ob die URL den /admin-Pfad enthält oder der Admin-Panel-Container existiert
    const isAdminUrl = window.location.pathname.includes('/admin');
    const hasAdminPanel = document.querySelector('.admin-panel-content') !== null;
    return isAdminUrl || hasAdminPanel;
  }
  
  // Bei DOM-Laden initialisieren
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      log('DOM geladen, prüfe auf Admin-Bereich');
      
      // Nur im Admin-Bereich initialisieren
      if (isInAdminPanel()) {
        log('Im Admin-Bereich, initialisiere Tab-Wechsel-Beobachter');
        setupTabChangeObserver();
        
        // Prüfen, ob wir auf dem richtigen Tab sind
        const currentTab = getCurrentAdminTab();
        if (currentTab === 'docConverter') {
          log('Dokumentenkonverter-Tab ist aktiv, initialisiere sofort');
          initializeDocConverter();
        } else {
          log(`Aktueller Tab ist ${currentTab}, warte auf Tab-Wechsel`);
        }
      } else {
        log('Nicht im Admin-Bereich, Dokumentenkonverter-Integration wird nicht initialisiert');
      }
    });
  } else {
    // DOM bereits geladen
    log('DOM bereits geladen, prüfe auf Admin-Bereich');
    
    // Nur im Admin-Bereich initialisieren
    if (isInAdminPanel()) {
      log('Im Admin-Bereich, initialisiere Tab-Wechsel-Beobachter');
      setupTabChangeObserver();
      
      // Prüfen, ob wir auf dem richtigen Tab sind
      const currentTab = getCurrentAdminTab();
      if (currentTab === 'docConverter') {
        log('Dokumentenkonverter-Tab ist aktiv, initialisiere sofort');
        initializeDocConverter();
      } else {
        log(`Aktueller Tab ist ${currentTab}, warte auf Tab-Wechsel`);
      }
    } else {
      log('Nicht im Admin-Bereich, Dokumentenkonverter-Integration wird nicht initialisiert');
    }
  }
  
  // Manueller Initialisierungsaufruf für externe Verwendung
  window.initDocConverter = initializeDocConverter;
  
  log('Adapter-Skript vollständig geladen');
})();