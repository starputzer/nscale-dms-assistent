// src/standalone/doc-converter-tab.js
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import DocConverterInitializer from '../components/doc-converter/DocConverterInitializer.vue'

// Stelle sicher, dass Stores verfügbar sind
import { useFeatureToggleStore } from '../stores/featureToggleStore'
import { useDocConverterStore } from '../stores/docConverterStore'

document.addEventListener('DOMContentLoaded', () => {
  // Warte auf den Admin-Tab-Wechsel und initialisiere dann
  const checkAdminTab = () => {
    const isAdmin = document.querySelector('.admin-panel-content') !== null
    const docConverterTab = document.querySelector('.admin-nav-item.active') !== null && 
                           (document.querySelector('#adminTab[value="docConverter"]') !== null || 
                            document.querySelector('[data-tab="docConverter"].active') !== null)
    
    // Container für Initializer suchen oder erstellen
    let mountElement = document.getElementById('doc-converter-initializer')
    
    // Wenn nicht gefunden, aber DocConverter-Tab aktiv ist, erstelle Container
    if (!mountElement && docConverterTab) {
      const docConverterContainer = document.getElementById('doc-converter-container')
      
      if (docConverterContainer) {
        mountElement = document.createElement('div')
        mountElement.id = 'doc-converter-initializer'
        
        // Container vor dem klassischen Inhalt einfügen
        docConverterContainer.parentNode.insertBefore(mountElement, docConverterContainer)
        
        console.log('DocConverter-Initializer Container erstellt')
      }
    }
    
    // Initialisiere, wenn Container gefunden und Tab aktiv
    if (mountElement && docConverterTab && !window.docConverterInitializerActive) {
      try {
        console.log('DocConverter-Initializer wird gestartet...')
        
        // Flag setzen, um doppelte Initialisierung zu vermeiden
        window.docConverterInitializerActive = true
        
        // App erstellen
        const app = createApp(DocConverterInitializer)
        
        // Pinia Store registrieren
        const pinia = createPinia()
        app.use(pinia)
        
        // App mounten
        app.mount('#doc-converter-initializer')
        
        console.log('DocConverter-Initializer erfolgreich gestartet')
      } catch (error) {
        console.error('Fehler bei der Initialisierung des DocConverter-Initializers:', error)
        
        // Flag zurücksetzen, um weiteren Versuch zu ermöglichen
        window.docConverterInitializerActive = false
        
        // Fallback - klassische Implementierung aktivieren
        if (typeof window.initializeClassicDocConverter === 'function') {
          console.warn('Aktiviere klassische DocConverter-Implementierung als Fallback')
          window.initializeClassicDocConverter()
        }
      }
    }
  }
  
  // Prüfe sofort
  checkAdminTab()
  
  // Und dann regelmäßig, um auf Tab-Wechsel zu reagieren
  setInterval(checkAdminTab, 1000)
  
  // Event-Listener für Tab-Buttons hinzufügen
  const adminNavItems = document.querySelectorAll('.admin-nav-item')
  if (adminNavItems.length > 0) {
    adminNavItems.forEach(item => {
      item.addEventListener('click', function() {
        // Verzögerung, um sicherzustellen, dass DOM aktualisiert wurde
        setTimeout(checkAdminTab, 100)
      })
    })
    
    console.log('DocConverter-Initializer: Tab-Change-Listener eingerichtet')
  }
})