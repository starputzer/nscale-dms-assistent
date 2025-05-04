// src/standalone/feature-toggle.js
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import FeatureToggleManager from '../components/admin/features/FeatureToggleManager.vue'

// Stelle sicher, dass Stores verfügbar sind
import { useFeatureToggleStore } from '../stores/featureToggleStore'

document.addEventListener('DOMContentLoaded', () => {
  // Feature-Toggle-Container finden
  const mountElement = document.getElementById('feature-toggle-container')
  
  if (mountElement) {
    try {
      console.log('Feature-Toggle-Manager wird initialisiert...')
      
      // App erstellen
      const app = createApp(FeatureToggleManager)
      
      // Pinia Store registrieren
      const pinia = createPinia()
      app.use(pinia)
      
      // Feature-Toggle Store initialisieren
      const featureStore = useFeatureToggleStore()
      featureStore.initializeFeatures()
      
      // App mounten
      app.mount('#feature-toggle-container')
      
      console.log('Feature-Toggle-Manager erfolgreich initialisiert')
      
      // Globales Flag setzen
      window.vueFeatureToggleInitialized = true
    } catch (error) {
      console.error('Fehler bei der Initialisierung des Feature-Toggle-Managers:', error)
      
      // Fallback - einfaches HTML einfügen
      mountElement.innerHTML = `
        <div class="error-container p-4 border border-red-300 bg-red-50 rounded mt-4">
          <h3 class="text-red-700 font-medium mb-2">Fehler bei der Initialisierung</h3>
          <p class="text-red-600">Der Feature-Toggle-Manager konnte nicht initialisiert werden.</p>
          <p class="text-sm text-red-500 mt-2">Fehlermeldung: ${error.message}</p>
        </div>
        <div class="fallback-container mt-4">
          <p class="mb-4">Verwenden Sie die folgenden Links, um zwischen den UI-Versionen zu wechseln:</p>
          <div class="flex gap-4">
            <button class="nscale-btn-primary" onclick="localStorage.setItem('useNewUI', 'true'); window.location.reload();">
              Vue.js-UI aktivieren
            </button>
            <button class="nscale-btn-secondary" onclick="localStorage.setItem('useNewUI', 'false'); window.location.reload();">
              Klassische UI aktivieren
            </button>
          </div>
        </div>
      `
    }
  } else {
    console.warn('Kein Mounting-Element für Feature-Toggle-Manager gefunden (#feature-toggle-container)')
  }
})