/**
 * main.js
 * Haupteinstiegspunkt für die nscale DMS Assistent Anwendung
 */
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { setupBridge } from './migration/bridge';
import { useFeatureTogglesStore } from './stores/featureToggles';

// Legacy-Import für Abwärtskompatibilität
import './js/app.js';

// Anwendung erstellen
const app = createApp(App);
const pinia = createPinia();

// Pinia-Stores registrieren
app.use(pinia);

// Feature-Toggles abrufen
const featureToggles = useFeatureTogglesStore(pinia);

// Legacy-Brücke initialisieren, wenn Feature-Toggles aktiviert sind
if (featureToggles.isUsingFullSfcUI) {
  // Wenn alle neuen Komponenten verwendet werden, keine Legacy-Bridge nötig
  console.log("Alle SFC-Komponenten aktiv, Legacy-Bridge wird nicht benötigt.");
} else {
  // Andernfalls Die Bridge aktivieren, um zwischen altem und neuem Code zu vermitteln
  app.provide('bridge', setupBridge());
  console.log("Legacy-Bridge aktiviert für schrittweise Migration.");
}

// Entwicklungsmodus-Anpassungen
if (import.meta.env.DEV) {
  console.log("Development-Modus aktiv");
  
  // Dev-Tools aktivieren
  if (featureToggles.isDebugMode) {
    // Debug-Hilfsfunktionen global verfügbar machen
    window.$pinia = pinia;
    window.$toggleFeature = featureToggles.toggleFeature;
    window.$resetFeatures = featureToggles.resetToDefaults;
    
    // UI-Debug-Hilfe
    if (featureToggles.showComponentBorders) {
      document.documentElement.classList.add('debug-components');
    }
  }
}

// Vue-App mounten
app.mount('#app');

// Bestätigung in der Konsole ausgeben
console.log('nscale DMS Assistent wurde erfolgreich initialisiert.');
console.log(`Build: ${import.meta.env.VITE_APP_VERSION || 'Dev'}`);
console.log(`Modus: ${import.meta.env.MODE}`);

// Anwendungsstatus in der Konsole anzeigen
if (featureToggles.isDebugMode) {
  console.log("Aktive Features:", Object.entries(featureToggles.$state)
    .filter(([_, value]) => value === true)
    .map(([key]) => key)
  );
}