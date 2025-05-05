// featureToggleStore.js
import { defineStore } from 'pinia';

/**
 * Feature-Toggle Store für die schrittweise Migration zu Vue.js
 * Ermöglicht das Ein- und Ausschalten verschiedener Vue-Komponenten
 */
export const useFeatureToggleStore = defineStore('featureToggle', {
  state: () => ({
    features: {
      vueHeader: localStorage.getItem('feature_vueHeader') !== 'false',
      vueChat: localStorage.getItem('feature_vueChat') !== 'false',
      vueAdmin: localStorage.getItem('feature_vueAdmin') !== 'false',
      vueSettings: localStorage.getItem('feature_vueSettings') !== 'false',
      vueDocConverter: localStorage.getItem('feature_vueDocConverter') !== 'false'
    }
  }),
  
  actions: {
    /**
     * Feature-Toggle umschalten
     * @param {string} feature - Name des Features
     * @param {boolean} [value] - Optionaler Wert (wenn nicht angegeben, wird der aktuelle Wert umgekehrt)
     */
    toggleFeature(feature, value) {
      if (this.features.hasOwnProperty(feature)) {
        const newValue = value !== undefined ? value : !this.features[feature];
        this.features[feature] = newValue;
        localStorage.setItem(`feature_${feature}`, newValue);
      }
    },
    
    /**
     * Prüft, ob ein Feature aktiviert ist
     * @param {string} feature - Name des Features
     * @returns {boolean} - true, wenn das Feature aktiviert ist
     */
    isEnabled(feature) {
      return this.features[feature] === true;
    },
    
    /**
     * Initialisiert Feature-Toggles mit Standardwerten
     */
    initializeFeatureToggles() {
      const features = [
        'feature_vueHeader',
        'feature_vueChat',
        'feature_vueAdmin',
        'feature_vueSettings',
        'feature_vueDocConverter'
      ];
      
      features.forEach(feature => {
        if (localStorage.getItem(feature) === null) {
          localStorage.setItem(feature, 'false');
        }
      });
    }
  }
});