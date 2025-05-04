// src/standalone/chat-interface.js
import { createApp } from 'vue'
import { createPinia } from 'pinia'
// Direkter Import ohne Alias - verwende den exakten Pfad
import ChatView from '../views/ChatView.vue'

// Stelle sicher, dass Stores verfügbar sind
import { useSessionStore } from '../stores/sessionStore'
import { useChatStore } from '../stores/chatStore'
import { useMotdStore } from '../stores/motdStore'
import { useFeatureToggleStore } from '../stores/featureToggleStore'
import { useAuthStore } from '../stores/authStore'

// Weitere Komposables für die Anwendungsfunktionalität
import { useToast } from '../composables/useToast'

// Keine FontAwesome-Importe nötig - wir verwenden die bereits eingebundenen Icons aus dem Haupt-HTML

document.addEventListener('DOMContentLoaded', () => {
  // Finde den Einhängepunkt für die Chat-Komponente
  const mountElement = document.querySelector('.chat-container')
  
  if (mountElement) {
    console.log('Starte Vue.js Chat-Interface')
    
    // Bereite das Mount-Element vor
    mountElement.innerHTML = '<div id="vue-chat-app"></div>'
    
    const app = createApp(ChatView)
    
    // Pinia Store registrieren
    const pinia = createPinia()
    app.use(pinia)
    
    // Mock für FontAwesome-Komponente, falls nötig
    app.component('FontAwesomeIcon', {
      props: ['icon'],
      template: '<i :class="icon"></i>'
    })
    
    // App mounten
    app.mount('#vue-chat-app')
    
    console.log('Vue.js Chat-Interface wurde erfolgreich initialisiert')
  } else {
    console.warn('Kein Mounting-Element für Chat-Interface gefunden (.chat-container)')
  }
})