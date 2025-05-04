/**
 * Vue-Fix Script
 * Behebt Probleme mit Vue.js-Komponenten und Inline-Scripts
 */
console.log("Vue-Fix geladen - Erweiterte Debug-Version");

// Debug-Logging-Funktion
function vueFixDebug(message, type = 'info') {
  const prefix = '[Vue-Fix]';
  if (type === 'error') {
    console.error(`${prefix} ERROR: ${message}`);
  } else if (type === 'warn') {
    console.warn(`${prefix} WARNUNG: ${message}`);
  } else {
    console.log(`${prefix} ${message}`);
  }
}

vueFixDebug('Starte Diagnose und Reparatur...');

// Überprüfe Feature-Flags
vueFixDebug('Überprüfe Feature-Flags...');
const useNewUI = localStorage.getItem('useNewUI') === 'true';
const vueDocConverter = localStorage.getItem('feature_vueDocConverter') !== 'false';
const vueChat = localStorage.getItem('feature_vueChat') === 'true';
const vueAdmin = localStorage.getItem('feature_vueAdmin') === 'true';
const vueSettings = localStorage.getItem('feature_vueSettings') === 'true';
const devMode = localStorage.getItem('devMode') === 'true';

vueFixDebug(`Aktuelle Feature-Flags: useNewUI=${useNewUI}, vueDocConverter=${vueDocConverter}, vueChat=${vueChat}, vueAdmin=${vueAdmin}, vueSettings=${vueSettings}, devMode=${devMode}`);

// Endlosschleifen verhindern
vueFixDebug('Installiere Schutz gegen Endlosschleifen...');
var originalSetTimeout = window.setTimeout;
window.setTimeout = function(fn, delay) {
  if (typeof fn === 'function') {
    const fnStr = fn.toString();
    if (fnStr.indexOf('initializeConverter') !== -1 && delay === 500) {
      vueFixDebug('Endlosschleife bei initializeConverter verhindert', 'warn');
      return -1;
    }
    if (fnStr.indexOf('loadFallbackImplementation') !== -1 && delay < 1000) {
      vueFixDebug('Potenzielle Endlosschleife bei loadFallbackImplementation erkannt', 'warn');
      return -1;
    }
  }
  return originalSetTimeout(fn, delay);
};

// Inline-Scripts-Fix
vueFixDebug('Installiere Fix für Inline-Scripts...');
function fixInlineScripts() {
  // Template-Scripts markieren, damit sie via CSS ausgeblendet werden können
  const scripts = document.querySelectorAll('script:not([data-vue-template-fix])');
  let count = 0;
  
  scripts.forEach(script => {
    if (script.parentElement && (
      script.parentElement.classList.contains('vue-template-container') ||
      script.parentElement.hasAttribute('v-if') ||
      script.parentElement.hasAttribute('v-else')
    )) {
      script.setAttribute('data-vue-template-fix', 'true');
      script.setAttribute('type', 'text/plain');
      count++;
    }
  });
  
  vueFixDebug(`${count} Inline-Scripts in Templates markiert`);
}

