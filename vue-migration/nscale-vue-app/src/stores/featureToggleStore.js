import { defineStore } from 'pinia'

export const useFeatureToggleStore = defineStore('featureToggle', {
  state: () => ({
    features: {
      vueDocConverter: localStorage.getItem('feature_vueDocConverter') === 'true' || false,
      vueAdmin: localStorage.getItem('feature_vueAdmin') === 'true' || false,
      vueSettings: localStorage.getItem('feature_vueSettings') === 'true' || false,
      vueChat: localStorage.getItem('feature_vueChat') === 'true' || false
    },
    isDevelopmentMode: false
  }),
  
  getters: {
    isDocConverterEnabled: (state) => state.features.vueDocConverter,
    isAdminEnabled: (state) => state.features.vueAdmin,
    isSettingsEnabled: (state) => state.features.vueSettings,
    isChatEnabled: (state) => state.features.vueChat
  },
  
  actions: {
    toggleFeature(featureName) {
      if (featureName in this.features) {
        this.features[featureName] = !this.features[featureName]
        localStorage.setItem(`feature_${featureName}`, this.features[featureName])
      }
    },
    
    enableFeature(featureName) {
      if (featureName in this.features) {
        this.features[featureName] = true
        localStorage.setItem(`feature_${featureName}`, 'true')
      }
    },
    
    disableFeature(featureName) {
      if (featureName in this.features) {
        this.features[featureName] = false
        localStorage.setItem(`feature_${featureName}`, 'false')
      }
    },
    
    // Alle Features aktivieren
    enableAllFeatures() {
      Object.keys(this.features).forEach(feature => {
        this.features[feature] = true
        localStorage.setItem(`feature_${feature}`, 'true')
      })
    },
    
    // Alle Features deaktivieren
    disableAllFeatures() {
      Object.keys(this.features).forEach(feature => {
        this.features[feature] = false
        localStorage.setItem(`feature_${feature}`, 'false')
      })
    },
    
    // Entwicklungsmodus erkennen
    detectDevelopmentMode() {
      // Prüfen, ob wir uns in einer Entwicklungsumgebung befinden
      this.isDevelopmentMode = import.meta.env.DEV || 
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1'
      
      // Im Entwicklungsmodus standardmäßig alle Features aktivieren
      if (this.isDevelopmentMode) {
        this.enableAllFeatures()
      }
    },
    
    // Initialisierung beim App-Start
    initFeatures() {
      // Entwicklungsmodus erkennen
      this.detectDevelopmentMode()
      
      // Feature-Status aus localStorage laden
      Object.keys(this.features).forEach(feature => {
        const savedValue = localStorage.getItem(`feature_${feature}`)
        if (savedValue !== null) {
          this.features[feature] = savedValue === 'true'
        }
      })
    }
  }
})