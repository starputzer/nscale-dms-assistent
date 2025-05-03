// src/standalone/doc-converter.js
import { createApp } from 'vue'
import { createPinia } from 'pinia'
// Direkter Import ohne Alias - verwende den exakten Pfad
import DocConverterView from '../views/DocConverterView.vue'

// Stelle sicher, dass Stores verfügbar sind
import { useDocConverterStore } from '../stores/docConverterStore'
import { useAuthStore } from '../stores/authStore'
import { useFeatureToggleStore } from '../stores/featureToggleStore'

// Styles importieren
//import '@/assets/styles/main.css'

// Weitere Komposables für die Anwendungsfunktionalität
import { useToast } from '../composables/useToast'

// Keine FontAwesome-Importe nötig - wir verwenden die bereits eingebundenen Icons aus dem Haupt-HTML

document.addEventListener('DOMContentLoaded', () => {
  const mountElement = document.getElementById('doc-converter-app')
  if (mountElement) {
    const app = createApp(DocConverterView)
    
    // Pinia Store registrieren
    const pinia = createPinia()
    app.use(pinia)
    
    // Mock für FontAwesome-Komponente, falls nötig
    app.component('FontAwesomeIcon', {
      props: ['icon'],
      template: '<i :class="icon"></i>'
    })
    
    // App mounten
    app.mount('#doc-converter-app')
    
    console.log('DocConverter wurde erfolgreich initialisiert')
  } else {
    console.warn('Kein Mounting-Element für DocConverter gefunden (#doc-converter-app)')
  }
})