// Fix für CSS-Styles
vueFixDebug('Installiere CSS-Fixes...');
function injectCSS() {
  const styleId = 'vue-fix-styles';
  
  // Nur einfügen, wenn noch nicht vorhanden
  if (!document.getElementById(styleId)) {
    const styleElement = document.createElement('style');
    styleElement.id = styleId;
    styleElement.textContent = `
      /* Vue-Template-Container ausblenden */
      .vue-template-container {
        display: none !important;
      }
      
      /* Inline-Scripts und -Styles in Templates ausblenden */
      script[data-vue-template-fix], 
      style[data-vue-template-fix] {
        display: none !important;
      }
      
      /* Ladeanimation für Vue-Komponenten */
      .vue-loading {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem;
        flex-direction: column;
      }
      
      .vue-loading-spinner {
        border: 4px solid rgba(0, 158, 96, 0.3);
        border-radius: 50%;
        border-top: 4px solid var(--nscale-green, #009e60);
        width: 40px;
        height: 40px;
        animation: vue-spin 1s linear infinite;
        margin-bottom: 1rem;
      }
      
      @keyframes vue-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    
    document.head.appendChild(styleElement);
    vueFixDebug('CSS-Fixes injiziert');
  } else {
    vueFixDebug('CSS-Fixes bereits vorhanden, überspringe');
  }
}

// Container-Fix
vueFixDebug('Erstelle fehlende Container...');
function createContainers() {
  // Doc-Converter-Container
  if (!document.getElementById('doc-converter-container')) {
    const container = document.createElement('div');
    container.id = 'doc-converter-container';
    
    // Ladeanimation
    container.innerHTML = `
      <div class="vue-loading">
        <div class="vue-loading-spinner"></div>
        <p>Dokumentenkonverter wird geladen...</p>
        <div id="vue-loading-status" style="margin-top: 0.5rem; font-size: 0.8rem; color: #666;"></div>
      </div>
    `;
    
    if (document.querySelector('.admin-panel-content')) {
      document.querySelector('.admin-panel-content').appendChild(container);
      vueFixDebug('Doc-Converter-Container in Admin-Panel eingefügt');
    } else {
      document.body.appendChild(container);
      vueFixDebug('Doc-Converter-Container in Body eingefügt');
    }
  }
  
  // Feature-Toggle-Container
  if (!document.getElementById('feature-toggle-container')) {
    const container = document.createElement('div');
    container.id = 'feature-toggle-container';
    
    if (document.querySelector('[data-tab="features"]')) {
      document.querySelector('[data-tab="features"]').appendChild(container);
      vueFixDebug('Feature-Toggle-Container in Features-Tab eingefügt');
    }
  }
}

// Status-Update-Funktion
let statusCounter = 0;
function updateLoadingStatus(message) {
  const statusElement = document.getElementById('vue-loading-status');
  if (statusElement) {
    statusCounter++;
    statusElement.textContent = `${statusCounter}: ${message}`;
    vueFixDebug(`Status aktualisiert: ${message}`);
  }
}

// DOM-Beobachter für dynamische Änderungen
vueFixDebug('Installiere DOM-Beobachter...');
function setupDOMObserver() {
  const observer = new MutationObserver(function(mutations) {
    let shouldFixScripts = false;
    let shouldUpdateContainers = false;
    
    mutations.forEach(function(mutation) {
      if (mutation.type === 'childList' && mutation.addedNodes.length) {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) { // Element-Knoten
            if (node.tagName === 'SCRIPT') {
              shouldFixScripts = true;
            }
            
            if (node.classList && (
              node.classList.contains('admin-panel-content') ||
              node.getAttribute('data-tab') === 'features' ||
              node.getAttribute('data-tab') === 'docConverter'
            )) {
              shouldUpdateContainers = true;
            }
          }
        });
      }
    });
    
    if (shouldFixScripts) {
      fixInlineScripts();
    }
    
    if (shouldUpdateContainers) {
      createContainers();
    }
  });
  
  observer.observe(document.body, { 
    childList: true, 
    subtree: true 
  });
  
  vueFixDebug('DOM-Beobachter installiert');
}

// Fix für Vue-Komponenten
vueFixDebug('Installiere Vue-Komponenten-Fix...');
function fixVueComponents() {
  // Globale Funktion zum Debuggen
  window.debugVueComponents = function() {
    vueFixDebug('Manuelle Debug-Funktion aufgerufen');
    fixInlineScripts();
    createContainers();
    injectCSS();
    
    // Status der Vue-Komponenten prüfen
    const docConverterApp = document.getElementById('doc-converter-app');
    const components = {
      'doc-converter-app': docConverterApp,
      'feature-toggle-container': document.getElementById('feature-toggle-container'),
      'vue-app': document.getElementById('vue-app'),
      'doc-converter-container': document.getElementById('doc-converter-container')
    };
    
    vueFixDebug('Status der Vue-Komponenten:');
    Object.entries(components).forEach(([name, element]) => {
      vueFixDebug(`- ${name}: ${element ? 'Gefunden' : 'Nicht gefunden'}`);
    });
    
    return 'Debug-Informationen wurden in der Konsole ausgegeben';
  };
  
  // Ereignis auslösen, um Vue-Komponenten zu initialisieren
  window.dispatchEvent(new Event('vue-fix-ready'));
  vueFixDebug('Event "vue-fix-ready" ausgelöst');
}

// Nach DOM-Laden alles initialisieren
document.addEventListener('DOMContentLoaded', function() {
  vueFixDebug('DOM geladen, starte Fixes...');
  injectCSS();
  fixInlineScripts();
  createContainers();
  setupDOMObserver();
  fixVueComponents();
  
  // Status aktualisieren
  updateLoadingStatus('Grundlegende Fixes angewendet');
  
  // Nach kurzem Timeout nochmals aktualisieren, um dynamische Änderungen zu erfassen
  setTimeout(function() {
    fixInlineScripts();
    updateLoadingStatus('Fixes nach Timeout aktualisiert');
  }, 1000);
  
  vueFixDebug('Alle Fixes installiert');
});

// Mit Window-Load auch nochmal aktualisieren
window.addEventListener('load', function() {
  vueFixDebug('Fenster vollständig geladen, aktualisiere Fixes...');
  fixInlineScripts();
  updateLoadingStatus('Fixes nach Fensterladung aktualisiert');
});

vueFixDebug('Script vollständig geladen');