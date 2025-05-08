/**
 * Haupteinstiegspunkt für die nscale DMS Assistent Anwendung
 * 
 * Diese Datei initialisiert sowohl die Legacy-Anwendung als auch die neuen
 * Vue 3 SFC-Komponenten in einem hybriden Ansatz.
 */

// CSS wird über link-Tags in der index.html eingebunden
// Keine direkten CSS-Importe hier, um MIME-Typ-Fehler zu vermeiden

// Vue 3 Importe
import { createApp } from 'vue';
import { createPinia } from 'pinia';

// Importiere Legacy-Code
import './js/app.js';

// Funktionen zur kontrollierten Vue-Integration
function initializeVueComponents() {
  // Prüfe, ob Feature-Flags für Vue-Integration aktiviert sind
  const useVueComponents = localStorage.getItem('useVueComponents') === 'true';

  // Initialisiere Vue-Komponenten nur, wenn sie aktiviert sind
  if (useVueComponents) {
    // Logge Start der Vue-Initialisierung
    console.log('Initialisiere Vue 3 SFC-Komponenten...');

    try {
      // Lazy-load der Vue-Komponenten, um Probleme bei der Initialisierung zu vermeiden
      import('./vue/app').then(({ default: App }) => {
        const app = createApp(App);
        const pinia = createPinia();
        
        app.use(pinia);
        
        // Globale Fehlerbehandlung
        app.config.errorHandler = (err, vm, info) => {
          console.error('Vue Error:', err);
          console.log('Component:', vm);
          console.log('Error Info:', info);
        };
        
        // Mount Vue-Anwendung auf dediziertes Element, wenn vorhanden
        const appElement = document.getElementById('vue-app');
        if (appElement) {
          app.mount('#vue-app');
          console.log('Vue 3 App erfolgreich initialisiert');
        } else {
          console.warn('Vue-App konnte nicht initialisiert werden: #vue-app Element nicht gefunden');
        }
      }).catch(error => {
        console.error('Fehler beim Laden der Vue-App:', error);
      });
      
    } catch (error) {
      console.error('Fehler bei der Vue-Initialisierung:', error);
    }
  }
  
  // Initialisierung des Dokumentenkonverters, wenn vorhanden
  initDocConverter();
}

// Spezifische Initialisierung für den Dokumentenkonverter
function initDocConverter() {
  // Prüfe, ob Feature-Flag für Dokumentenkonverter aktiviert ist
  const useVueDocConverter = localStorage.getItem('useVueDocConverter') === 'true';
  
  // Prüfe, ob wir auf der Dokumentenkonverter-Seite sind
  const isDocConverterPage = document.getElementById('doc-converter-mount');

  if (useVueDocConverter && isDocConverterPage) {
    try {
      import('./vue/doc-converter-app').then(({ default: DocConverterApp }) => {
        const app = createApp(DocConverterApp);
        const pinia = createPinia();
        
        app.use(pinia);
        
        app.mount('#doc-converter-mount');
        console.log('Dokumentenkonverter-App erfolgreich initialisiert');
      }).catch(error => {
        console.error('Fehler beim Laden des Dokumentenkonverters:', error);
        // Fallback zur Legacy-Version aktivieren
        document.getElementById('legacy-doc-converter')?.classList.remove('hidden');
      });
    } catch (error) {
      console.error('Fehler bei der Dokumentenkonverter-Initialisierung:', error);
      // Fallback zur Legacy-Version aktivieren
      document.getElementById('legacy-doc-converter')?.classList.remove('hidden');
    }
  }
}

// Warte auf DOM-Laden und initialisiere
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM geladen, initialisiere Anwendung...');
  initializeVueComponents();
});

// Exportiere wichtige Funktionen für Legacy-Code
window.initializeVueComponents = initializeVueComponents;
window.initDocConverter = initDocConverter;