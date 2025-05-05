import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { installFeatureFallbacks } from './utils/FeatureDetector';

// CSS-Imports (exakt dieselbe Reihenfolge wie im Original-HTML)
import './assets/css/variables.css';

// Wir importieren hier keine externen CSS-Dateien, da diese bereits in der HTML-Datei eingebunden sind
// Dies geschieht, um eine doppelte CSS-Anwendung zu vermeiden und exakte visuelle Übereinstimmung zu gewährleisten

// Feature-Fallbacks installieren
installFeatureFallbacks(5000);

// Pinia Store für globalen Zustand
const pinia = createPinia();

// Vue-App erstellen
const app = createApp(App);

// Plugins registrieren
app.use(pinia);

// App initialisieren
document.addEventListener('DOMContentLoaded', () => {
  // Prüfe, ob #vue-app existiert
  const appContainer = document.getElementById('vue-app');
  if (appContainer) {
    // Vue in #vue-app mounten
    app.mount('#vue-app');
    
    // Globale Variable setzen, damit das Fallback-System weiß, dass Vue initialisiert wurde
    window.vueInitialized = true;
    
    // Eventuellen Fallback-Timeout löschen
    if (window.vueInitTimeout) {
      clearTimeout(window.vueInitTimeout);
    }
    
    console.log('Vue-App erfolgreich gestartet');
  } else {
    console.warn('Container #vue-app nicht gefunden, App wird nicht initialisiert');
  }
});

// Globaler Fehlerhandler für unbehandelte Fehler
app.config.errorHandler = (err, instance, info) => {
  console.error('Vue-Fehler aufgetreten:', err);
  console.error('Komponenteninstanz:', instance);
  console.error('Info:', info);
  
  // Klassisches UI als Fallback laden
  console.warn('Lade klassisches UI als Fallback aufgrund eines Fehlers...');
  
  // Vue-Container ausblenden
  const vueContainers = document.querySelectorAll('[data-vue-container]');
  vueContainers.forEach(el => {
    el.style.display = 'none';
  });
  
  // Klassische Container anzeigen
  const classicContainers = document.querySelectorAll('[data-classic-container]');
  classicContainers.forEach(el => {
    el.style.display = 'block';
  });
  
  // Klassische Scripts laden
  const scripts = [
    '/static/js/app.js',
    '/static/js/chat.js',
    '/static/js/admin.js'
  ];
  
  scripts.forEach(src => {
    const script = document.createElement('script');
    script.src = src;
    script.type = 'module';
    document.head.appendChild(script);
  });
};