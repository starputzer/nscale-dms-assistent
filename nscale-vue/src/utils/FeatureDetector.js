/**
 * FeatureDetector.js
 * Dieses Modul enthält Funktionen zur Erkennung von Browser-Features
 * und stellt Fallback-Mechanismen für die Vue-Migration bereit.
 */

/**
 * Prüft, ob ES6-Module unterstützt werden
 * @returns {boolean} true, wenn ES6-Module unterstützt werden
 */
export function supportsESModules() {
  try {
    new Function('import("")');
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Prüft, ob CSS-Variablen unterstützt werden
 * @returns {boolean} true, wenn CSS-Variablen unterstützt werden
 */
export function supportsCSSVariables() {
  return window.CSS && window.CSS.supports && window.CSS.supports('(--a: 0)');
}

/**
 * Prüft, ob die erforderlichen Browser-Features für Vue 3 verfügbar sind
 * @returns {boolean} true, wenn alle erforderlichen Features verfügbar sind
 */
export function canRunVue3() {
  // Minimale Anforderungen für Vue 3
  return (
    // ES2015 Features
    typeof Symbol !== 'undefined' &&
    typeof Promise !== 'undefined' &&
    typeof Set !== 'undefined' &&
    Array.from &&
    Object.assign &&
    supportsESModules()
  );
}

/**
 * Lädt ein Script dynamisch und gibt ein Promise zurück
 * @param {string} src - Script-URL
 * @param {object} options - Zusätzliche Optionen (type, async, defer)
 * @returns {Promise} Promise, das erfüllt wird, wenn das Script geladen wurde
 */
export function loadScript(src, options = {}) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    
    if (options.type) script.type = options.type;
    if (options.async) script.async = true;
    if (options.defer) script.defer = true;
    
    script.onload = () => resolve(script);
    script.onerror = (err) => reject(new Error(`Failed to load script: ${src}`));
    
    document.head.appendChild(script);
  });
}

/**
 * Lädt eine CSS-Datei dynamisch
 * @param {string} href - CSS-URL
 * @returns {Promise} Promise, das erfüllt wird, wenn die CSS-Datei geladen wurde
 */
export function loadCSS(href) {
  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    
    link.onload = () => resolve(link);
    link.onerror = () => reject(new Error(`Failed to load CSS: ${href}`));
    
    document.head.appendChild(link);
  });
}

/**
 * Initialisiert die Fallback-UI
 * @param {object} options - Optionen für die Fallback-Initialisierung
 * @returns {Promise} Promise, das erfüllt wird, wenn die Fallback-UI initialisiert wurde
 */
export async function initFallbackUI(options = {}) {
  const { hideSelector, showSelector, scripts = [] } = options;
  
  // Vue-Container ausblenden
  if (hideSelector) {
    const elements = document.querySelectorAll(hideSelector);
    elements.forEach(el => {
      el.style.display = 'none';
    });
  }
  
  // Klassische Container anzeigen
  if (showSelector) {
    const elements = document.querySelectorAll(showSelector);
    elements.forEach(el => {
      el.style.display = 'block';
    });
  }
  
  // Klassische Scripts laden
  for (const src of scripts) {
    try {
      await loadScript(src, { type: 'module' });
      console.log(`Script geladen: ${src}`);
    } catch (error) {
      console.error(`Fehler beim Laden von ${src}:`, error);
    }
  }
  
  return true;
}

/**
 * Installiert die Fallback-Mechanismen für die Vue-Migration
 * @param {number} timeout - Timeout in Millisekunden
 * @returns {Promise} Promise, das erfüllt wird, wenn die Fallback-Mechanismen installiert wurden
 */
export function installFeatureFallbacks(timeout = 5000) {
  // Globaler Fehlerhandler für Vue
  window.addEventListener('error', (event) => {
    if (event.error && event.error.message?.includes('Vue')) {
      console.error('Vue-Fehler erkannt, Fallback wird geladen');
      initFallbackUI({
        hideSelector: '[data-vue-container]',
        showSelector: '[data-classic-container]',
        scripts: [
          '/static/js/app.js',
          '/static/js/chat.js',
          '/static/js/admin.js'
        ]
      });
    }
  });
  
  // Fallback-Timer installieren
  return new Promise((resolve) => {
    window.vueInitTimeout = setTimeout(() => {
      if (!window.vueInitialized) {
        console.warn('Vue wurde nicht innerhalb des Timeouts initialisiert, Fallback wird geladen');
        initFallbackUI({
          hideSelector: '[data-vue-container]',
          showSelector: '[data-classic-container]',
          scripts: [
            '/static/js/app.js',
            '/static/js/chat.js',
            '/static/js/admin.js'
          ]
        }).then(resolve);
      } else {
        resolve(true);
      }
    }, timeout);
  });
}