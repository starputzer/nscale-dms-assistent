// stores/featureToggleStore.js
import { defineStore } from 'pinia';

/**
 * Store zur Verwaltung der Feature-Toggles
 * Ermöglicht den Wechsel zwischen altem und neuem UI sowie das Aktivieren/Deaktivieren bestimmter Features
 */
export const useFeatureToggleStore = defineStore('featureToggle', {
  state: () => ({
    // Hauptschalter für die UI-Version (true = neue Vue.js-UI, false = alte UI)
    useNewUI: localStorage.getItem('useNewUI') === 'true' || false,
    
    // Einzelne Feature-Toggles für spezifische Komponenten
    // Diese erlauben eine granularere Steuerung während der Migration
    features: {
      // Dokumentenkonverter in Vue.js (erste migrierte Komponente)
      vueDocConverter: localStorage.getItem('feature_vueDocConverter') === 'true' || true,
      
      // Chat-Komponente in Vue.js (implementiert)
      vueChat: localStorage.getItem('feature_vueChat') === 'true' || false,
      
      // Admin-Panel in Vue.js (teilweise implementiert)
      vueAdmin: localStorage.getItem('feature_vueAdmin') === 'true' || false,
      
      // Einstellungskomponente in Vue.js (noch nicht implementiert)
      vueSettings: localStorage.getItem('feature_vueSettings') === 'true' || false,
      
      // Weitere Features...
    },
    
    // Entwicklungsmodus aktivieren (zeigt z.B. den Toggle-Schalter an)
    devMode: localStorage.getItem('devMode') === 'true' || false
  }),
  
  getters: {
    /**
     * Prüft, ob ein bestimmtes Feature aktiviert ist
     * @param {string} featureName - Name des Features
     * @returns {boolean} - true, wenn Feature aktiviert ist
     */
    isFeatureEnabled: (state) => (featureName) => {
      // Wenn neue UI global deaktiviert ist, ist kein Vue.js-Feature aktiv
      if (!state.useNewUI) return false;
      
      // Sonst prüfe den spezifischen Feature-Toggle
      return state.features[featureName] || false;
    },
    
    /**
     * Liste aller aktivierten Features
     */
    activeFeatures: (state) => {
      if (!state.useNewUI) return [];
      
      return Object.entries(state.features)
        .filter(([_, value]) => value)
        .map(([key]) => key);
    }
  },
  
  actions: {
    /**
     * Umschalten zwischen alter und neuer UI
     * @param {boolean} value - Neuer Wert (true = neue UI, false = alte UI)
     */
    toggleNewUI(value) {
      this.useNewUI = value;
      localStorage.setItem('useNewUI', value.toString());
      
      // Wenn wir zur alten UI wechseln, speichere aktuelle Feature-Einstellungen
      // damit sie beim Zurückwechseln wiederhergestellt werden können
      if (!value) {
        localStorage.setItem('featureSettings', JSON.stringify(this.features));
      } else {
        // Versuche gespeicherte Einstellungen wiederherzustellen
        try {
          const savedSettings = JSON.parse(localStorage.getItem('featureSettings'));
          if (savedSettings) {
            this.features = { ...this.features, ...savedSettings };
          }
        } catch (e) {
          console.error('Fehler beim Wiederherstellen der Feature-Einstellungen:', e);
        }
      }
      
      // Aktualisiere die Seite, um die Änderungen anzuwenden
      window.location.reload();
    },
    
    /**
     * Aktiviert oder deaktiviert ein bestimmtes Feature
     * @param {string} featureName - Name des Features
     * @param {boolean} value - Neuer Wert (true = aktiviert, false = deaktiviert)
     */
    toggleFeature(featureName, value) {
      if (this.features.hasOwnProperty(featureName)) {
        this.features[featureName] = value;
        localStorage.setItem(`feature_${featureName}`, value.toString());
      }
    },
    
    /**
     * Entwicklermodus umschalten
     * @param {boolean} value - Neuer Wert (true = aktiviert, false = deaktiviert)
     */
    toggleDevMode(value) {
      this.devMode = value;
      localStorage.setItem('devMode', value.toString());
    },
    
    /**
     * Alle Feature-Toggles aktivieren (für vollständigen Wechsel zu neuer UI)
     */
    enableAllFeatures() {
      Object.keys(this.features).forEach(key => {
        this.features[key] = true;
        localStorage.setItem(`feature_${key}`, 'true');
      });
    },
    
    /**
     * Alle Feature-Toggles deaktivieren (für vollständigen Wechsel zu alter UI)
     */
    disableAllFeatures() {
      Object.keys(this.features).forEach(key => {
        this.features[key] = false;
        localStorage.setItem(`feature_${key}`, 'false');
      });
    }
  }
});